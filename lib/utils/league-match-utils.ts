import { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

/**
 * Distribue les points de ligue après la confirmation d'un match.
 * Cette fonction est isolée et ne doit JAMAIS bloquer le flux normal de confirmation.
 *
 * Règles :
 * - Victoire = +3 points, Défaite = +1 point
 * - Si le joueur a déjà atteint son quota de matchs → matches_played++ mais 0 point ajouté
 * - Seuls les joueurs de type "user" sont concernés (pas les guests)
 */
export async function processLeagueMatchStats(
    adminClient: SupabaseClient,
    matchId: string,
    leagueId: string,
    participants: Array<{ user_id: string; team: number; player_type: string }>,
    winnerTeamId: string,
    fullMatch: { team1_id: string; team2_id: string }
): Promise<void> {
    // 1. Récupérer la ligue
    const { data: league, error: leagueError } = await adminClient
        .from("leagues")
        .select("id, status, ends_at, max_matches_per_player")
        .eq("id", leagueId)
        .maybeSingle();

    if (leagueError || !league) {
        logger.warn("[league-match] League not found or error", { leagueId, error: leagueError?.message });
        return;
    }

    // Vérifier que la ligue est active et non expirée
    if (league.status !== "active") {
        logger.warn("[league-match] League is not active, skipping", { leagueId, status: league.status });
        return;
    }

    if (league.ends_at && new Date(league.ends_at) < new Date()) {
        logger.warn("[league-match] League has expired, skipping", { leagueId });
        return;
    }

    // 2. Filtrer les joueurs "user" uniquement
    const userParticipants = participants.filter(p => p.player_type === "user");

    if (userParticipants.length === 0) {
        logger.warn("[league-match] No user participants found, skipping");
        return;
    }

    // 3. Pour chaque joueur, mettre à jour ses stats de ligue
    for (const participant of userParticipants) {
        const userId = participant.user_id;

        // Déterminer si le joueur est dans l'équipe gagnante
        let isWinner = false;
        if (winnerTeamId === fullMatch.team1_id && participant.team === 1) isWinner = true;
        else if (winnerTeamId === fullMatch.team2_id && participant.team === 2) isWinner = true;

        // Récupérer le row league_players
        const { data: leaguePlayer, error: lpError } = await adminClient
            .from("league_players")
            .select("id, matches_played, points")
            .eq("league_id", leagueId)
            .eq("player_id", userId)
            .maybeSingle();

        if (lpError || !leaguePlayer) {
            logger.warn("[league-match] Player not in league, skipping", { userId, leagueId });
            continue;
        }

        // Calculer les points à ajouter
        const currentMatchesPlayed = leaguePlayer.matches_played || 0;
        const underQuota = currentMatchesPlayed < league.max_matches_per_player;
        const pointsToAdd = underQuota ? (isWinner ? 3 : 1) : 0;

        // Mettre à jour
        const { error: updateError } = await adminClient
            .from("league_players")
            .update({
                matches_played: currentMatchesPlayed + 1,
                points: (leaguePlayer.points || 0) + pointsToAdd,
            })
            .eq("id", leaguePlayer.id);

        if (updateError) {
            logger.error("[league-match] Error updating league player stats", {
                userId,
                leagueId,
                error: updateError.message,
            });
        } else {
            logger.info("[league-match] Updated league player stats", {
                userId: userId.substring(0, 8) + "…",
                isWinner,
                pointsAdded: pointsToAdd,
                newMatchesPlayed: currentMatchesPlayed + 1,
                underQuota,
            });
        }
    }
}
