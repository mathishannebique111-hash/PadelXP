import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// GET /api/reservations - Récupérer les réservations de l'utilisateur
export async function GET(request: NextRequest) {
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
                    setAll(cookiesToSet: any) {
                        // GET requests don't usually set cookies in Next.js handlers unless needed
                        // but strictly speaking we should just read here.
                        // For SSR auth usually we implement setAll if we want to refresh tokens, 
                        // but in an API route it's tricky. 
                        // Check reference implementation: players/search/route.ts does implement setAll.
                        try {
                            cookiesToSet.forEach(({ name, value, options }) => {
                                cookieStore.set(name, value, options);
                            });
                        } catch (e) {
                            // Ignore set errors in Server Components/API routes if headers sent
                        }
                    },
                },
            }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error("GET /api/reservations Auth Error:", authError);
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const courtId = searchParams.get("court_id");
        const date = searchParams.get("date"); // Format: YYYY-MM-DD

        // Si on demande les disponibilités d'un terrain
        if (courtId && date) {
            const startOfDay = `${date}T00:00:00Z`;
            const endOfDay = `${date}T23:59:59Z`;

            const { data: reservations, error } = await supabase
                .from("reservations")
                .select(`
          id,
          start_time,
          end_time,
          status,
          created_by,
          reservation_participants (
            user_id,
            is_organizer,
            payment_status,
            profiles:user_id (first_name, last_name, avatar_url)
          )
        `)
                .eq("court_id", courtId)
                .gte("start_time", startOfDay)
                .lte("start_time", endOfDay)
                .in("status", ["pending_payment", "confirmed"]);

            if (error) {
                console.error("Error fetching court availability:", error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ reservations });
        }

        // Sinon, récupérer les réservations de l'utilisateur
        const { data: myReservations, error } = await supabase
            .from("reservation_participants")
            .select(`
        id,
        is_organizer,
        payment_status,
        amount,
        reservation:reservation_id (
          id,
          start_time,
          end_time,
          status,
          payment_method,
          total_price,
          expires_at,
          reservation_participants (
            id,
            user_id,
            is_organizer,
            payment_status,
            profiles:user_id (first_name, last_name, avatar_url)
          ),
          court:court_id (
            id,
            name,
            club:club_id (id, name)
          )
        )
      `)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching user reservations:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Enrichissement manuel des profils (évite les erreurs de jointure sans FK explicite)
        if (myReservations) {
            const userIds = new Set<string>();
            myReservations.forEach((res: any) => {
                res.reservation?.reservation_participants?.forEach((p: any) => {
                    if (p.user_id) userIds.add(p.user_id);
                });
            });

            if (userIds.size > 0) {
                const { data: profiles } = await supabase
                    .from("profiles")
                    .select("id, first_name, last_name, avatar_url")
                    .in("id", Array.from(userIds));

                const profileMap = new Map(profiles?.map((p: any) => [p.id, p]));

                myReservations.forEach((res: any) => {
                    res.reservation?.reservation_participants?.forEach((p: any) => {
                        p.profiles = profileMap.get(p.user_id);
                    });
                });
            }
        }

        return NextResponse.json({ reservations: myReservations });
    } catch (error) {
        console.error("GET /api/reservations error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

// POST /api/reservations - Créer une nouvelle réservation
export async function POST(request: NextRequest) {
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
                    setAll(cookiesToSet: any) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }: any) => {
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
            console.error("POST /api/reservations Auth Error:", authError);
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        const body = await request.json();
        const {
            court_id,
            start_time,
            end_time,
            participant_ids, // Array de 3 user_ids (le créateur est ajouté automatiquement)
            total_price = 0,
            payment_method = "stripe" // "stripe" ou "on_site"
        } = body;

        // Validation
        if (!court_id || !start_time || !end_time) {
            return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
        }

        // Note: On autorise désormais la création sans participants (flux "réserver d'abord, inviter après")
        if (participant_ids && participant_ids.length !== 3 && participant_ids.length !== 0) {
            return NextResponse.json({ error: "Si des participants sont fournis, il en faut 3" }, { status: 400 });
        }

        // Vérifier que le terrain existe
        const { data: court, error: courtError } = await supabase
            .from("courts")
            .select("id, club_id, is_active")
            .eq("id", court_id)
            .single();

        if (courtError || !court) {
            return NextResponse.json({ error: "Terrain introuvable" }, { status: 404 });
        }

        if (!court.is_active) {
            return NextResponse.json({ error: "Terrain non disponible" }, { status: 400 });
        }

        // Calculer l'expiration (3h pour paiement)
        const expiresAt = payment_method === "stripe"
            ? new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
            : null;

        const initialStatus = payment_method === "on_site" ? "confirmed" : "pending_payment";

        // Créer la réservation
        const { data: reservation, error: reservationError } = await supabase
            .from("reservations")
            .insert({
                court_id,
                created_by: user.id,
                start_time,
                end_time,
                status: initialStatus,
                payment_method,
                total_price,
                expires_at: expiresAt
            })
            .select()
            .single();

        if (reservationError) {
            console.error("Error creating reservation:", reservationError);
            // Probablement un conflit de créneau
            if (reservationError.code === "23P01") {
                return NextResponse.json({ error: "Ce créneau est déjà réservé" }, { status: 409 });
            }
            return NextResponse.json({ error: reservationError.message }, { status: 500 });
        }

        // Ajouter les participants (organisateur + 3 autres)
        const pricePerPerson = total_price / 4;
        const allParticipants = [
            {
                reservation_id: reservation.id,
                user_id: user.id,
                is_organizer: true,
                amount: pricePerPerson,
                payment_status: payment_method === "on_site" ? "paid" : "pending"
            },
            ...(participant_ids || []).map((pid: string) => ({
                reservation_id: reservation.id,
                user_id: pid,
                is_organizer: false,
                amount: pricePerPerson,
                payment_status: payment_method === "on_site" ? "paid" : "pending"
            }))
        ];

        const { error: participantsError } = await supabase
            .from("reservation_participants")
            .insert(allParticipants);

        if (participantsError) {
            console.error("Error adding participants:", participantsError);
            // Rollback: supprimer la réservation
            await supabase.from("reservations").delete().eq("id", reservation.id);
            return NextResponse.json({ error: participantsError.message }, { status: 500 });
        }

        // TODO: Envoyer notifications aux 3 autres joueurs
        // (À implémenter plus tard avec le système de notifications existant)

        return NextResponse.json({
            success: true,
            reservation,
            message: payment_method === "on_site"
                ? "Réservation confirmée (paiement sur place)"
                : "Réservation créée. En attente de paiement."
        }, { status: 201 });

    } catch (error) {
        console.error("POST /api/reservations error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
