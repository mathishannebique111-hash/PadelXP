import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { logger } from "@/lib/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-10-29.clover",
});

// GET /api/stripe/connect/return - Route de retour après onboarding Stripe
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL));
        }

        // Récupérer le club de l'utilisateur
        const { data: profile } = await supabase
            .from("profiles")
            .select("club_id")
            .eq("id", user.id)
            .single();

        if (!profile?.club_id) {
            return NextResponse.redirect(new URL("/dashboard/facturation?stripe=error", process.env.NEXT_PUBLIC_SITE_URL));
        }

        const { data: club } = await supabase
            .from("clubs")
            .select("stripe_account_id")
            .eq("id", profile.club_id)
            .single();

        if (!club?.stripe_account_id) {
            return NextResponse.redirect(new URL("/dashboard/facturation?stripe=error", process.env.NEXT_PUBLIC_SITE_URL));
        }

        // Vérifier le statut du compte chez Stripe
        const account = await stripe.accounts.retrieve(club.stripe_account_id);

        if (account.details_submitted) {
            // Onboarding terminé avec succès
            logger.info("Stripe Connect onboarding completed", { clubId: profile.club_id, accountId: club.stripe_account_id });
            return NextResponse.redirect(new URL("/dashboard/facturation?stripe=success", process.env.NEXT_PUBLIC_SITE_URL));
        } else {
            // Onboarding non terminé
            return NextResponse.redirect(new URL("/dashboard/facturation?stripe=incomplete", process.env.NEXT_PUBLIC_SITE_URL));
        }

    } catch (error) {
        logger.error("Erreur retour Stripe Connect", { error });
        return NextResponse.redirect(new URL("/dashboard/facturation?stripe=error", process.env.NEXT_PUBLIC_SITE_URL));
    }
}
