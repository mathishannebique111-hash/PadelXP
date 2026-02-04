import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// GET /api/reservations/[id] - Récupérer une réservation spécifique
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = createRouteHandlerClient({ cookies });
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        const { data: reservation, error } = await supabase
            .from("reservations")
            .select(`
        *,
        court:court_id (
          id,
          name,
          club:club_id (id, name, address, city)
        ),
        reservation_participants (
          id,
          user_id,
          is_organizer,
          amount,
          payment_status,
          paid_at,
          profiles:user_id (id, first_name, last_name, avatar_url)
        )
      `)
            .eq("id", id)
            .single();

        if (error) {
            console.error("Error fetching reservation:", error);
            return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
        }

        return NextResponse.json({ reservation });
    } catch (error) {
        console.error("GET /api/reservations/[id] error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

// PATCH /api/reservations/[id] - Annuler une réservation
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = createRouteHandlerClient({ cookies });
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        const body = await request.json();
        const { action } = body; // "cancel"

        if (action === "cancel") {
            // Vérifier que l'utilisateur est l'organisateur
            const { data: reservation, error: fetchError } = await supabase
                .from("reservations")
                .select("id, created_by, status")
                .eq("id", id)
                .single();

            if (fetchError || !reservation) {
                return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
            }

            if (reservation.created_by !== user.id) {
                return NextResponse.json({ error: "Seul l'organisateur peut annuler" }, { status: 403 });
            }

            if (reservation.status === "cancelled" || reservation.status === "expired") {
                return NextResponse.json({ error: "Réservation déjà annulée ou expirée" }, { status: 400 });
            }

            // Annuler la réservation
            const { error: updateError } = await supabase
                .from("reservations")
                .update({ status: "cancelled", updated_at: new Date().toISOString() })
                .eq("id", id);

            if (updateError) {
                console.error("Error cancelling reservation:", updateError);
                return NextResponse.json({ error: updateError.message }, { status: 500 });
            }

            // TODO: Gérer les remboursements pour les joueurs qui ont déjà payé
            // TODO: Envoyer notifications aux participants

            return NextResponse.json({ success: true, message: "Réservation annulée" });
        }

        return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
    } catch (error) {
        console.error("PATCH /api/reservations/[id] error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

// DELETE /api/reservations/[id] - Supprimer une réservation (admin only)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = createRouteHandlerClient({ cookies });
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        // Vérifier que l'utilisateur est admin du club
        const { data: reservation, error: fetchError } = await supabase
            .from("reservations")
            .select(`
        id, 
        court:court_id (club_id)
      `)
            .eq("id", id)
            .single();

        if (fetchError || !reservation) {
            return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
        }

        const clubId = (reservation.court as { club_id: string })?.club_id;

        const { data: isAdmin } = await supabase
            .from("club_admins")
            .select("id")
            .eq("club_id", clubId)
            .eq("user_id", user.id)
            .single();

        if (!isAdmin) {
            return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
        }

        const { error: deleteError } = await supabase
            .from("reservations")
            .delete()
            .eq("id", id);

        if (deleteError) {
            console.error("Error deleting reservation:", deleteError);
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "Réservation supprimée" });
    } catch (error) {
        console.error("DELETE /api/reservations/[id] error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
