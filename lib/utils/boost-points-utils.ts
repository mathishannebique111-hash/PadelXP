/**
 * Utilitaires pour calculer les points avec les boosts
 */

import { createClient as createAdminClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

/**
 * Helper pour logger les erreurs Supabase de manière sécurisée
 */
function logSupabaseError(context: string, error: any) {
  // Extraire les propriétés de l'erreur de manière sécurisée
  const errorDetails: Record<string, any> = {};
  if (error?.message) errorDetails.message = error.message;
  if (error?.details) errorDetails.details = error.details;
  if (error?.hint) errorDetails.hint = error.hint;
  if (error?.code) errorDetails.code = error.code;
  
  // Si aucune propriété standard n'est trouvée, logger des informations de debug
  if (Object.keys(errorDetails).length === 0) {
    const allKeys = error && typeof error === 'object' ? Object.keys(error) : [];
    const errorType = typeof error;
    const errorString = String(error);
    const errorJson = JSON.stringify(error);
    
    console.error(`[boost-points-utils] ${context} (no standard properties):`, {
      type: errorType,
      keys: allKeys,
      stringRepresentation: errorString !== "[object Object]" ? errorString : undefined,
      jsonRepresentation: errorJson !== "{}" ? errorJson : undefined,
      rawError: allKeys.length > 0 ? error : undefined
    });
  } else {
    console.error(`[boost-points-utils] ${context}:`, errorDetails);
  }
}

/**
 * Récupère les points boostés pour chaque match d'un joueur
 * Retourne un Map<match_id, points_after_boost>
 */
export async function getBoostedPointsForMatches(
  matchIds: string[],
  userId: string
): Promise<Map<string, number>> {
  const boostedPointsMap = new Map<string, number>();

  if (!supabaseAdmin || matchIds.length === 0) {
    return boostedPointsMap;
  }

  try {
    // Récupérer les utilisations de boost pour ce joueur et ces matchs
    const { data: boostUses, error } = await supabaseAdmin
      .from("player_boost_uses")
      .select("match_id, points_after_boost")
      .eq("user_id", userId)
      .in("match_id", matchIds);

    if (error) {
      logSupabaseError("Error fetching boost uses", error);
      return boostedPointsMap;
    }

    if (boostUses) {
      boostUses.forEach((boostUse: any) => {
        boostedPointsMap.set(boostUse.match_id, boostUse.points_after_boost);
      });
    }
  } catch (error) {
    console.error("[boost-points-utils] Exception fetching boost uses:", error);
  }

  return boostedPointsMap;
}

/**
 * Calcule les points pour un joueur en tenant compte des boosts
 * @param wins - Nombre de victoires
 * @param losses - Nombre de défaites
 * @param matchIds - IDs des matchs du joueur (dans l'ordre)
 * @param winMatches - IDs des matchs gagnés (Set)
 * @param userId - ID de l'utilisateur
 * @param bonus - Bonus additionnel (ex: avis)
 * @param challengePoints - Points de challenges
 * @returns Points totaux calculés avec les boosts
 */
export async function calculatePointsWithBoosts(
  wins: number,
  losses: number,
  matchIds: string[],
  winMatches: Set<string>,
  userId: string,
  bonus: number = 0,
  challengePoints: number = 0
): Promise<number> {
  // S'assurer que tous les paramètres sont des nombres
  const winsNum = typeof wins === 'number' ? wins : (typeof wins === 'string' ? parseInt(String(wins), 10) || 0 : 0);
  const lossesNum = typeof losses === 'number' ? losses : (typeof losses === 'string' ? parseInt(String(losses), 10) || 0 : 0);
  const bonusNum = typeof bonus === 'number' ? bonus : (typeof bonus === 'string' ? parseInt(String(bonus), 10) || 0 : 0);
  const challengePointsNum = typeof challengePoints === 'number' ? challengePoints : (typeof challengePoints === 'string' ? parseInt(String(challengePoints), 10) || 0 : 0);
  
  // Points de base : victoires * 10 + défaites * 3
  let basePoints = winsNum * 10 + lossesNum * 3;

  // Récupérer les points boostés pour les matchs gagnés
  const boostedPointsMap = await getBoostedPointsForMatches(
    Array.from(winMatches),
    userId
  );

  // Calculer le bonus total des boosts
  let boostBonus = 0;
  boostedPointsMap.forEach((pointsAfterBoost, matchId) => {
    // Points normaux pour une victoire : 10
    // Points avec boost : points_after_boost (généralement 13)
    // Bonus = points_after_boost - 10
    const matchBoostBonus = typeof pointsAfterBoost === 'number' ? (pointsAfterBoost - 10) : 0;
    boostBonus += matchBoostBonus;
  });

  // Points totaux = points de base + bonus de boosts + bonus + challengePoints
  const totalPoints = basePoints + boostBonus + bonusNum + challengePointsNum;
  console.log(`[boost-points-utils] calculatePointsWithBoosts for ${userId.substring(0, 8)}: basePoints=${basePoints}, boostBonus=${boostBonus}, bonus=${bonusNum}, challengePoints=${challengePointsNum}, total=${totalPoints}`);
  return totalPoints;
}

/**
 * Calcule les points pour plusieurs joueurs en une seule requête (optimisation)
 * @param playersData - Array de { userId, wins, losses, matchIds, winMatches, bonus, challengePoints }
 * @returns Map<userId, totalPoints>
 */
export async function calculatePointsForMultiplePlayers(
  playersData: Array<{
    userId: string;
    wins: number;
    losses: number;
    winMatches: Set<string>;
    bonus: number;
    challengePoints: number;
  }>
): Promise<Map<string, number>> {
  const results = new Map<string, number>();

  if (!supabaseAdmin || playersData.length === 0) {
    // Calculer les points sans boost si pas d'admin client
    playersData.forEach(({ userId, wins, losses, bonus, challengePoints }) => {
      // S'assurer que tous les paramètres sont des nombres
      const winsNum = typeof wins === 'number' ? wins : (typeof wins === 'string' ? parseInt(String(wins), 10) || 0 : 0);
      const lossesNum = typeof losses === 'number' ? losses : (typeof losses === 'string' ? parseInt(String(losses), 10) || 0 : 0);
      const bonusNum = typeof bonus === 'number' ? bonus : (typeof bonus === 'string' ? parseInt(String(bonus), 10) || 0 : 0);
      const challengePointsNum = typeof challengePoints === 'number' ? challengePoints : (typeof challengePoints === 'string' ? parseInt(String(challengePoints), 10) || 0 : 0);
      
      const basePoints = winsNum * 10 + lossesNum * 3;
      results.set(userId, basePoints + bonusNum + challengePointsNum);
    });
    return results;
  }

  try {
    // Collecter tous les match IDs et user IDs
    const allMatchIds = new Set<string>();
    const userIds = playersData.map(p => p.userId);
    
    playersData.forEach(({ winMatches }) => {
      winMatches.forEach(matchId => allMatchIds.add(matchId));
    });

    // Si aucun match ID ou user ID, calculer sans boost
    if (allMatchIds.size === 0 || userIds.length === 0) {
      playersData.forEach(({ userId, wins, losses, bonus, challengePoints }) => {
        // S'assurer que tous les paramètres sont des nombres
        const winsNum = typeof wins === 'number' ? wins : (typeof wins === 'string' ? parseInt(String(wins), 10) || 0 : 0);
        const lossesNum = typeof losses === 'number' ? losses : (typeof losses === 'string' ? parseInt(String(losses), 10) || 0 : 0);
        const bonusNum = typeof bonus === 'number' ? bonus : (typeof bonus === 'string' ? parseInt(String(bonus), 10) || 0 : 0);
        const challengePointsNum = typeof challengePoints === 'number' ? challengePoints : (typeof challengePoints === 'string' ? parseInt(String(challengePoints), 10) || 0 : 0);
        
        const basePoints = winsNum * 10 + lossesNum * 3;
        results.set(userId, basePoints + bonusNum + challengePointsNum);
      });
      return results;
    }

    // Récupérer TOUS les boosts pour les joueurs concernés (sans filtrer par match_id)
    // Cela garantit que même les boosts sur des matchs récemment créés sont trouvés
    console.log(`[boost-points-utils] Fetching boosts for ${userIds.length} users and ${allMatchIds.size} match IDs`);
    const { data: allBoostUses, error } = await supabaseAdmin
      .from("player_boost_uses")
      .select("user_id, match_id, points_after_boost, applied_at")
      .in("user_id", userIds);

    if (error) {
      logSupabaseError("Error fetching boost uses for multiple players", error);
      // Fallback : calculer sans boost
      playersData.forEach(({ userId, wins, losses, bonus, challengePoints }) => {
        // S'assurer que tous les paramètres sont des nombres
        const winsNum = typeof wins === 'number' ? wins : (typeof wins === 'string' ? parseInt(String(wins), 10) || 0 : 0);
        const lossesNum = typeof losses === 'number' ? losses : (typeof losses === 'string' ? parseInt(String(losses), 10) || 0 : 0);
        const bonusNum = typeof bonus === 'number' ? bonus : (typeof bonus === 'string' ? parseInt(String(bonus), 10) || 0 : 0);
        const challengePointsNum = typeof challengePoints === 'number' ? challengePoints : (typeof challengePoints === 'string' ? parseInt(String(challengePoints), 10) || 0 : 0);
        
        const basePoints = winsNum * 10 + lossesNum * 3;
        results.set(userId, basePoints + bonusNum + challengePointsNum);
      });
      return results;
    }

    // Filtrer les boosts pour ne garder que ceux sur des matchs gagnés (dans allMatchIds)
    const filteredBoostUses = allBoostUses?.filter(boostUse => 
      allMatchIds.has(boostUse.match_id)
    ) || [];

    console.log(`[boost-points-utils] Found ${allBoostUses?.length || 0} total boosts, ${filteredBoostUses.length} for win matches`);

    // Organiser les boosts par utilisateur et par match (seulement ceux sur des matchs gagnés)
    const boostsByUser = new Map<string, Map<string, number>>();
    if (filteredBoostUses && filteredBoostUses.length > 0) {
      console.log(`[boost-points-utils] Found ${filteredBoostUses.length} boost uses in database for win matches:`, filteredBoostUses.map(b => ({
        user_id: b.user_id?.substring(0, 8),
        match_id: b.match_id?.substring(0, 8),
        points_after_boost: b.points_after_boost,
        applied_at: b.applied_at
      })));
      filteredBoostUses.forEach((boostUse: any) => {
        if (!boostsByUser.has(boostUse.user_id)) {
          boostsByUser.set(boostUse.user_id, new Map());
        }
        boostsByUser.get(boostUse.user_id)!.set(boostUse.match_id, boostUse.points_after_boost);
      });
    } else {
      console.log(`[boost-points-utils] No boost uses found in database for ${userIds.length} users and ${allMatchIds.size} win matches`);
      if (allBoostUses && allBoostUses.length > 0) {
        console.log(`[boost-points-utils] ⚠️ Found ${allBoostUses.length} boosts total, but none match win matches:`, allBoostUses.map(b => ({
          user_id: b.user_id?.substring(0, 8),
          match_id: b.match_id?.substring(0, 8),
          points_after_boost: b.points_after_boost
        })));
        console.log(`[boost-points-utils] Win match IDs:`, Array.from(allMatchIds).map(id => id.substring(0, 8)));
      }
    }

    // Calculer les points pour chaque joueur
    playersData.forEach(({ userId, wins, losses, winMatches, bonus, challengePoints }) => {
      // S'assurer que tous les paramètres sont des nombres
      const winsNum = typeof wins === 'number' ? wins : (typeof wins === 'string' ? parseInt(String(wins), 10) || 0 : 0);
      const lossesNum = typeof losses === 'number' ? losses : (typeof losses === 'string' ? parseInt(String(losses), 10) || 0 : 0);
      const bonusNum = typeof bonus === 'number' ? bonus : (typeof bonus === 'string' ? parseInt(String(bonus), 10) || 0 : 0);
      const challengePointsNum = typeof challengePoints === 'number' ? challengePoints : (typeof challengePoints === 'string' ? parseInt(String(challengePoints), 10) || 0 : 0);
      
      const basePoints = winsNum * 10 + lossesNum * 3;
      
      // Calculer le bonus des boosts pour ce joueur
      let boostBonus = 0;
      const userBoosts = boostsByUser.get(userId);
      if (userBoosts) {
        winMatches.forEach(matchId => {
          const pointsAfterBoost = userBoosts.get(matchId);
          if (pointsAfterBoost && typeof pointsAfterBoost === 'number') {
            // Points normaux pour une victoire : 10
            // Bonus = points_after_boost - 10
            const matchBoost = pointsAfterBoost - 10;
            boostBonus += matchBoost;
            console.log(`[boost-points-utils] Boost found for user ${userId.substring(0, 8)} match ${matchId.substring(0, 8)}: ${pointsAfterBoost} points (bonus: +${matchBoost})`);
          }
        });
      } else {
        if (winMatches.size > 0) {
          console.log(`[boost-points-utils] No boosts found for user ${userId.substring(0, 8)} with ${winMatches.size} win matches`);
        }
      }

      const totalPoints = basePoints + boostBonus + bonusNum + challengePointsNum;
      console.log(`[boost-points-utils] Total points for user ${userId.substring(0, 8)}: basePoints=${basePoints}, boostBonus=${boostBonus}, bonus=${bonusNum}, challengePoints=${challengePointsNum}, total=${totalPoints}`);
      results.set(userId, totalPoints);
    });
  } catch (error) {
    console.error("[boost-points-utils] Exception calculating points:", error);
    // Fallback : calculer sans boost
    playersData.forEach(({ userId, wins, losses, bonus, challengePoints }) => {
      // S'assurer que tous les paramètres sont des nombres
      const winsNum = typeof wins === 'number' ? wins : (typeof wins === 'string' ? parseInt(String(wins), 10) || 0 : 0);
      const lossesNum = typeof losses === 'number' ? losses : (typeof losses === 'string' ? parseInt(String(losses), 10) || 0 : 0);
      const bonusNum = typeof bonus === 'number' ? bonus : (typeof bonus === 'string' ? parseInt(String(bonus), 10) || 0 : 0);
      const challengePointsNum = typeof challengePoints === 'number' ? challengePoints : (typeof challengePoints === 'string' ? parseInt(String(challengePoints), 10) || 0 : 0);
      
      const basePoints = winsNum * 10 + lossesNum * 3;
      results.set(userId, basePoints + bonusNum + challengePointsNum);
    });
  }

  return results;
}


