import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Cron job pour expirer les réservations non payées après 3h
// À appeler via Vercel Cron ou un service externe toutes les 5-10 minutes

export async function GET(request: NextRequest) {
    try {
        // Vérifier le token d'autorisation pour les appels cron
        const authHeader = request.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Utiliser le service role pour pouvoir modifier toutes les réservations
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Trouver les réservations expirées
        const now = new Date().toISOString();

        const { data: expiredReservations, error: fetchError } = await supabase
            .from("reservations")
            .select("id, created_by, court_id")
            .eq("status", "pending_payment")
            .lt("expires_at", now);

        if (fetchError) {
            console.error("Error fetching expired reservations:", fetchError);
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        if (!expiredReservations || expiredReservations.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No expired reservations found",
                count: 0
            });
        }

        // Mettre à jour le statut des réservations expirées
        const expiredIds = expiredReservations.map(r => r.id);

        const { error: updateError } = await supabase
            .from("reservations")
            .update({
                status: "expired",
                updated_at: now
            })
            .in("id", expiredIds);

        if (updateError) {
            console.error("Error updating expired reservations:", updateError);
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // Envoyer des notifications aux organisateurs
        for (const reservation of expiredReservations) {
            await supabase.from("notifications").insert({
                user_id: reservation.created_by,
                type: "reservation_expired",
                title: "Réservation expirée",
                message: "Votre réservation a expiré car tous les joueurs n'ont pas payé dans le délai imparti.",
                data: { reservation_id: reservation.id }
            });
        }

        console.log(`Expired ${expiredIds.length} reservations:`, expiredIds);

        return NextResponse.json({
            success: true,
            message: `Expired ${expiredIds.length} reservations`,
            count: expiredIds.length,
            ids: expiredIds
        });

    } catch (error) {
        console.error("Cron expire-reservations error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
