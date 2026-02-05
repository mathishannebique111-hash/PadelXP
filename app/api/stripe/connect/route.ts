import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Stripe from "stripe";
import { logger } from "@/lib/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-10-29.clover",
});

// POST /api/stripe/connect - Créer un compte connecté Stripe et générer le lien d'onboarding
export async function POST(request: NextRequest) {
    try {
        const supabase = createRouteHandlerClient({ cookies });
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        // Vérifier que l'utilisateur est admin d'un club
        const { data: profile } = await supabase
            .from("profiles")
            .select("club_id, role")
            .eq("id", user.id)
            .single();

        if (!profile?.club_id || profile.role !== 'admin') {
            return NextResponse.json({ error: "Vous devez être administrateur d'un club" }, { status: 403 });
        }

        // Récupérer le club
        const { data: club, error: clubError } = await supabase
            .from("clubs")
            .select("id, name, stripe_account_id")
            .eq("id", profile.club_id)
            .single();

        if (clubError || !club) {
            return NextResponse.json({ error: "Club introuvable" }, { status: 404 });
        }

        let stripeAccountId = club.stripe_account_id;

        // Si le club n'a pas encore de compte Stripe, en créer un
        if (!stripeAccountId) {
            const account = await stripe.accounts.create({
                type: "express", // Express = onboarding simplifié
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
            const { error: updateError } = await supabase
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

    } catch (error) {
        logger.error("Erreur création compte Stripe Connect", { error });
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

// GET /api/stripe/connect - Récupérer le statut du compte Stripe du club
export async function GET(request: NextRequest) {
    try {
        const supabase = createRouteHandlerClient({ cookies });
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        // Récupérer le club de l'utilisateur
        const { data: profile } = await supabase
            .from("profiles")
            .select("club_id, role")
            .eq("id", user.id)
            .single();

        if (!profile?.club_id) {
            return NextResponse.json({ connected: false, reason: "no_club" });
        }

        const { data: club } = await supabase
            .from("clubs")
            .select("stripe_account_id")
            .eq("id", profile.club_id)
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
        logger.error("Erreur récupération statut Stripe Connect", { error });
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
