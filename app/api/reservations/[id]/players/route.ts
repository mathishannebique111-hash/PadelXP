import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// POST /api/reservations/[id]/players - Ajouter des participants
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    // ⚠️ On doit attendre params en Next.js 15+ si on y accède, mais ici params est passé en prop
    // Le params.id est déjà dispo
    const reservationId = params.id;

    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) => {
                                cookieStore.set(name, value, options);
                            });
                        } catch (e) {
                            // Ignore
                        }
                    },
                },
            }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        const body = await request.json();
        const { participant_ids } = body; // Array de IDs

        if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length !== 3) {
            return NextResponse.json({ error: "Il faut exactement 3 participants" }, { status: 400 });
        }

        // 1. Vérifier la réservation
        const { data: reservation, error: resError } = await supabase
            .from("reservations")
            .select("*, court:courts(id, name, club:clubs(id, name))")
            .eq("id", reservationId)
            .single();

        if (resError || !reservation) {
            return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
        }

        if (reservation.created_by !== user.id) {
            return NextResponse.json({ error: "Seul l'organisateur peut ajouter des joueurs" }, { status: 403 });
        }

        // 2. Vérifier si joueurs déjà ajoutés
        const { count, error: countError } = await supabase
            .from("reservation_participants")
            .select("*", { count: "exact", head: true })
            .eq("reservation_id", reservationId)
            .eq("is_organizer", false); // On compte les invités

        if (countError) {
            return NextResponse.json({ error: "Erreur vérification participants" }, { status: 500 });
        }

        if ((count || 0) >= 3) {
            return NextResponse.json({ error: "Les joueurs ont déjà été ajoutés" }, { status: 400 });
        }

        // 3. Ajouter les participants
        const pricePerPerson = (reservation.total_price || 30) / 4;

        const participantsToAdd = participant_ids.map((pid: string) => ({
            reservation_id: reservationId,
            user_id: pid,
            is_organizer: false,
            amount: pricePerPerson,
            payment_status: "pending"
        }));

        const { error: insertError } = await supabase
            .from("reservation_participants")
            .insert(participantsToAdd);

        if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        // 4. Les notifications sont gérées par le Trigger DB (add_reservation_notifications.sql)
        // Donc dès l'insert, les notifs partent.

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("POST /api/reservations/[id]/players error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
