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

// GET /api/stripe/connect/refresh - Régénérer un lien d'onboarding si expiré
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL));
        }

        // Récupérer le club de l'utilisateur via club_admins avec service role
        if (!supabaseAdmin) {
            return NextResponse.redirect(new URL("/dashboard/facturation?stripe=error", process.env.NEXT_PUBLIC_SITE_URL));
        }

        const { data: adminEntry } = await supabaseAdmin
            .from("club_admins")
            .select("club_id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (!adminEntry?.club_id) {
            return NextResponse.redirect(new URL("/dashboard/facturation?stripe=error", process.env.NEXT_PUBLIC_SITE_URL));
        }

        const { data: club } = await supabaseAdmin
            .from("clubs")
            .select("stripe_account_id")
            .eq("id", adminEntry.club_id)
            .single();

        if (!club?.stripe_account_id) {
            return NextResponse.redirect(new URL("/dashboard/facturation?stripe=error", process.env.NEXT_PUBLIC_SITE_URL));
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
        return NextResponse.redirect(new URL("/dashboard/facturation?stripe=error", process.env.NEXT_PUBLIC_SITE_URL));
    }
}
