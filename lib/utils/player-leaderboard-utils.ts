import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { filterMatchesByDailyLimit } from "@/lib/utils/match-limit-utils";
import { MAX_MATCHES_PER_DAY } from "@/lib/match-constants";
import { calculatePointsForMultiplePlayers } from "@/lib/utils/boost-points-utils";
import { getPlayerDisplayName } from "@/lib/utils/player-utils";
import { isReviewValidForBonus } from "@/lib/utils/review-utils";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

export type LeaderboardEntry = {
  rank: number;
  user_id: string;
  player_name: string;
  points: number;
  wins: number;
  losses: number;
  matches: number;
  badges: any[];
  isGuest: boolean;
};

/**
 * Calcule le leaderboard en utilisant exactement la même logique que PlayerSummary
 * @param clubId - ID du club
 * @returns Le leaderboard trié par points décroissants
 */
export async function calculatePlayerLeaderboard(clubId: string | null): Promise<LeaderboardEntry[]> {
  if (!clubId || !supabaseAdmin) {
    if (!supabaseAdmin) {
      logger.warn("[calculatePlayerLeaderboard] Supabase admin client not configured");
    }
    return [];
  }

  logger.info("[calculatePlayerLeaderboard] Starting calculation", { clubId: clubId.substring(0, 8) + "..." });

  try {
    // Étape 1: Récupérer tous les profils du club (inclure avatar_url)
    const { data: clubProfiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, display_name, points, club_id, avatar_url")
      .eq("club_id", clubId);

    if (profilesError) {
      logger.error("[calculatePlayerLeaderboard] Error fetching profiles", { error: profilesError.message });
      return [];
    }

    if (!clubProfiles || clubProfiles.length === 0) {
      logger.info("[calculatePlayerLeaderboard] No profiles found for club");
      return [];
    }

    logger.info("[calculatePlayerLeaderboard] Profiles found", { count: clubProfiles.length });

    // Étape 2: Récupérer tous les match_participants pour ces profils (player_type = 'user')
    const userIds = clubProfiles.map(p => p.id);
    const { data: allParticipants, error: participantsError } = await supabaseAdmin
    .from("match_participants")
    .select("user_id, player_type, guest_player_id, team, match_id")
      .in("user_id", userIds)
    .eq("player_type", "user");
  
  if (participantsError) {
      logger.error("[calculatePlayerLeaderboard] Error fetching participants", { error: participantsError.message });
    return [];
  }
  
    logger.info("[calculatePlayerLeaderboard] Participants found", { count: allParticipants?.length || 0 });

    // Étape 3: Récupérer tous les matchs uniques
    const uniqueMatchIds = [...new Set((allParticipants || []).map(p => p.match_id))];
    
    if (uniqueMatchIds.length === 0) {
      // Aucun match, retourner les joueurs avec leurs points de challenges uniquement
      logger.info("[calculatePlayerLeaderboard] No matches found, returning profiles with challenge points only");
      return clubProfiles.map((profile, index) => {
        const challengePoints = typeof profile.points === 'number' 
          ? profile.points 
          : (typeof profile.points === 'string' ? parseInt(profile.points, 10) || 0 : 0);
        
        const firstName = profile.first_name || (profile.display_name ? profile.display_name.split(/\s+/)[0] : "");
        const lastName = profile.last_name || (profile.display_name ? profile.display_name.split(/\s+/).slice(1).join(" ") : "");
        
        const allPlayers = clubProfiles.map(p => ({
          first_name: p.first_name || (p.display_name ? p.display_name.split(/\s+/)[0] : ""),
          last_name: p.last_name || (p.display_name ? p.display_name.split(/\s+/).slice(1).join(" ") : ""),
        }));
        
        const displayName = getPlayerDisplayName(
          { first_name: firstName, last_name: lastName },
          allPlayers
        );

        return {
          rank: index + 1,
          user_id: profile.id,
          player_name: displayName,
          points: challengePoints,
          wins: 0,
          losses: 0,
          matches: 0,
          badges: [],
          isGuest: false,
          avatar_url: profile.avatar_url || null,
        };
      }).sort((a, b) => b.points - a.points).map((entry, index) => ({ ...entry, rank: index + 1 }));
    }

    const { data: allMatches, error: matchesError } = await supabaseAdmin
      .from("matches")
      .select("id, winner_team_id, team1_id, team2_id, played_at, created_at")
      .in("id", uniqueMatchIds);
    
    if (matchesError) {
      logger.error("[calculatePlayerLeaderboard] Error fetching matches", { error: matchesError.message });
      return [];
    }

    logger.info("[calculatePlayerLeaderboard] Matches found", { count: allMatches?.length || 0 });

    // Créer une Map pour accéder rapidement aux matchs
    const matchesMap = new Map<string, { winner_team_id: string; team1_id: string; team2_id: string; played_at: string }>();
    (allMatches || []).forEach(m => {
      if (m.winner_team_id && m.team1_id && m.team2_id) {
        matchesMap.set(m.id, {
          winner_team_id: m.winner_team_id,
          team1_id: m.team1_id,
          team2_id: m.team2_id,
          played_at: m.played_at || m.created_at || new Date().toISOString(),
        });
      }
    });

    // Étape 4: Pour chaque joueur, calculer ses stats en utilisant la même logique que PlayerSummary
    // IMPORTANT: Appliquer filterMatchesByDailyLimit sur TOUS les matchs du joueur (tous clubs confondus)
    // Puis filtrer par club (ne garder que les matchs où tous les participants users sont du même club)

    const playersStats = new Map<string, {
      wins: number;
      losses: number;
      matches: number;
      winMatches: Set<string>;
    }>();

    // Pour chaque joueur du club
    for (const profile of clubProfiles) {
      const userId = profile.id;
      
      // Récupérer tous les match_participants de ce joueur
      const playerParticipants = (allParticipants || []).filter(p => p.user_id === userId);
      
      if (playerParticipants.length === 0) {
        // Joueur sans matchs
        playersStats.set(userId, {
          wins: 0,
          losses: 0,
          matches: 0,
          winMatches: new Set(),
        });
        continue;
      }

      // Récupérer tous les matchs de ce joueur
      const playerMatchIds = playerParticipants.map(p => p.match_id);
      const playerMatches = playerMatchIds
        .map(id => {
          const match = matchesMap.get(id);
          return match ? { id, ...match } : null;
        })
        .filter(Boolean) as Array<{ id: string; winner_team_id: string; team1_id: string; team2_id: string; played_at: string }>;

      // Étape 4a: Appliquer filterMatchesByDailyLimit sur TOUS les matchs du joueur (tous clubs confondus)
      // C'est la même logique que PlayerSummary
      const validMatchIdsForPoints = filterMatchesByDailyLimit(
        playerParticipants.map(p => ({ match_id: p.match_id, user_id: userId })),
        playerMatches.map(m => ({ id: m.id, played_at: m.played_at })),
    MAX_MATCHES_PER_DAY
  );
  
      // Étape 4b: Filtrer par club (ne garder que les matchs où tous les participants users sont du même club)
      // Récupérer tous les participants de ces matchs
      const matchIdsForClubFilter = playerMatchIds;
      const { data: allMatchParticipants } = await supabaseAdmin
        .from("match_participants")
        .select("match_id, user_id, player_type")
        .in("match_id", matchIdsForClubFilter);

      // Récupérer les profils des participants users
      const participantUserIds = [...new Set((allMatchParticipants || [])
        .filter(p => p.player_type === "user" && p.user_id)
        .map(p => p.user_id))];

      const { data: participantProfiles } = await supabaseAdmin
      .from("profiles")
        .select("id, club_id")
        .in("id", participantUserIds)
        .eq("club_id", clubId);

      const validUserIds = new Set((participantProfiles || []).map(p => p.id));

      // Grouper les participants par match
      const participantsByMatch = new Map<string, any[]>();
      (allMatchParticipants || []).forEach(p => {
        if (!participantsByMatch.has(p.match_id)) {
          participantsByMatch.set(p.match_id, []);
        }
        participantsByMatch.get(p.match_id)!.push(p);
      });

      // Filtrer les matchs : ne garder que ceux où TOUS les participants users sont du même club
      const validMatchIds = playerMatchIds.filter(matchId => {
        const participants = participantsByMatch.get(matchId) || [];
        const userParticipants = participants.filter((p: any) => p.player_type === "user" && p.user_id);
        
        if (userParticipants.length === 0) {
          return false;
        }
        
    const allUsersInSameClub = userParticipants.every((p: any) => validUserIds.has(p.user_id));
        return allUsersInSameClub;
      });

      // Étape 4c: Filtrer les participants pour ne garder que les matchs valides (même club) ET qui respectent la limite quotidienne
      const filteredParticipants = playerParticipants.filter(p => {
        const isValidForClub = validMatchIds.includes(p.match_id);
        const isValidForDailyLimit = validMatchIdsForPoints.has(p.match_id);
        const matchExists = matchesMap.has(p.match_id);
        return isValidForClub && isValidForDailyLimit && matchExists;
      });

      // Étape 4d: Calculer wins/losses/winMatches à partir des participants filtrés
      let wins = 0;
      let losses = 0;
      let matches = 0;
      const winMatches = new Set<string>();

      filteredParticipants.forEach(p => {
        const match = matchesMap.get(p.match_id);
        if (!match) return;

        matches += 1;
        const winner_team = match.winner_team_id === match.team1_id ? 1 : 2;
        const won = winner_team === p.team;

        if (won) {
          wins += 1;
          winMatches.add(p.match_id);
    } else {
          losses += 1;
        }
      });

      playersStats.set(userId, {
        wins,
        losses,
        matches,
        winMatches,
      });
    }

    // Étape 5: Récupérer les bonus d'avis pour tous les joueurs
  const bonusMap = new Map<string, number>();
    const { data: allReviews } = await supabaseAdmin
        .from("reviews")
        .select("user_id, rating, comment")
      .in("user_id", userIds);

    if (allReviews) {
      allReviews.forEach((r: any) => {
          if (isReviewValidForBonus(r.rating || 0, r.comment || null)) {
          // +10 points pour le premier avis valide (on garde le premier trouvé)
          if (!bonusMap.has(r.user_id)) {
            bonusMap.set(r.user_id, 10);
          }
        }
      });
    }

    // Étape 6: Préparer les données pour calculatePointsForMultiplePlayers
    const playersForBoostCalculation = Array.from(playersStats.entries()).map(([userId, stats]) => {
      const profile = clubProfiles.find(p => p.id === userId);
      const challengePoints = profile && typeof profile.points === 'number' 
        ? profile.points 
        : (profile && typeof profile.points === 'string' ? parseInt(profile.points, 10) || 0 : 0);
      const bonus = bonusMap.get(userId) || 0;
      
      return {
        userId,
        wins: stats.wins,
        losses: stats.losses,
        winMatches: stats.winMatches,
        bonus,
        challengePoints,
      };
    });

    // Étape 7: Calculer les points avec boosts en une seule requête optimisée
  const pointsWithBoosts = await calculatePointsForMultiplePlayers(playersForBoostCalculation);
  
    // Étape 8: Construire le leaderboard
    const allPlayers = clubProfiles.map(p => ({
      first_name: p.first_name || (p.display_name ? p.display_name.split(/\s+/)[0] : ""),
      last_name: p.last_name || (p.display_name ? p.display_name.split(/\s+/).slice(1).join(" ") : ""),
    }));

    const leaderboard: LeaderboardEntry[] = clubProfiles.map(profile => {
      const stats = playersStats.get(profile.id) || { wins: 0, losses: 0, matches: 0, winMatches: new Set() };
      const points = pointsWithBoosts.get(profile.id) || 0;

      const firstName = profile.first_name || (profile.display_name ? profile.display_name.split(/\s+/)[0] : "");
      const lastName = profile.last_name || (profile.display_name ? profile.display_name.split(/\s+/).slice(1).join(" ") : "");
      
      const displayName = getPlayerDisplayName(
        { first_name: firstName, last_name: lastName },
        allPlayers
      );
      
      return {
        rank: 0, // Sera recalculé après le tri
        user_id: profile.id,
        player_name: displayName,
        points,
        wins: stats.wins,
        losses: stats.losses,
        matches: stats.matches,
        badges: [],
        isGuest: false,
        avatar_url: profile.avatar_url || null,
      };
    });

    // Trier par points décroissants, puis par nom alphabétiquement pour les ex-aequo
    const sortedLeaderboard = leaderboard
    .sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return a.player_name.localeCompare(b.player_name);
    })
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

  logger.info("[calculatePlayerLeaderboard] Leaderboard calculated", { 
      count: sortedLeaderboard.length,
      samplePlayer: sortedLeaderboard[0] ? {
        name: sortedLeaderboard[0].player_name,
        points: sortedLeaderboard[0].points,
        wins: sortedLeaderboard[0].wins,
        losses: sortedLeaderboard[0].losses,
        matches: sortedLeaderboard[0].matches
      } : 'no players'
    });

    return sortedLeaderboard;
  } catch (error) {
    logger.error("[calculatePlayerLeaderboard] Unexpected error", { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}
