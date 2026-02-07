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

        // Vérifier que l'utilisateur est admin d'un club via la table club_admins
        if (!supabaseAdmin) {
            return NextResponse.json({ error: "Configuration serveur manquante" }, { status: 500 });
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
                return NextResponse.json({ error: "Erreur lors de la sauvegarde" }, { status: 500 });
            }
        }

        // Créer le lien d'onboarding
        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/stripe/connect/refresh`,
            return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/stripe/connect/return`,
            type: "account_onboarding",
        });

        return NextResponse.json({ url: accountLink.url });

    } catch (error: any) {
        console.error("=== ERREUR STRIPE CONNECT ===");
        console.error("Type:", error?.type);
        console.error("Code:", error?.code);
        console.error("Message:", error?.message);
        console.error("Raw:", error?.raw);
        console.error("Full error:", JSON.stringify(error, null, 2));
        logger.error("Erreur post Stripe Connect", { error });
        return NextResponse.json({
            error: "Erreur serveur",
            details: error?.message || "Unknown error",
            code: error?.code
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
        const account = await stripe.accounts.retrieve(club.stripe_account_id);

        return NextResponse.json({
            connected: true,
            details_submitted: account.details_submitted,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
        });

    } catch (error) {
        logger.error("Erreur get Stripe Connect", { error });
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
