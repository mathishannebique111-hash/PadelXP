import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

/**
 * GET /api/matches/pending
 * Récupère les matchs en attente de confirmation pour le joueur courant
 */
export async function GET(req: Request) {
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
                    setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) => {
                                cookieStore.set(name, value, options);
                            });
                        } catch (error) {
                            logger.error("Error setting cookies", { error: (error as Error).message });
                        }
                    },
                },
            }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        // Récupérer les matchs où le joueur participe et qui sont en statut pending
        const { data: participations, error: partError } = await supabaseAdmin
            .from("match_participants")
            .select("match_id, team")
            .eq("user_id", user.id)
            .eq("player_type", "user");

        if (partError) {
            logger.error("Error fetching participations", { error: partError.message });
            return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
        }

        if (!participations || participations.length === 0) {
            return NextResponse.json({ pendingMatches: [] });
        }

        const matchIds = participations.map(p => p.match_id);

        // Récupérer les matchs en attente
        const { data: pendingMatches, error: matchError } = await supabaseAdmin
            .from("matches")
            .select(`
        id,
        winner_team_id,
        team1_id,
        team2_id,
        score_team1,
        score_team2,
        created_at,
        status,
        location_club_id,
        is_registered_club
      `)
            .in("id", matchIds)
            .eq("status", "pending")
            .order("created_at", { ascending: false });

        if (matchError) {
            logger.error("Error fetching pending matches", { error: matchError.message });
            return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
        }

        if (!pendingMatches || pendingMatches.length === 0) {
            return NextResponse.json({ pendingMatches: [] });
        }

        // Récupérer les informations de lieu pour tous les matchs
        const clubIds = [...new Set(pendingMatches.filter(m => m.location_club_id && m.is_registered_club).map(m => m.location_club_id))];
        const unregClubIds = [...new Set(pendingMatches.filter(m => m.location_club_id && !m.is_registered_club).map(m => m.location_club_id))];

        const locationNamesMap = new Map<string, string>();

        if (clubIds.length > 0) {
            const { data: registeredClubs } = await supabaseAdmin
                .from("clubs")
                .select("id, name, city")
                .in("id", clubIds);
            (registeredClubs || []).forEach(c => locationNamesMap.set(c.id, `${c.name} (${c.city})`));
        }

        if (unregClubIds.length > 0) {
            const { data: unregisteredClubs } = await supabaseAdmin
                .from("unregistered_clubs")
                .select("id, name, city")
                .in("id", unregClubIds);
            (unregisteredClubs || []).forEach(c => locationNamesMap.set(c.id, `${c.name} (${c.city})`));
        }

        // Récupérer les participants et confirmations pour chaque match
        const enrichedMatches = await Promise.all(pendingMatches.map(async (match) => {
            // Récupérer les participants
            const { data: participants } = await supabaseAdmin
                .from("match_participants")
                .select("user_id, player_type, guest_player_id, team")
                .eq("match_id", match.id);

            // Récupérer les confirmations
            const { data: confirmations } = await supabaseAdmin
                .from("match_confirmations")
                .select("user_id, guest_player_id, confirmed")
                .eq("match_id", match.id);

            // Récupérer les profils des participants
            const userIds = (participants || [])
                .filter(p => p.player_type === "user")
                .map(p => p.user_id);

            const { data: profiles } = await supabaseAdmin
                .from("profiles")
                .select("id, display_name, first_name, last_name, club_id")
                .in("id", userIds);

            // Récupérer les noms des clubs pour ces joueurs
            const profileClubIds = [...new Set((profiles || []).map(p => p.club_id).filter(Boolean))];
            const profileClubNamesMap = new Map<string, string>();

            if (profileClubIds.length > 0) {
                const { data: clubs } = await supabaseAdmin
                    .from("clubs")
                    .select("id, name")
                    .in("id", profileClubIds);
                (clubs || []).forEach(c => profileClubNamesMap.set(c.id, c.name));
            }

            const profileMap = new Map((profiles || []).map(p => [p.id, p]));
            const currentUserProfile = profileMap.get(user.id);
            const currentUserClubId = currentUserProfile?.club_id;

            // Enrichir les participants avec les noms et clubs
            const enrichedParticipants = (participants || []).map(p => {
                const profile = profileMap.get(p.user_id);
                const displayName = profile?.display_name ||
                    `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
                    'Joueur';

                // Vérifier si ce participant a confirmé
                const hasConfirmed = (confirmations || []).some(
                    c => {
                        if (c.confirmed) {
                            if (p.player_type === "user") {
                                return c.user_id === p.user_id;
                            } else if (p.player_type === "guest") {
                                return c.guest_player_id === p.guest_player_id;
                            }
                        }
                        return false;
                    }
                );

                // Déterminer le nom du club si différent de celui du joueur connecté
                let clubName = undefined;
                if (p.player_type === "user" && profile?.club_id) {
                    if (profile.club_id !== currentUserClubId) {
                        clubName = profileClubNamesMap.get(profile.club_id);
                    }
                }

                return {
                    ...p,
                    display_name: displayName,
                    club_name: clubName,
                    has_confirmed: hasConfirmed,
                    is_current_user: p.user_id === user.id
                };
            });

            // Déterminer le créateur (premier à avoir confirmé)
            const creator = enrichedParticipants.find(p => p.has_confirmed);

            // Vérifier si le joueur courant a déjà confirmé
            const currentUserConfirmed = (confirmations || []).some(
                c => c.user_id === user.id && c.confirmed
            );

            // Règle simplifiée : 3 confirmations requises (sur 4 joueurs)
            const confirmationCount = (confirmations || []).filter(c => c.confirmed).length;
            const neededForFullSum = 3 - confirmationCount;

            return {
                ...match,
                participants: enrichedParticipants,
                creator_name: creator?.display_name || 'Un joueur',
                creator_id: creator?.user_id,
                current_user_confirmed: currentUserConfirmed,
                confirmation_count: confirmationCount,
                confirmations_needed: Math.max(0, neededForFullSum),
                location_name: match.location_club_id ? (locationNamesMap.get(match.location_club_id) || "Lieu inconnu") : "Lieu non précisé"
            };
        }));

        // Ne pas filtrer - afficher TOUS les matchs en attente auxquels le joueur participe
        // (qu'il ait confirmé ou non) jusqu'à ce que le match atteigne 3 confirmations

        return NextResponse.json({
            pendingMatches: enrichedMatches,
            totalPending: enrichedMatches.length
        });

    } catch (error) {
        logger.error("Unexpected error in pending matches", { error: (error as Error).message });
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
