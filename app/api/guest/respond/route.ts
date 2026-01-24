import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { guestId, matchId, confirmed } = body;

        logger.info("[guest/respond] Guest responding to match", { guestId, matchId, confirmed });

        if (!guestId || !matchId || confirmed === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Vérifier que le guest participe bien au match
        const { data: participation, error: partError } = await supabaseAdmin
            .from("match_participants")
            .select("id")
            .eq("match_id", matchId)
            .eq("guest_player_id", guestId)
            .single();

        if (partError || !participation) {
            logger.error("[guest/respond] Guest not found in match participants", { error: partError });
            return NextResponse.json({ error: "Ce joueur ne participe pas à ce match" }, { status: 403 });
        }

        // 2. Vérifier si le match est déjà traité (validé ou rejeté)
        const { data: match, error: matchError } = await supabaseAdmin
            .from("matches")
            .select("status")
            .eq("id", matchId)
            .single();

        if (matchError || !match) {
            return NextResponse.json({ error: "Match introuvable" }, { status: 404 });
        }

        if (match.status !== "pending") {
            return NextResponse.json({ error: `Ce match est déjà ${match.status === 'confirmed' ? 'validé' : 'refusé'}` }, { status: 400 });
        }

        // 3. Enregistrer la réponse
        // On utilise upsert pour gérer le cas où le guest change d'avis (si permis) ou double-clique
        const { error: upsertError } = await supabaseAdmin
            .from("match_confirmations")
            .upsert({
                match_id: matchId,
                guest_player_id: guestId, // User ID est null grace à la contrainte modifiée
                user_id: null,
                confirmed: confirmed,
                confirmed_at: new Date().toISOString(),
                confirmation_token: `guest_${guestId}_${Date.now()}` // Token fictif pour satisfaire la contrainte NOT NULL
            }, {
                onConflict: 'match_id, guest_player_id'
            });

        if (upsertError) {
            logger.error("[guest/respond] Error saving confirmation", { error: upsertError });
            return NextResponse.json({ error: "Erreur lors de l'enregistrement de la réponse" }, { status: 500 });
        }

        logger.info("[guest/respond] Response saved successfully");
        return NextResponse.json({ success: true, message: confirmed ? "Match confirmé" : "Match refusé" });

    } catch (error) {
        logger.error("[guest/respond] Unexpected error", { error });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
