import { createClient as createAdminClient } from "@supabase/supabase-js";
import { filterMatchesByDailyLimit, filterMatchesByDailyLimitPerUser } from "./match-limit-utils";
import { MAX_MATCHES_PER_DAY } from "@/lib/match-constants";
import { calculatePointsForMultiplePlayers } from "./boost-points-utils";
import { getPlayerDisplayName } from "./player-utils";
import { logger, logError } from "@/lib/logger";
import { cacheGet, cacheSet } from '@/lib/cache/redis';

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
 * Calcule le leaderboard avec exactement la même logique que la page profil du compte joueur
 * Cette fonction reproduit fidèlement toute la logique de calcul de app/(protected)/home/page.tsx
 * @param clubId - ID du club
 * @returns Le leaderboard avec les top joueurs et toutes les statistiques identiques à la page profil
 */
export async function calculatePlayerLeaderboard(clubId: string | null): Promise<LeaderboardEntry[]> {
  if (!clubId || !supabaseAdmin) {
    if (!supabaseAdmin) {
      logger.warn("[calculatePlayerLeaderboard] Supabase admin client not configured");
    }
    return [];
  }

  // Essayer de récupérer depuis le cache
  try {
    const cacheKey = `leaderboard:${clubId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      logger.info("[calculatePlayerLeaderboard] Returning cached leaderboard", { clubId: clubId.substring(0, 8) + "..." });
      return cached as LeaderboardEntry[];
    }
  } catch (error) {
    // Si le cache échoue, continuer normalement
    logger.warn("[calculatePlayerLeaderboard] Cache read failed, continuing without cache", { error: error instanceof Error ? error.message : String(error) });
  }

  // Étape 1: Récupérer tous les participants sans jointure
  // IMPORTANT: Filtrer pour ne compter que les matchs où player_type = 'user'
  const { data: participantsData, error: participantsError } = await supabaseAdmin
    .from("match_participants")
    .select("user_id, player_type, guest_player_id, team, match_id")
    .eq("player_type", "user");
  
  if (participantsError) {
    logger.error("[calculatePlayerLeaderboard] Error fetching match participants", {
      message: participantsError.message,
      details: participantsError.details,
      hint: participantsError.hint,
      code: participantsError.code,
    });
    return [];
  }
  
  logger.info("[calculatePlayerLeaderboard] Total participants fetched", { count: participantsData?.length || 0 });
  
  // Étape 2: Récupérer tous les matchs uniques
  const allParticipants = participantsData || [];
  const uniqueMatchIds = [...new Set(allParticipants.map((p: any) => p.match_id))];
  logger.info("[calculatePlayerLeaderboard] Unique matches found", { count: uniqueMatchIds.length });
  
  // Récupérer les données des matchs
  const matchesMap = new Map<string, { winner_team_id: string; team1_id: string; team2_id: string; created_at: string; played_at: string }>();
  
  if (uniqueMatchIds.length > 0) {
    const { data: matchesData, error: matchesError } = await supabaseAdmin
      .from("matches")
      .select("id, winner_team_id, team1_id, team2_id, created_at, played_at")
      .in("id", uniqueMatchIds);
    
    if (matchesError) {
      logger.error("[calculatePlayerLeaderboard] Error fetching matches", {
        message: matchesError.message,
        details: matchesError.details,
        hint: matchesError.hint,
        code: matchesError.code,
      });
    } else if (matchesData) {
      matchesData.forEach((m: any) => {
        matchesMap.set(m.id, {
          winner_team_id: m.winner_team_id,
          team1_id: m.team1_id,
          team2_id: m.team2_id,
          created_at: m.created_at,
          played_at: m.played_at || m.created_at,
        });
      });
      logger.info("[calculatePlayerLeaderboard] Matches loaded", { count: matchesData.length });
    }
  }
  
  // Filtrer les matchs selon la limite quotidienne de 2 matchs par jour pour chaque joueur
  const validMatchIdsForPointsByUser = filterMatchesByDailyLimitPerUser(
    allParticipants.filter(p => p.player_type === "user" && p.user_id).map(p => ({ 
      match_id: p.match_id, 
      user_id: p.user_id 
    })),
    Array.from(matchesMap.entries()).map(([id, match]) => ({ 
      id, 
      played_at: match.played_at || match.created_at 
    })),
    MAX_MATCHES_PER_DAY
  );
  
  logger.info("[calculatePlayerLeaderboard] Valid matches for points per user (after daily limit)");
  
  // Récupérer les profils
  const userIds = [...new Set(allParticipants.filter(p => p.player_type === "user" && p.user_id).map(p => p.user_id))];
  
  const profilesMap = new Map<string, string>();
  const profilesFirstNameMap = new Map<string, string>();
  const profilesLastNameMap = new Map<string, string>();
  
  if (userIds.length > 0) {
    let profilesQuery = supabaseAdmin
      .from("profiles")
      .select("id, display_name, first_name, last_name, club_id")
      .in("id", userIds);
    
    // Filtrer par club_id
    if (clubId) {
      profilesQuery = profilesQuery.eq("club_id", clubId);
    }
    
    const { data: profiles, error: profilesError } = await profilesQuery;
    
    if (profilesError) {
      const errorDetails: Record<string, any> = {};
      if (profilesError.message) errorDetails.message = profilesError.message;
      if (profilesError.details) errorDetails.details = profilesError.details;
      if (profilesError.hint) errorDetails.hint = profilesError.hint;
      if (profilesError.code) errorDetails.code = profilesError.code;
      logger.error("[calculatePlayerLeaderboard] Error fetching profiles", errorDetails);
    } else if (profiles) {
      profiles.forEach(p => {
        profilesMap.set(p.id, p.display_name || "");
        if (p.first_name) {
          profilesFirstNameMap.set(p.id, p.first_name);
        } else if (p.display_name) {
          const nameParts = p.display_name.trim().split(/\s+/);
          profilesFirstNameMap.set(p.id, nameParts[0] || "");
        }
        if (p.last_name) {
          profilesLastNameMap.set(p.id, p.last_name);
        } else if (p.display_name) {
          const nameParts = p.display_name.trim().split(/\s+/);
          profilesLastNameMap.set(p.id, nameParts.slice(1).join(" ") || "");
        }
      });
      logger.info("[calculatePlayerLeaderboard] Profiles loaded", { count: profiles.length });
    }
  }
  
  // Créer un Set des userIds valides (du même club)
  const validUserIds = new Set(profilesMap.keys());
  
  logger.info("[calculatePlayerLeaderboard] Valid user IDs (same club)", { count: validUserIds.size });
  
  // Filtrer les participants pour ne garder que ceux du même club
  const filteredParticipants = clubId 
    ? allParticipants.filter((p: any) => {
        if (p.player_type === "user" && p.user_id) {
          return validUserIds.has(p.user_id);
        }
        return p.player_type === "guest"; // Garder les guests
      })
    : allParticipants;
  
  logger.info("[calculatePlayerLeaderboard] Participants after club filtering", { count: filteredParticipants.length });
  
  // Filtrer les matchs : ne garder que ceux où TOUS les participants users appartiennent au même club
  const participantsByMatch = filteredParticipants.reduce((acc: Record<string, any[]>, p: any) => {
    if (!acc[p.match_id]) {
      acc[p.match_id] = [];
    }
    acc[p.match_id].push(p);
    return acc;
  }, {});
  
  const validMatchIds = new Set<string>();
  Object.entries(participantsByMatch).forEach(([matchId, participants]: [string, any[]]) => {
    const userParticipants = participants.filter((p: any) => p.player_type === "user" && p.user_id);
    const allUsersInSameClub = userParticipants.every((p: any) => validUserIds.has(p.user_id));
    
    if (allUsersInSameClub) {
      validMatchIds.add(matchId);
    }
  });
  
  logger.info("[calculatePlayerLeaderboard] Valid matches (all users in same club)", { count: validMatchIds.size });
  
  // Filtrer les participants pour ne garder que ceux des matchs valides (même club) ET qui respectent la limite quotidienne
  // IMPORTANT: Quand un joueur a atteint sa limite de matchs de la journée (2 matchs),
  // les matchs suivants sont exclus du calcul des points.
  // Cela signifie que NI les victoires NI les défaites ne comptent pour les matchs qui dépassent la limite.
  const finalFilteredParticipants = filteredParticipants.filter((p: any) => {
    const isValidForClub = validMatchIds.has(p.match_id);
    if (p.player_type === "user" && p.user_id) {
      const allowedMatches = validMatchIdsForPointsByUser.get(p.user_id);
      const isValidForDailyLimit = allowedMatches ? allowedMatches.has(p.match_id) : false;
      // Si le match dépasse la limite quotidienne pour CE joueur, il est exclu
      return isValidForClub && isValidForDailyLimit;
    }
    return isValidForClub;
  });
  
  logger.info("[calculatePlayerLeaderboard] Participants after match filtering (club + daily limit)", { count: finalFilteredParticipants.length });
  logger.info("[calculatePlayerLeaderboard] Matches excluded due to daily limit", { count: filteredParticipants.length - finalFilteredParticipants.length });
  
  // Enrichir les participants filtrés avec les données des matchs
  const agg = finalFilteredParticipants.map((p: any) => ({
    ...p,
    matches: matchesMap.get(p.match_id) || null,
  }));

  const byPlayer: Record<string, { 
    name: string; 
    wins: number; 
    losses: number; 
    matches: number; 
    isGuest: boolean;
    playerId: string;
  }> = {};
  
  // Créer des Maps pour tracker les matchs gagnés par joueur (nécessaire pour le calcul de boosts)
  const winMatchesByPlayer = new Map<string, Set<string>>();

  agg.forEach((row: any) => {
    if (!row.matches || !row.matches.winner_team_id || !row.matches.team1_id || !row.matches.team2_id) {
      return;
    }
    
    const winner_team = row.matches.winner_team_id === row.matches.team1_id ? 1 : 2;
    const win = winner_team === row.team;
    const isGuest = row.player_type === "guest";
    
    let playerId: string;
    
    if (isGuest && row.guest_player_id) {
      playerId = 'guest_' + row.guest_player_id;
    } else if (row.user_id) {
      playerId = row.user_id;
    } else {
      return;
    }
    
    if (!byPlayer[playerId]) {
      byPlayer[playerId] = { 
        name: "",
        wins: 0, 
        losses: 0, 
        matches: 0,
        isGuest,
        playerId
      };
      if (!isGuest) {
        winMatchesByPlayer.set(playerId, new Set());
      }
    }
    byPlayer[playerId].matches += 1;
    if (win) {
      byPlayer[playerId].wins += 1;
      if (!isGuest && row.match_id) {
        const winMatches = winMatchesByPlayer.get(playerId);
        if (winMatches) {
          winMatches.add(row.match_id);
        }
      }
    } else {
      byPlayer[playerId].losses += 1;
    }
  });
  
  logger.info("[calculatePlayerLeaderboard] Players aggregated", { count: Object.keys(byPlayer).length });
  
  // Récupérer les guest players
  const allGuestIds = [...new Set(Object.keys(byPlayer).filter(id => id.startsWith("guest_")).map(id => id.replace("guest_", "")))];
  
  const guestsMap = new Map<string, { first_name: string; last_name: string }>();
  if (allGuestIds.length > 0) {
    const { data: guests, error: guestsError } = await supabaseAdmin
      .from("guest_players")
      .select("id, first_name, last_name")
      .in("id", allGuestIds);
    
    if (guestsError) {
      logger.error("[calculatePlayerLeaderboard] Error fetching guest players", { error: guestsError.message });
    } else if (guests) {
      guests.forEach(g => guestsMap.set(g.id, { first_name: g.first_name, last_name: g.last_name }));
    }
  }
  
  // Assigner les noms aux joueurs
  Object.keys(byPlayer).forEach(playerId => {
    if (byPlayer[playerId].isGuest) {
      const guestId = playerId.replace("guest_", "");
      const guest = guestsMap.get(guestId);
      byPlayer[playerId].name = guest ? (guest.first_name + " " + guest.last_name).trim() : "Joueur invité";
    } else {
      const firstName = profilesFirstNameMap.get(playerId);
      const lastName = profilesLastNameMap.get(playerId);
      if (firstName) {
        byPlayer[playerId].name = (firstName + (lastName ? " " + lastName : "")).trim();
      } else {
        const displayName = profilesMap.get(playerId);
        byPlayer[playerId].name = displayName || "Joueur";
      }
    }
  });
  
  // Bonus premier avis: +10 points pour les users ayant au moins un avis valide
  // Un avis est valide si rating > 3 OU (rating <= 3 ET words > 6)
  const bonusMap = new Map<string, number>();
  {
    const userIdsForBonus = Object.keys(byPlayer).filter(id => !id.startsWith("guest_") && byPlayer[id].isGuest === false);
    if (userIdsForBonus.length > 0) {
      const { data: reviewers } = await supabaseAdmin
        .from("reviews")
        .select("user_id, rating, comment")
        .in("user_id", userIdsForBonus);
      
      // Créer un map pour vérifier si chaque utilisateur a au moins un avis valide
      const usersWithValidReview = new Set<string>();
      
      if (reviewers && reviewers.length > 0) {
        // Importer la fonction utilitaire
        const { isReviewValidForBonus } = await import("./review-utils");
        
        reviewers.forEach((r: any) => {
          if (isReviewValidForBonus(r.rating || 0, r.comment || null)) {
            usersWithValidReview.add(r.user_id);
          }
        });
      }
      
      userIdsForBonus.forEach(uid => {
        if (usersWithValidReview.has(uid)) bonusMap.set(uid, 10);
      });
    }
  }

  // Récupérer les points de challenges pour tous les joueurs ET tous les profils du club
  const challengePointsMap = new Map<string, number>();
  const allClubProfilesMap = new Map<string, { display_name: string; first_name: string | null; last_name: string | null; points: number }>();
  
  // Récupérer tous les profils du club (pas seulement ceux avec des matchs)
  if (clubId) {
    const { data: allClubProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, first_name, last_name, points")
      .eq("club_id", clubId);
    
    if (allClubProfiles) {
      allClubProfiles.forEach((p: any) => {
        const challengePoints = typeof p.points === 'number' 
          ? p.points 
          : (typeof p.points === 'string' ? parseInt(p.points, 10) || 0 : 0);
        challengePointsMap.set(p.id, challengePoints);
        allClubProfilesMap.set(p.id, {
          display_name: p.display_name || "",
          first_name: p.first_name || null,
          last_name: p.last_name || null,
          points: challengePoints,
        });
      });
    }
  } else {
    // Si pas de clubId, récupérer les points pour les joueurs avec matchs seulement
    const userIdsForChallenges = Object.keys(byPlayer).filter(id => !id.startsWith("guest_") && byPlayer[id].isGuest === false);
    if (userIdsForChallenges.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name, first_name, last_name, points")
        .in("id", userIdsForChallenges);
      
      (profiles || []).forEach((p: any) => {
        const challengePoints = typeof p.points === 'number' 
          ? p.points 
          : (typeof p.points === 'string' ? parseInt(p.points, 10) || 0 : 0);
        challengePointsMap.set(p.id, challengePoints);
        allClubProfilesMap.set(p.id, {
          display_name: p.display_name || "",
          first_name: p.first_name || null,
          last_name: p.last_name || null,
          points: challengePoints,
        });
      });
    }
  }

  // Préparer les données pour le calcul de points avec boosts
  // Créer allPlayers à partir de tous les profils du club, pas seulement ceux avec matchs
  const allPlayers = Array.from(allClubProfilesMap.values()).map(p => ({
    first_name: p.first_name || (p.display_name ? p.display_name.split(/\s+/)[0] : ""),
    last_name: p.last_name || (p.display_name ? p.display_name.split(/\s+/).slice(1).join(" ") : ""),
  }));

  const playersForBoostCalculation = Object.entries(byPlayer)
    .filter(([playerId, s]) => {
      if (playerId.startsWith("guest_")) return false;
      if (clubId) {
        return validUserIds.has(playerId);
      }
      return true;
    })
    .map(([playerId, s]) => {
      const winMatches = winMatchesByPlayer.get(playerId) || new Set<string>();
      const bonus = bonusMap.get(playerId) || 0;
      const challengePoints = challengePointsMap.get(playerId) || 0;
      
      return {
        userId: playerId,
        wins: s.wins,
        losses: s.losses,
        winMatches,
        bonus,
        challengePoints,
      };
    });

  // Calculer les points avec boosts en une seule requête optimisée
  const pointsWithBoosts = await calculatePointsForMultiplePlayers(playersForBoostCalculation);
  
  logger.info("[calculatePlayerLeaderboard] Points with boosts calculated");
  
  // Construire le leaderboard (uniquement les joueurs du même club)
  const leaderboard = Object.entries(byPlayer)
    .filter(([playerId, s]) => {
      if (playerId.startsWith("guest_")) return false;
      if (clubId) {
        return validUserIds.has(playerId);
      }
      return true;
    })
    .map(([playerId, s]) => {
      const displayName = getPlayerDisplayName(
        { first_name: s.name.split(/\s+/).slice(0,1)[0] || "", last_name: s.name.split(/\s+/).slice(1).join(" ") || "" },
        allPlayers
      );
      
      const pointsFromBoosts = pointsWithBoosts.get(playerId);
      let totalPoints: number;
      if (pointsFromBoosts !== undefined) {
        totalPoints = typeof pointsFromBoosts === 'number' ? pointsFromBoosts : (typeof pointsFromBoosts === 'string' ? parseInt(String(pointsFromBoosts), 10) || 0 : 0);
      } else {
        const winsNum = typeof s.wins === 'number' ? s.wins : (typeof s.wins === 'string' ? parseInt(String(s.wins), 10) || 0 : 0);
        const lossesNum = typeof s.losses === 'number' ? s.losses : (typeof s.losses === 'string' ? parseInt(String(s.losses), 10) || 0 : 0);
        const bonusNum = typeof (bonusMap.get(playerId) || 0) === 'number' ? (bonusMap.get(playerId) || 0) : (typeof (bonusMap.get(playerId) || 0) === 'string' ? parseInt(String(bonusMap.get(playerId) || 0), 10) || 0 : 0);
        const challengePointsNum = typeof (challengePointsMap.get(playerId) || 0) === 'number' ? (challengePointsMap.get(playerId) || 0) : (typeof (challengePointsMap.get(playerId) || 0) === 'string' ? parseInt(String(challengePointsMap.get(playerId) || 0), 10) || 0 : 0);
        totalPoints = winsNum * 10 + lossesNum * 3 + bonusNum + challengePointsNum;
      }
      
      return {
        rank: 0,
        user_id: playerId,
        player_name: displayName,
        points: totalPoints,
        wins: s.wins,
        losses: s.losses,
        matches: s.matches,
        badges: [],
        isGuest: s.isGuest,
      };
    });

  // Ajouter TOUS les joueurs du club qui n'ont pas encore de matchs (même avec 0 points)
  // Cela permet d'afficher les joueurs dès leur inscription, même s'ils n'ont pas encore joué
  const playersWithNoMatches: LeaderboardEntry[] = [];
  
  if (clubId && allClubProfilesMap.size > 0) {
    // Récupérer tous les joueurs qui ont déjà un avis (pour le bonus de 10 points)
    const allProfileIds = Array.from(allClubProfilesMap.keys());
    const { data: allReviews } = await supabaseAdmin
      .from("reviews")
      .select("user_id")
      .in("user_id", allProfileIds);
    
    const hasReview = new Set((allReviews || []).map((r: any) => r.user_id));
    
    // Créer un Set des joueurs déjà dans le leaderboard
    const playersInLeaderboard = new Set(leaderboard.map(p => p.user_id));
    
    allClubProfilesMap.forEach((profile, playerId) => {
      // Vérifier si le joueur n'est pas déjà dans le leaderboard
      if (!playersInLeaderboard.has(playerId)) {
        // Calculer les points (peut être 0 pour les nouveaux joueurs)
        const challengePoints = profile.points;
        const bonus = hasReview.has(playerId) ? 10 : 0;
        const totalPoints = challengePoints + bonus;
        
        // Ajouter TOUS les joueurs au leaderboard, même avec 0 points
        const firstName = profile.first_name || (profile.display_name ? profile.display_name.split(/\s+/)[0] : "");
        const lastName = profile.last_name || (profile.display_name ? profile.display_name.split(/\s+/).slice(1).join(" ") : "");
        const displayName = getPlayerDisplayName(
          { first_name: firstName, last_name: lastName },
          allPlayers
        );
        
        playersWithNoMatches.push({
          rank: 0,
          user_id: playerId,
          player_name: displayName,
          points: totalPoints,
          wins: 0,
          losses: 0,
          matches: 0,
          badges: [],
          isGuest: false,
        });
      }
    });
  }
  
  // Fusionner le leaderboard avec TOUS les joueurs sans matchs (même avec 0 points)
  const finalLeaderboard = [
    ...leaderboard,
    ...playersWithNoMatches
  ]
    .sort((a, b) => {
      // Trier par points décroissants, puis par nom alphabétiquement pour les ex-aequo
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return a.player_name.localeCompare(b.player_name);
    })
    .map((r, idx) => ({ ...r, rank: idx + 1 }));

  logger.info("[calculatePlayerLeaderboard] Leaderboard calculated", { 
    totalPlayers: finalLeaderboard.length, 
    playersWithNoMatches: playersWithNoMatches.length 
  });

  // Sauvegarder dans le cache (TTL 5 minutes)
  try {
    const cacheKey = `leaderboard:${clubId}`;
    await cacheSet(cacheKey, finalLeaderboard, 300);
    logger.info("[calculatePlayerLeaderboard] Leaderboard cached", { clubId: clubId.substring(0, 8) + "..." });
  } catch (error) {
    // Si le cache échoue, ignorer et continuer
    logger.warn("[calculatePlayerLeaderboard] Cache write failed, continuing without cache", { error: error instanceof Error ? error.message : String(error) });
  }

  return finalLeaderboard;
}