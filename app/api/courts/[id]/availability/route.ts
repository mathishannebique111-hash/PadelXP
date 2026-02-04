import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// GET /api/courts/[id]/availability?date=YYYY-MM-DD
// Récupérer les disponibilités d'un terrain pour une date donnée
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: courtId } = await params;
        const supabase = createRouteHandlerClient({ cookies });
        const { searchParams } = new URL(request.url);
        const date = searchParams.get("date"); // Format: YYYY-MM-DD

        if (!date) {
            return NextResponse.json({ error: "date requis (YYYY-MM-DD)" }, { status: 400 });
        }

        // Vérifier que le terrain existe
        const { data: court, error: courtError } = await supabase
            .from("courts")
            .select("id, name, is_active, club:club_id (id, name)")
            .eq("id", courtId)
            .single();

        if (courtError || !court) {
            return NextResponse.json({ error: "Terrain introuvable" }, { status: 404 });
        }

        // Récupérer les réservations du jour
        const startOfDay = `${date}T00:00:00Z`;
        const endOfDay = `${date}T23:59:59Z`;

        const { data: reservations, error: resError } = await supabase
            .from("reservations")
            .select(`
        id,
        start_time,
        end_time,
        status
      `)
            .eq("court_id", courtId)
            .gte("start_time", startOfDay)
            .lt("start_time", endOfDay)
            .in("status", ["pending_payment", "confirmed"]);

        if (resError) {
            console.error("Error fetching reservations:", resError);
            return NextResponse.json({ error: resError.message }, { status: 500 });
        }

        // Générer les créneaux horaires (de 8h à 22h, par tranches de 1h30)
        const slots = generateTimeSlots(date, reservations || []);

        return NextResponse.json({
            court,
            date,
            slots
        });
    } catch (error) {
        console.error("GET /api/courts/[id]/availability error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

interface Reservation {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
}

interface TimeSlot {
    start_time: string;
    end_time: string;
    is_available: boolean;
    reservation_id?: string;
    status?: string;
}

function generateTimeSlots(date: string, reservations: Reservation[]): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const slotDurationMinutes = 90; // 1h30

    // Créneaux de 8h à 22h
    for (let hour = 8; hour < 22; hour++) {
        for (let minute = 0; minute < 60; minute += slotDurationMinutes) {
            if (hour === 21 && minute > 0) break; // Pas de créneau après 21h30

            const startHour = hour.toString().padStart(2, "0");
            const startMinute = minute.toString().padStart(2, "0");

            const endMinutes = minute + slotDurationMinutes;
            const endHour = (hour + Math.floor(endMinutes / 60)).toString().padStart(2, "0");
            const endMinute = (endMinutes % 60).toString().padStart(2, "0");

            const startTime = `${date}T${startHour}:${startMinute}:00Z`;
            const endTime = `${date}T${endHour}:${endMinute}:00Z`;

            // Vérifier si ce créneau est pris
            const conflictingReservation = reservations.find(res => {
                const resStart = new Date(res.start_time).getTime();
                const resEnd = new Date(res.end_time).getTime();
                const slotStart = new Date(startTime).getTime();
                const slotEnd = new Date(endTime).getTime();

                // Chevauchement si les intervalles se croisent
                return slotStart < resEnd && slotEnd > resStart;
            });

            slots.push({
                start_time: startTime,
                end_time: endTime,
                is_available: !conflictingReservation,
                reservation_id: conflictingReservation?.id,
                status: conflictingReservation?.status
            });
        }
    }

    return slots;
}
