import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { logger } from "@/lib/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-10-29.clover",
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
    ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
    })
    : null;

// POST /api/stripe/connect - Créer un compte connecté Stripe et générer le lien d'onboarding
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        // Vérification des variables d'environnement critiques
        if (!process.env.STRIPE_SECRET_KEY) {
            return NextResponse.json({ error: "Config serveur: STRIPE_SECRET_KEY manquante" }, { status: 500 });
        }
        if (!process.env.NEXT_PUBLIC_SITE_URL) {
            return NextResponse.json({ error: "Config serveur: NEXT_PUBLIC_SITE_URL manquante" }, { status: 500 });
        }

        // Vérifier que l'utilisateur est admin d'un club via la table club_admins
        if (!supabaseAdmin) {
            return NextResponse.json({ error: "Configuration serveur manquante (Supabase Admin)" }, { status: 500 });
        }

        const { data: adminEntry } = await supabaseAdmin
            .from("club_admins")
            .select("club_id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (!adminEntry?.club_id) {
            return NextResponse.json({ error: "Vous devez être administrateur d'un club" }, { status: 403 });
        }

        // Récupérer le club
        const { data: club } = await supabaseAdmin
            .from("clubs")
            .select("id, name, stripe_account_id")
            .eq("id", adminEntry.club_id)
            .single();

        if (!club) {
            return NextResponse.json({ error: "Club introuvable" }, { status: 404 });
        }

        let stripeAccountId = club.stripe_account_id;
        const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test");

        // FORCE RESET pour le mode Test : si on est en test mode, on ignore l'ID existant
        // pour repartir sur un compte tout neuf qui affichera obligatoirement les boutons de test.
        if (isTestMode && stripeAccountId) {
            logger.info("Mode Test détecté : Forçage d'une nouvelle création de compte pour garantir les boutons de test.");
            await supabaseAdmin.from("clubs").update({ stripe_account_id: null }).eq("id", club.id);
            stripeAccountId = null;
        }

        // Vérifier si l'environnement correspond (Live vs Test) - Pour le mode Live
        if (!isTestMode && stripeAccountId) {
            try {
                const account = (await stripe.accounts.retrieve(stripeAccountId)) as any;
                const environmentMismatch = account.livemode !== true; // On attendait du Live
                
                if (environmentMismatch) {
                    logger.warn("Compte Test trouvé en mode Live. Réinitialisation...", { stripeAccountId });
                    await supabaseAdmin.from("clubs").update({ stripe_account_id: null }).eq("id", club.id);
                    stripeAccountId = null;
                }
            } catch (err) {
                stripeAccountId = null;
            }
        }

        // Si le club n'a pas encore de compte Stripe, en créer un
        if (!stripeAccountId) {
            const account = await stripe.accounts.create({
                type: "express",
                country: "FR",
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                business_type: "company",
                metadata: {
                    club_id: club.id,
                    club_name: club.name,
                },
            });

            stripeAccountId = account.id;

            // Sauvegarder l'ID dans la base de données
            const { error: updateError } = await supabaseAdmin
                .from("clubs")
                .update({ stripe_account_id: stripeAccountId })
                .eq("id", club.id);

            if (updateError) {
                logger.error("Erreur sauvegarde stripe_account_id", { error: updateError });
                return NextResponse.json({ error: "Erreur lors de la sauvegarde de l'ID Stripe", details: updateError.message }, { status: 500 });
            }
        }

        // Créer le lien d'onboarding
        try {
            const accountLink = await stripe.accountLinks.create({
                account: stripeAccountId,
                refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/stripe/connect/refresh`,
                return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/stripe/connect/return`,
                type: "account_onboarding",
            });

            return NextResponse.json({ url: accountLink.url });
        } catch (linkError: any) {
            // RECOVERY : Si l'ID est invalide (compte supprimé chez Stripe ou mauvais environnement)
            if (linkError.message?.includes("not connected to your platform") || linkError.message?.includes("does not exist")) {
                logger.warn("ID Stripe invalide détecté, recréation du compte...", { stripeAccountId, clubId: club.id });

                // 1. Supprimer l'ID invalide
                await supabaseAdmin.from("clubs").update({ stripe_account_id: null }).eq("id", club.id);

                // 2. Créer un nouveau compte
                const newAccount = await stripe.accounts.create({
                    type: "express",
                    country: "FR",
                    capabilities: {
                        card_payments: { requested: true },
                        transfers: { requested: true },
                    },
                    business_type: "company",
                    metadata: { club_id: club.id, club_name: club.name },
                });

                // 3. Sauvegarder et générer le lien
                await supabaseAdmin.from("clubs").update({ stripe_account_id: newAccount.id }).eq("id", club.id);
                
                const newLink = await stripe.accountLinks.create({
                    account: newAccount.id,
                    refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/stripe/connect/refresh`,
                    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/stripe/connect/return`,
                    type: "account_onboarding",
                });

                return NextResponse.json({ url: newLink.url });
            }
            throw linkError;
        }

    } catch (error: any) {
        logger.error("Erreur critique suite clic Connect Stripe", { 
            message: error?.message,
            code: error?.code,
            type: error?.type,
            stack: error?.stack
        });

        return NextResponse.json({
            error: "Erreur lors de l'initialisation Stripe Connect",
            details: error?.message || "Erreur inconnue",
            code: error?.code,
            type: error?.type
        }, { status: 500 });
    }
}

// GET /api/stripe/connect - Récupérer le statut du compte Stripe du club
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        // Récupérer le club de l'utilisateur via club_admins
        if (!supabaseAdmin) {
            return NextResponse.json({ error: "Configuration serveur manquante" }, { status: 500 });
        }

        const { data: adminEntry } = await supabaseAdmin
            .from("club_admins")
            .select("club_id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (!adminEntry?.club_id) {
            return NextResponse.json({ connected: false, reason: "no_club" });
        }

        const { data: club } = await supabaseAdmin
            .from("clubs")
            .select("stripe_account_id")
            .eq("id", adminEntry.club_id)
            .single();

        if (!club?.stripe_account_id) {
            return NextResponse.json({ connected: false, reason: "not_setup" });
        }

        // Vérifier le statut du compte chez Stripe
        try {
            const account = (await stripe.accounts.retrieve(club.stripe_account_id)) as any;
            const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test");

            // Vérification de l'environnement en GET aussi
            if (account.livemode !== !isTestMode) {
                logger.warn("Mismatch environnement en GET, nettoyage...", { stripeAccountId: club.stripe_account_id });
                await supabaseAdmin.from("clubs").update({ stripe_account_id: null }).eq("id", adminEntry.club_id);
                return NextResponse.json({ connected: false, reason: "env_mismatch_cleared" });
            }

            return NextResponse.json({
                connected: true,
                details_submitted: account.details_submitted,
                charges_enabled: account.charges_enabled,
                payouts_enabled: account.payouts_enabled,
            });
        } catch (retrieveError: any) {
            if (retrieveError.message?.includes("does not exist") || retrieveError.message?.includes("not connected")) {
                logger.warn("ID Stripe invalide trouvé en GET, nettoyage DB...", { stripeAccountId: club.stripe_account_id });
                await supabaseAdmin.from("clubs").update({ stripe_account_id: null }).eq("id", adminEntry.club_id);
                return NextResponse.json({ connected: false, reason: "invalid_id_cleared" });
            }
            throw retrieveError;
        }

    } catch (error) {
        logger.error("Erreur get Stripe Connect", { error });
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
