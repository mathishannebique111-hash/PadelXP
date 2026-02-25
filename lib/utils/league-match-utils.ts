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
        .select("id, status, ends_at, max_matches_per_player, format, current_phase")
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

    // 3. Préparer les données pour le bonus de diversité (Format Divisions)
    const isDivisionsFormat = league.format === 'divisions';
    const currentPhase = league.current_phase || 0;

    // Si c'est le format divisions, on va avoir besoin de l'historique des matchs de cette phase pour les gagnants
    let previousMatchIdsInPhase: string[] = [];
    if (isDivisionsFormat) {
        // On récupère les IDs de tous les matchs validés de cette ligue dans la phase actuelle
        // Pour cela, on cherche dans properties ou via date, mais le plus simple est de juste regarder les matchs 
        // récents depuis le début de la phase. Simplification : on récupère les matchs de la ligue
        // On cherchera côté participants si le binôme gagnant a déjà gagné ensemble

        // On récupère les vainqueurs de ce match (users uniquement)
        const winners = userParticipants.filter(p => {
            return (winnerTeamId === fullMatch.team1_id && p.team === 1) ||
                (winnerTeamId === fullMatch.team2_id && p.team === 2);
        });

        // Si on a bien 2 gagnants "user", on vérifie s'ils ont déjà gagné ensemble
        if (winners.length === 2) {
            const winner1 = winners[0].user_id;
            const winner2 = winners[1].user_id;

            // On cherche s'il existe déjà un match (autre que celui-ci) où:
            // - Les 2 joueurs étaient dans la même équipe
            // - L'équipe a gagné
            // - Le match fait partie de la ligue
            // Note: Une implémentation parfaite filtrerait par `phase`, mais la phase est une nouvelle donnée.
            // Pour l'instant on regarde s'ils ont *déjà* gagné ensemble dans cette ligue tout court.
            // On pourrait affiner avec une requête SQL sur les dates de la phase.

            // D'abord, on trouve les matchs où le Joueur 1 a joué et gagné
            const { data: w1Matches } = await adminClient
                .from("match_participants")
                .select("match_id, team")
                .eq("user_id", winner1)
                .neq("match_id", matchId);

            if (w1Matches && w1Matches.length > 0) {
                const w1MatchesMap = new Map();
                w1Matches.forEach(m => w1MatchesMap.set(m.match_id, m.team));

                // Ensuite on trouve les matchs où le Joueur 2 a joué
                const { data: w2Matches } = await adminClient
                    .from("match_participants")
                    .select("match_id, team")
                    .eq("user_id", winner2)
                    .in("match_id", Array.from(w1MatchesMap.keys()));

                if (w2Matches && w2Matches.length > 0) {
                    // On filtre ceux où ils étaient dans la même équipe
                    const commonMatches = w2Matches.filter(m => m.team === w1MatchesMap.get(m.match_id));

                    if (commonMatches.length > 0) {
                        // On vérifie si ces matchs faisaient partie de la ligue et s'ils ont gagné
                        const commonMatchIds = commonMatches.map(m => m.match_id);
                        const { data: commonLeagueMatches } = await adminClient
                            .from("matches")
                            .select("id, winner_team_id, team1_id, team2_id, status")
                            .in("id", commonMatchIds)
                            .eq("league_id", leagueId)
                            .eq("status", "confirmed");

                        if (commonLeagueMatches && commonLeagueMatches.length > 0) {
                            // Ont-ils gagné ces matchs ?
                            const haveWonTogether = commonLeagueMatches.some(m => {
                                const teamObjId = w1MatchesMap.get(m.id) === 1 ? m.team1_id : m.team2_id;
                                return m.winner_team_id === teamObjId;
                            });

                            if (haveWonTogether) {
                                // Ils ont déjà gagné ensemble, pas de bonus
                                previousMatchIdsInPhase = [commonLeagueMatches[0].id];
                                logger.info(`[league-match] Winners ${winner1.slice(0, 8)} and ${winner2.slice(0, 8)} have already won together in this league.`);
                            }
                        }
                    }
                }
            }
        }
    }

    // 4. Pour chaque joueur, mettre à jour ses stats de ligue
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

        // --- CALCUL DES POINTS ---
        const currentMatchesPlayed = leaguePlayer.matches_played || 0;
        const underQuota = currentMatchesPlayed < league.max_matches_per_player;

        let pointsToAdd = 0;
        let isDiversityBonus = false;

        if (underQuota) {
            if (isWinner) {
                if (isDivisionsFormat) {
                    // Logique Format Divisions : 2 pts la victoire, +1 pt de bonus de diversité 
                    // si c'est la première victoire avec ce partenaire
                    if (previousMatchIdsInPhase.length === 0) {
                        pointsToAdd = 3;
                        isDiversityBonus = true;
                    } else {
                        pointsToAdd = 2; // Déjà gagné avec ce partenaire
                    }
                } else {
                    // Format Classique : 3 pts la victoire
                    pointsToAdd = 3;
                }
            } else {
                // Défaite = 1 pt (dans les deux formats)
                pointsToAdd = 1;
            }
        }

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
                isDivisionsFormat,
                isDiversityBonus
            });
        }
    }
}
