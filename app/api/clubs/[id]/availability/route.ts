import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// GET /api/clubs/[id]/availability?date=YYYY-MM-DD
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: clubId } = await params;
        const supabase = createRouteHandlerClient({ cookies });
        const { searchParams } = new URL(request.url);
        const date = searchParams.get("date"); // Format: YYYY-MM-DD

        if (!date) {
            return NextResponse.json({ error: "date requis (YYYY-MM-DD)" }, { status: 400 });
        }

        // 1. Récupérer tous les terrains actifs du club
        const { data: courts, error: courtsError } = await supabase
            .from("courts")
            .select("id, name, is_active")
            .eq("club_id", clubId)
            .eq("is_active", true);

        if (courtsError) {
            return NextResponse.json({ error: courtsError.message }, { status: 500 });
        }

        if (!courts || courts.length === 0) {
            return NextResponse.json({ date, courts: [] });
        }

        // 2. Récupérer toutes les réservations du club pour cette date
        const startOfDay = `${date}T00:00:00Z`;
        const endOfDay = `${date}T23:59:59Z`;

        const { data: reservations, error: resError } = await supabase
            .from("reservations")
            .select(`
                id,
                start_time,
                end_time,
                status,
                court_id
            `)
            .in("court_id", courts.map(c => c.id))
            .gte("start_time", startOfDay)
            .lt("start_time", endOfDay)
            .in("status", ["pending_payment", "confirmed"]);

        if (resError) {
            console.error("Error fetching reservations:", resError);
            return NextResponse.json({ error: resError.message }, { status: 500 });
        }

        // 3. Générer les créneaux pour chaque terrain
        const courtsWithAvailability = courts.map(court => {
            const courtReservations = reservations?.filter(r => r.court_id === court.id) || [];
            const slots = generateTimeSlots(date, courtReservations);
            return {
                ...court,
                slots
            };
        });

        return NextResponse.json({
            date,
            courts: courtsWithAvailability
        });
    } catch (error) {
        console.error("GET /api/clubs/[id]/availability error:", error);
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

    // Heures d'ouverture (8h - 23h pour permettre le créneau de 21h30)
    // TODO: Configurable par club
    const startHour = 8;     // 08:00
    const endMinutesLimit = 23 * 60; // 23:00 (Dernière fin de match acceptée)

    let currentMinutes = startHour * 60;

    while (currentMinutes + slotDurationMinutes <= endMinutesLimit) {
        const nextMinutes = currentMinutes + slotDurationMinutes;

        // Format Start
        const hStart = Math.floor(currentMinutes / 60).toString().padStart(2, "0");
        const mStart = (currentMinutes % 60).toString().padStart(2, "0");

        // Format End
        const hEnd = Math.floor(nextMinutes / 60).toString().padStart(2, "0");
        const mEnd = (nextMinutes % 60).toString().padStart(2, "0");

        const startTime = `${date}T${hStart}:${mStart}:00Z`;
        const endTime = `${date}T${hEnd}:${mEnd}:00Z`;

        // Vérifier si ce créneau est pris
        const conflictingReservation = reservations.find(res => {
            const resStart = new Date(res.start_time).getTime();
            const resEnd = new Date(res.end_time).getTime();
            const slotStart = new Date(startTime).getTime();
            const slotEnd = new Date(endTime).getTime();

            // Chevauchement strict
            return slotStart < resEnd && slotEnd > resStart;
        });

        slots.push({
            start_time: startTime,
            end_time: endTime,
            is_available: !conflictingReservation,
            reservation_id: conflictingReservation?.id,
            status: conflictingReservation?.status
        });

        currentMinutes = nextMinutes;
    }

    return slots;
}
