import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Stripe from "stripe";
import { logger } from "@/lib/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-10-29.clover",
});

// GET /api/stripe/connect/refresh - Régénérer un lien d'onboarding si expiré
export async function GET(request: NextRequest) {
    try {
        const supabase = createRouteHandlerClient({ cookies });
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL));
        }

        // Récupérer le club de l'utilisateur
        const { data: profile } = await supabase
            .from("profiles")
            .select("club_id, role")
            .eq("id", user.id)
            .single();

        if (!profile?.club_id || profile.role !== 'admin') {
            return NextResponse.redirect(new URL("/club?stripe=error", process.env.NEXT_PUBLIC_SITE_URL));
        }

        const { data: club } = await supabase
            .from("clubs")
            .select("stripe_account_id")
            .eq("id", profile.club_id)
            .single();

        if (!club?.stripe_account_id) {
            return NextResponse.redirect(new URL("/club?stripe=error", process.env.NEXT_PUBLIC_SITE_URL));
        }

        // Créer un nouveau lien d'onboarding
        const accountLink = await stripe.accountLinks.create({
            account: club.stripe_account_id,
            refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/stripe/connect/refresh`,
            return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/stripe/connect/return`,
            type: "account_onboarding",
        });

        return NextResponse.redirect(accountLink.url);

    } catch (error) {
        logger.error("Erreur refresh Stripe Connect", { error });
        return NextResponse.redirect(new URL("/club?stripe=error", process.env.NEXT_PUBLIC_SITE_URL));
    }
}
