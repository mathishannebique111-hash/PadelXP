import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { logger } from "@/lib/logger";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
    ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
    })
    : null;

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion }) : null;

export async function DELETE(request: Request) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: "Configuration serveur incorrecte" }, { status: 500 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        // Vérifier que l'utilisateur est un admin de club
        const { data: adminEntry } = await supabaseAdmin
            .from("club_admins")
            .select("club_id, role")
            .eq("user_id", user.id)
            .maybeSingle();

        if (!adminEntry || adminEntry.role !== "owner") {
            return NextResponse.json(
                { error: "Seul le propriétaire du club peut supprimer le compte" },
                { status: 403 }
            );
        }

        const clubId = adminEntry.club_id;

        logger.info("[delete-club] Starting club deletion", { userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…" });

        // 1. Annuler l'abonnement Stripe si existant
        const { data: club } = await supabaseAdmin
            .from("clubs")
            .select("stripe_subscription_id, stripe_customer_id")
            .eq("id", clubId)
            .maybeSingle();

        if (stripe && club?.stripe_subscription_id) {
            try {
                await stripe.subscriptions.cancel(club.stripe_subscription_id);
                logger.info("[delete-club] Stripe subscription cancelled", { clubId: clubId.substring(0, 8) + "…", subscriptionId: club.stripe_subscription_id.substring(0, 8) + "…" });
            } catch (stripeError: any) {
                logger.warn("[delete-club] Failed to cancel Stripe subscription", { clubId: clubId.substring(0, 8) + "…", error: stripeError.message });
            }
        }

        // 2. Supprimer les données liées au club
        // Note: L'ordre est important pour respecter les contraintes de clé étrangère

        // Supprimer les matchs
        const { error: matchesError } = await supabaseAdmin
            .from("matches")
            .delete()
            .eq("club_id", clubId);
        if (matchesError) {
            logger.warn("[delete-club] Error deleting matches", { clubId: clubId.substring(0, 8) + "…", error: matchesError });
        }

        // Supprimer les challenges
        const { error: challengesError } = await supabaseAdmin
            .from("challenges")
            .delete()
            .eq("club_id", clubId);
        if (challengesError) {
            logger.warn("[delete-club] Error deleting challenges", { clubId: clubId.substring(0, 8) + "…", error: challengesError });
        }

        // Supprimer les tournois
        const { error: tournamentsError } = await supabaseAdmin
            .from("tournaments")
            .delete()
            .eq("club_id", clubId);
        if (tournamentsError) {
            logger.warn("[delete-club] Error deleting tournaments", { clubId: clubId.substring(0, 8) + "…", error: tournamentsError });
        }

        // Supprimer les profils des membres
        const { error: profilesError } = await supabaseAdmin
            .from("profiles")
            .delete()
            .eq("club_id", clubId);
        if (profilesError) {
            logger.warn("[delete-club] Error deleting profiles", { clubId: clubId.substring(0, 8) + "…", error: profilesError });
        }

        // Supprimer les admins du club
        const { error: adminsError } = await supabaseAdmin
            .from("club_admins")
            .delete()
            .eq("club_id", clubId);
        if (adminsError) {
            logger.warn("[delete-club] Error deleting club_admins", { clubId: clubId.substring(0, 8) + "…", error: adminsError });
        }

        // Supprimer les propositions de match
        const { error: proposalsError } = await supabaseAdmin
            .from("match_proposals")
            .delete()
            .eq("club_id", clubId);
        if (proposalsError) {
            logger.warn({ clubId: clubId.substring(0, 8) + "…", error: proposalsError }, "[delete-club] Error deleting match_proposals");
        }

        // Supprimer les imports de membres
        const { error: importsError } = await supabaseAdmin
            .from("club_member_imports")
            .delete()
            .eq("club_id", clubId);
        if (importsError) {
            logger.warn({ clubId: clubId.substring(0, 8) + "…", error: importsError }, "[delete-club] Error deleting club_member_imports");
        }

        // Supprimer les abonnements
        const { error: subscriptionsError } = await supabaseAdmin
            .from("subscriptions")
            .delete()
            .eq("club_id", clubId);
        if (subscriptionsError) {
            logger.warn("[delete-club] Error deleting subscriptions", { clubId: clubId.substring(0, 8) + "…", error: subscriptionsError });
        }

        // Supprimer le club
        const { error: clubError } = await supabaseAdmin
            .from("clubs")
            .delete()
            .eq("id", clubId);
        if (clubError) {
            logger.error("[delete-club] Error deleting club", { clubId: clubId.substring(0, 8) + "…", error: clubError });
            return NextResponse.json({ error: "Erreur lors de la suppression du club" }, { status: 500 });
        }

        // 3. Supprimer l'utilisateur auth
        try {
            await supabaseAdmin.auth.admin.deleteUser(user.id);
            logger.info("[delete-club] User deleted from auth", { userId: user.id.substring(0, 8) + "…" });
        } catch (authError: any) {
            logger.warn("[delete-club] Failed to delete auth user", { userId: user.id.substring(0, 8) + "…", error: authError.message });
        }

        logger.info("[delete-club] Club deletion completed", { userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…" });

        return NextResponse.json({ success: true, message: "Club supprimé avec succès" });
    } catch (error: any) {
        logger.error("[delete-club] Unexpected error", { error: error.message });
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
