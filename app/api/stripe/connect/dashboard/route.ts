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

// POST /api/stripe/connect/dashboard - Créer un login link pour accéder au dashboard Express
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

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

        const { data: club } = await supabaseAdmin
            .from("clubs")
            .select("stripe_account_id")
            .eq("id", adminEntry.club_id)
            .single();

        if (!club?.stripe_account_id) {
            return NextResponse.json({ error: "Compte Stripe non configuré" }, { status: 400 });
        }

        // Créer un login link pour le dashboard Express
        const loginLink = await stripe.accounts.createLoginLink(club.stripe_account_id);

        return NextResponse.json({ url: loginLink.url });

    } catch (error: any) {
        logger.error("Erreur création login link Stripe", { error });
        return NextResponse.json({
            error: "Erreur serveur",
            details: error?.message || "Unknown error",
        }, { status: 500 });
    }
}
