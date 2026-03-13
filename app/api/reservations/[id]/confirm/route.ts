import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: reservationId } = await params;

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        // 1. Récupérer le participant
        const { data: participant, error: participantError } = await supabase
            .from("reservation_participants")
            .select("id, payment_status, is_organizer")
            .eq("reservation_id", reservationId)
            .eq("user_id", user.id)
            .single();

        if (participantError || !participant) {
            return NextResponse.json({ error: "Vous n'êtes pas participant de cette réservation" }, { status: 404 });
        }

        if (participant.payment_status === 'paid' || participant.payment_status === 'confirmed') {
            return NextResponse.json({ message: "Présence déjà confirmée" });
        }

        // 2. Confirmer la présence
        const { error: updateError } = await supabase
            .from("reservation_participants")
            .update({ 
                payment_status: 'confirmed',
                paid_at: new Date().toISOString()
            })
            .eq("id", participant.id);

        if (updateError) {
            throw updateError;
        }

        // 3. Vérifier si la réservation doit passer en 'confirmed' (si 4 joueurs ont confirmé/payé)
        const { data: allParticipants } = await supabase
            .from("reservation_participants")
            .select("payment_status, is_organizer")
            .eq("reservation_id", reservationId);

        const confirmedCount = (allParticipants || []).filter((p: any) => 
            p.is_organizer || p.payment_status === 'paid' || p.payment_status === 'confirmed'
        ).length;

        if (confirmedCount >= 4) {
            await supabase
                .from("reservations")
                .update({ status: 'confirmed' })
                .eq("id", reservationId)
                .eq("status", "pending_payment");
        }

        logger.info("Présence confirmée", { reservationId, userId: user.id });

        return NextResponse.json({ success: true, confirmedCount });

    } catch (error: any) {
        logger.error("Erreur confirmation présence", { 
            message: error?.message,
            reservationId
        });

        return NextResponse.json({ 
            error: "Erreur lors de la confirmation de présence"
        }, { status: 500 });
    }
}
