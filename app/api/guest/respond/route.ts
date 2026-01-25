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
        // 1. Vérifier que le guest participe bien au match
        const { data: participants, error: partError } = await supabaseAdmin
            .from("match_participants")
            .select("guest_player_id")
            .eq("match_id", matchId);

        if (partError || !participants) {
            logger.error("[guest/respond] Error fetching participants", { error: partError });
            return NextResponse.json({ error: "Ce joueur ne participe pas à ce match" }, { status: 403 });
        }

        const isParticipant = participants.some((p) => p.guest_player_id === guestId);

        if (!isParticipant) {
            logger.warn("[guest/respond] Guest ID not found in match participants", { guestId, matchId });
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
        // 3. Enregistrer la réponse
        // On vérifie d'abord si une confirmation existe déjà pour ce match et ce guest
        const { data: existingConfirmation, error: fetchError } = await supabaseAdmin
            .from("match_confirmations")
            .select("id")
            .eq("match_id", matchId)
            .eq("guest_player_id", guestId)
            .maybeSingle();

        if (fetchError) {
            logger.error("[guest/respond] Error checking existing confirmation", { error: fetchError });
            return NextResponse.json({ error: "Erreur lors de la vérification" }, { status: 500 });
        }

        let operationError;

        if (existingConfirmation) {
            // Update
            const { error } = await supabaseAdmin
                .from("match_confirmations")
                .update({
                    confirmed: confirmed,
                    confirmed_at: new Date().toISOString()
                })
                .eq("id", existingConfirmation.id);
            operationError = error;
        } else {
            // Insert
            const { error } = await supabaseAdmin
                .from("match_confirmations")
                .insert({
                    match_id: matchId,
                    guest_player_id: guestId,
                    user_id: null,
                    confirmed: confirmed,
                    confirmed_at: new Date().toISOString(),
                    confirmation_token: `guest_${guestId}_${Date.now()}`
                });
            operationError = error;
        }

        if (operationError) {
            logger.error("[guest/respond] Error saving confirmation", { error: operationError });
            return NextResponse.json({ error: "Erreur lors de l'enregistrement de la réponse" }, { status: 500 });
        }



        logger.info("[guest/respond] Response saved successfully");
        return NextResponse.json({ success: true, message: confirmed ? "Match confirmé" : "Match refusé" });

    } catch (error) {
        logger.error("[guest/respond] Unexpected error", { error });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
