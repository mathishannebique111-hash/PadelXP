import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        const { id } = await params;

        // Récupérer la ligue
        let { data: league, error: leagueError } = await supabaseAdmin
            .from("leagues")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (leagueError || !league) {
            return NextResponse.json({ error: "Ligue introuvable" }, { status: 404 });
        }

        // Vérifier que le joueur est membre
        const { data: membership } = await supabaseAdmin
            .from("league_players")
            .select("id")
            .eq("league_id", id)
            .eq("player_id", user.id)
            .maybeSingle();

        if (!membership) {
            return NextResponse.json({ error: "Vous n'êtes pas membre de cette ligue" }, { status: 403 });
        }

        // Vérifier si une transition de phase est nécessaire (format divisions)
        if (league.format === "divisions" && league.status === "active" && league.phase_ends_at) {
            const now = new Date();
            const phaseEndsAt = new Date(league.phase_ends_at);
            const leagueEndsAt = new Date(league.ends_at);

            // Si la phase est terminée (mais la ligue elle-même n'est pas expirée)
            if (now >= phaseEndsAt && now < leagueEndsAt) {
                // S'assurer qu'on ne bloque pas la requête utilisateur, mais attendre la transition
                await handlePhaseTransition(id, league, supabaseAdmin);
                // Rafraîchir les données de la ligue après transition
                const { data: updatedLeague } = await supabaseAdmin.from("leagues").select("*").eq("id", id).single();
                if (updatedLeague) league = updatedLeague;
            }
        }



        // Récupérer tous les joueurs avec leurs profils
        const { data: players, error: playersError } = await supabaseAdmin
            .from("league_players")
            .select("player_id, matches_played, points, joined_at, division")
            .eq("league_id", id)
            .order("points", { ascending: false });

        if (playersError) {
            console.error("[leagues/[id]] Players error:", playersError);
            return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
        }

        // Récupérer les profils des joueurs
        const playerIds = (players || []).map(p => p.player_id);
        const { data: profiles } = await supabaseAdmin
            .from("profiles")
            .select("id, first_name, last_name, display_name")
            .in("id", playerIds);

        const profilesMap = new Map(
            (profiles || []).map(p => [p.id, p])
        );

        // Construire le classement
        const standings = (players || []).map((p, index) => {
            const profile = profilesMap.get(p.player_id);
            return {
                rank: index + 1,
                player_id: p.player_id,
                display_name: profile?.display_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || "Joueur",
                matches_played: p.matches_played,
                points: p.points,
                division: p.division,
                is_current_user: p.player_id === user.id,
            };
        });

        // Calculer le temps restant
        let remainingDays = null;
        let isExpired = false;

        if (league.status !== "pending" && league.ends_at) {
            const now = new Date();
            const endsAt = new Date(league.ends_at);
            const remainingMs = Math.max(0, endsAt.getTime() - now.getTime());
            remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
            isExpired = remainingMs <= 0;
        }

        return NextResponse.json({
            league: {
                ...league,
                remaining_days: remainingDays,
                is_expired: isExpired,
            },
            standings,
        });
    } catch (error: any) {
        console.error("[leagues/[id]] Unexpected error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

async function handlePhaseTransition(leagueId: string, league: any, supabaseAdmin: any) {
    // 1. Fetch all players
    const { data: players } = await supabaseAdmin
        .from("league_players")
        .select("id, player_id, division, matches_played, points")
        .eq("league_id", leagueId);

    if (!players || players.length === 0) return;

    // Fetch global points for tie breaking
    const playerIds = players.map((p: any) => p.player_id);
    const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, global_points")
        .in("id", playerIds);

    const getGlobalPoints = (pid: string) => profiles?.find((p: any) => p.id === pid)?.global_points || 0;

    // 2. Compute rankings within current divisions
    const divisionsMap = new Map<number, any[]>();
    for (const p of players) {
        if (!divisionsMap.has(p.division)) divisionsMap.set(p.division, []);
        divisionsMap.get(p.division)!.push({ ...p, global_points: getGlobalPoints(p.player_id) });
    }

    for (const divPlayers of divisionsMap.values()) {
        divPlayers.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return b.global_points - a.global_points;
        });
        divPlayers.forEach((p, idx) => p.rank = idx + 1);
    }

    const allRankedPlayers = Array.from(divisionsMap.values()).flat();

    // 3. Save to history
    const historyPayload = allRankedPlayers.map(p => ({
        league_id: leagueId,
        phase_number: league.current_phase,
        player_id: p.player_id,
        division: p.division,
        rank: p.rank,
        matches_played: p.matches_played,
        points: p.points
    }));

    await supabaseAdmin.from("league_phase_history").insert(historyPayload);

    // 4. Calculate new divisions
    const newDivisions = new Map<string, number>();
    const totalDivisions = Math.ceil(players.length / 4);

    if (league.current_phase === 0) {
        allRankedPlayers.sort((a, b) => {
            if (a.rank !== b.rank) return a.rank - b.rank; // 1st > 2nd
            if (a.points !== b.points) return b.points - a.points;
            return b.global_points - a.global_points;
        });

        allRankedPlayers.forEach((p, idx) => {
            newDivisions.set(p.player_id, Math.floor(idx / 4) + 1);
        });
    } else {
        allRankedPlayers.forEach(p => {
            let newDiv = p.division;
            if (p.rank === 1 && newDiv > 1) {
                newDiv -= 1;
            } else if (p.rank >= 4 && newDiv < totalDivisions) {
                const divSize = divisionsMap.get(p.division)?.length || 4;
                if (p.rank === divSize && newDiv < totalDivisions) {
                    newDiv += 1;
                }
            }
            newDivisions.set(p.player_id, newDiv);
        });
    }

    // 5. Update players
    for (const p of players) {
        await supabaseAdmin
            .from("league_players")
            .update({
                division: newDivisions.get(p.player_id) || p.division,
                matches_played: 0,
                points: 0
            })
            .eq("id", p.id);
    }

    // 6. Update league
    // CRUCIAL : On ne fait SURTOUT PAS Date.now() + 14 jours.
    // On prend l'heure exacte d'expiration de la phase, et on ajoute 14 jours.
    // Ainsi, même si le joueur ouvre la page avec 2 jours de retard, la nouvelle phase
    // se terminera dans 12 jours, gardant le calendrier de la ligue parfaitement rigide.
    const currentPhaseEndsAt = new Date(league.phase_ends_at);
    let jumpCount = 1;
    let nextEndsAt = new Date(currentPhaseEndsAt.getTime() + (14 * 24 * 60 * 60 * 1000));
    const nowMs = Date.now();

    // Si la ligue est inactive depuis TRÈS longtemps on saute mathématiquement les phases.
    while (nextEndsAt.getTime() <= nowMs) {
        jumpCount++;
        nextEndsAt = new Date(currentPhaseEndsAt.getTime() + (jumpCount * 14 * 24 * 60 * 60 * 1000));
    }

    await supabaseAdmin
        .from("leagues")
        .update({
            current_phase: league.current_phase + jumpCount,
            phase_ends_at: nextEndsAt.toISOString()
        })
        .eq("id", leagueId);
}
