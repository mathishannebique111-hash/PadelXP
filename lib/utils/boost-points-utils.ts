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
    console.log(`[boost-points-utils] Fetching boost uses for user ${userId.substring(0, 8)} and ${matchIds.length} matches`);
    console.log(`[boost-points-utils] Match IDs to check:`, matchIds.slice(0, 5).map(id => id.substring(0, 8)), matchIds.length > 5 ? '...' : '');
    
    // IMPORTANT: Utiliser .in() avec la liste complète des match IDs
    // Si la liste est vide, retourner une map vide
    if (matchIds.length === 0) {
      console.log(`[boost-points-utils] No match IDs provided, returning empty map`);
      return boostedPointsMap;
    }
    
    // Récupérer TOUS les boosts pour cet utilisateur d'abord (pour debug)
    const { data: allUserBoosts, error: allBoostsError } = await supabaseAdmin
      .from("player_boost_uses")
      .select("match_id, points_after_boost, points_before_boost, applied_at, user_id")
      .eq("user_id", userId)
      .order("applied_at", { ascending: false });
    
    if (allBoostsError) {
      console.error(`[boost-points-utils] Error fetching all boosts for user:`, allBoostsError);
    } else {
      console.log(`[boost-points-utils] All boosts for user ${userId.substring(0, 8)}:`, allUserBoosts?.length || 0, allUserBoosts?.slice(0, 5).map(b => ({
        match_id: b.match_id?.substring(0, 8),
        points_after: b.points_after_boost,
        applied_at: b.applied_at
      })) || []);
    }
    
    // Récupérer les boosts pour les matchs spécifiques
    // IMPORTANT: Utiliser une requête qui récupère TOUS les boosts de l'utilisateur, puis filtrer côté client
    // Cela évite les problèmes de timing avec .in() qui pourrait ne pas voir les boosts récemment enregistrés
    const { data: allUserBoostsForMatches, error: allBoostsError2 } = await supabaseAdmin
      .from("player_boost_uses")
      .select("match_id, points_after_boost, points_before_boost, applied_at")
      .eq("user_id", userId);
    
    if (allBoostsError2) {
      console.error(`[boost-points-utils] Error fetching all user boosts:`, allBoostsError2);
    }
    
    // Filtrer côté client pour ne garder que les boosts des matchs recherchés
    const matchIdsSet = new Set(matchIds);
    const boostUses = (allUserBoostsForMatches || []).filter((b: any) => matchIdsSet.has(b.match_id));
    
    console.log(`[boost-points-utils] Filtered ${boostUses.length} boosts from ${allUserBoostsForMatches?.length || 0} total user boosts for ${matchIds.length} match IDs`);
    
    // Si aucun boost trouvé, essayer une requête .in() classique en fallback
    if (boostUses.length === 0 && matchIds.length > 0) {
      console.log(`[boost-points-utils] ⚠️ No boosts found with filtered query, trying .in() query as fallback...`);
      const { data: boostUsesIn, error } = await supabaseAdmin
        .from("player_boost_uses")
        .select("match_id, points_after_boost, points_before_boost, applied_at")
        .eq("user_id", userId)
        .in("match_id", matchIds);
      
      if (error) {
        console.error(`[boost-points-utils] Error with .in() query:`, error);
      } else if (boostUsesIn && boostUsesIn.length > 0) {
        console.log(`[boost-points-utils] ✅ Found ${boostUsesIn.length} boosts with .in() query`);
        boostUses.push(...boostUsesIn);
      } else {
        console.log(`[boost-points-utils] ❌ No boosts found with .in() query either`);
        
        // Dernière tentative : vérifier individuellement chaque match
        for (const matchId of matchIds.slice(0, 3)) {
          const { data: singleBoost, error: singleError } = await supabaseAdmin
            .from("player_boost_uses")
            .select("match_id, points_after_boost, points_before_boost, applied_at")
            .eq("user_id", userId)
            .eq("match_id", matchId)
            .maybeSingle();
          
          if (singleError) {
            console.error(`[boost-points-utils] Error checking match ${matchId.substring(0, 8)}:`, singleError);
          } else if (singleBoost) {
            console.log(`[boost-points-utils] ✅ Found boost for match ${matchId.substring(0, 8)} with individual query:`, singleBoost);
            boostUses.push(singleBoost);
          } else {
            console.log(`[boost-points-utils] ❌ No boost found for match ${matchId.substring(0, 8)} with individual query`);
          }
        }
      }
    }
    
    const error = null; // Pas d'erreur car on utilise une approche différente

    if (error) {
      logSupabaseError("Error fetching boost uses", error);
      return boostedPointsMap;
    }

    if (boostUses && boostUses.length > 0) {
      console.log(`[boost-points-utils] ✅ Found ${boostUses.length} boost uses:`, boostUses.map(b => ({
        match_id: b.match_id?.substring(0, 8),
        points_before: b.points_before_boost,
        points_after: b.points_after_boost,
        applied_at: b.applied_at
      })));
      boostUses.forEach((boostUse: any) => {
        // S'assurer que points_after_boost est bien un nombre
        const pointsAfterBoost = typeof boostUse.points_after_boost === 'number' 
          ? boostUse.points_after_boost 
          : (typeof boostUse.points_after_boost === 'string' ? parseInt(String(boostUse.points_after_boost), 10) : null);
        
        if (pointsAfterBoost !== null && !isNaN(pointsAfterBoost)) {
          boostedPointsMap.set(boostUse.match_id, pointsAfterBoost);
          console.log(`[boost-points-utils] ✅ Added boost for match ${boostUse.match_id?.substring(0, 8)}: ${pointsAfterBoost} points`);
        } else {
          console.warn(`[boost-points-utils] ⚠️ Invalid points_after_boost for match ${boostUse.match_id?.substring(0, 8)}:`, boostUse.points_after_boost);
        }
      });
    } else {
      console.log(`[boost-points-utils] ❌ No boost uses found for user ${userId.substring(0, 8)} and ${matchIds.length} matches`);
      console.log(`[boost-points-utils] Match IDs searched:`, matchIds.map(id => id.substring(0, 8)));
      
      // Vérifier si le boost existe mais avec un match_id différent
      if (allUserBoosts && allUserBoosts.length > 0) {
        const allMatchIds = allUserBoosts.map(b => b.match_id);
        const searchedMatchIds = new Set(matchIds);
        const foundMatchIds = new Set(allMatchIds);
        const missingMatches = matchIds.filter(id => !foundMatchIds.has(id));
        const extraMatches = allMatchIds.filter(id => !searchedMatchIds.has(id));
        
        if (missingMatches.length > 0) {
          console.warn(`[boost-points-utils] ⚠️ Match IDs in search but not in boosts:`, missingMatches.map(id => id.substring(0, 8)));
        }
        if (extraMatches.length > 0) {
          console.warn(`[boost-points-utils] ⚠️ Match IDs in boosts but not in search:`, extraMatches.map(id => id.substring(0, 8)));
        }
      }
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
  // IMPORTANT: On calcule d'abord les points SANS boost, puis on ajoute le bonus des boosts
  let basePoints = winsNum * 10 + lossesNum * 3;

  // Récupérer les points boostés pour les matchs gagnés
  console.log(`[boost-points-utils] calculatePointsWithBoosts: userId=${userId.substring(0, 8)}, wins=${winsNum}, losses=${lossesNum}, winMatches=${winMatches.size}`);
  const boostedPointsMap = await getBoostedPointsForMatches(
    Array.from(winMatches),
    userId
  );

  // Calculer le bonus total des boosts
  // Pour chaque match boosté, on remplace les 10 points de base par les points boostés (13)
  // Donc bonus = (points_after_boost - 10) pour chaque match boosté
  let boostBonus = 0;
  console.log(`[boost-points-utils] Calculating boost bonus from ${boostedPointsMap.size} boosted matches out of ${winMatches.size} total win matches`);
  
  if (boostedPointsMap.size > 0) {
    console.log(`[boost-points-utils] Boosted match IDs:`, Array.from(boostedPointsMap.keys()).map(id => id.substring(0, 8)));
  }
  
  boostedPointsMap.forEach((pointsAfterBoost, matchId) => {
    // Points normaux pour une victoire : 10
    // Points avec boost : points_after_boost (généralement 13)
    // Bonus = points_after_boost - 10
    const matchBoostBonus = typeof pointsAfterBoost === 'number' ? (pointsAfterBoost - 10) : 0;
    if (matchBoostBonus > 0) {
      console.log(`[boost-points-utils] ✅ Match ${matchId.substring(0, 8)}: ${pointsAfterBoost} points (bonus: +${matchBoostBonus})`);
      boostBonus += matchBoostBonus;
    } else {
      console.warn(`[boost-points-utils] ⚠️ Match ${matchId.substring(0, 8)}: Invalid boost bonus (pointsAfterBoost=${pointsAfterBoost})`);
    }
  });

  // Points totaux = points de base + bonus de boosts + bonus + challengePoints
  const totalPoints = basePoints + boostBonus + bonusNum + challengePointsNum;
  console.log(`[boost-points-utils] calculatePointsWithBoosts for ${userId.substring(0, 8)}: basePoints=${basePoints} (${winsNum} wins * 10 + ${lossesNum} losses * 3), boostBonus=${boostBonus} (from ${boostedPointsMap.size} boosted matches), bonus=${bonusNum}, challengePoints=${challengePointsNum}, total=${totalPoints}`);
  
  if (boostBonus > 0) {
    console.log(`[boost-points-utils] ✅ BOOST APPLIED: User ${userId.substring(0, 8)} has ${boostBonus} bonus points from boosts`);
  } else if (winMatches.size > 0) {
    console.log(`[boost-points-utils] ⚠️ NO BOOST: User ${userId.substring(0, 8)} has ${winMatches.size} win matches but no boosts found`);
  }
  
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
      playersData.forEach(({ userId, wins, losses, ties = 0, bonus, challengePoints }) => {
        // S'assurer que tous les paramètres sont des nombres
        const winsNum = typeof wins === 'number' ? wins : (typeof wins === 'string' ? parseInt(String(wins), 10) || 0 : 0);
        const lossesNum = typeof losses === 'number' ? losses : (typeof losses === 'string' ? parseInt(String(losses), 10) || 0 : 0);
        const tiesNum = typeof ties === 'number' ? ties : (typeof ties === 'string' ? parseInt(String(ties), 10) || 0 : 0);
        const bonusNum = typeof bonus === 'number' ? bonus : (typeof bonus === 'string' ? parseInt(String(bonus), 10) || 0 : 0);
        const challengePointsNum = typeof challengePoints === 'number' ? challengePoints : (typeof challengePoints === 'string' ? parseInt(String(challengePoints), 10) || 0 : 0);
        
        const basePoints = winsNum * 10 + lossesNum * 3 + tiesNum * 4;
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
      playersData.forEach(({ userId, wins, losses, ties = 0, bonus, challengePoints }) => {
        // S'assurer que tous les paramètres sont des nombres
        const winsNum = typeof wins === 'number' ? wins : (typeof wins === 'string' ? parseInt(String(wins), 10) || 0 : 0);
        const lossesNum = typeof losses === 'number' ? losses : (typeof losses === 'string' ? parseInt(String(losses), 10) || 0 : 0);
        const tiesNum = typeof ties === 'number' ? ties : (typeof ties === 'string' ? parseInt(String(ties), 10) || 0 : 0);
        const bonusNum = typeof bonus === 'number' ? bonus : (typeof bonus === 'string' ? parseInt(String(bonus), 10) || 0 : 0);
        const challengePointsNum = typeof challengePoints === 'number' ? challengePoints : (typeof challengePoints === 'string' ? parseInt(String(challengePoints), 10) || 0 : 0);
        
        const basePoints = winsNum * 10 + lossesNum * 3 + tiesNum * 4;
        results.set(userId, basePoints + bonusNum + challengePointsNum);
      });
      return results;
    }

    // Filtrer les boosts pour ne garder que ceux sur des matchs gagnés (dans allMatchIds)
    // IMPORTANT: Vérifier que le match_id est bien dans allMatchIds
    const filteredBoostUses = allBoostUses?.filter(boostUse => {
      const hasMatch = allMatchIds.has(boostUse.match_id);
      if (!hasMatch && boostUse.match_id) {
        console.log(`[boost-points-utils] ⚠️ Boost found for match ${boostUse.match_id?.substring(0, 8)} but match not in allMatchIds (${allMatchIds.size} matches)`);
      }
      return hasMatch;
    }) || [];

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
        // S'assurer que points_after_boost est bien un nombre
        const pointsAfterBoost = typeof boostUse.points_after_boost === 'number' 
          ? boostUse.points_after_boost 
          : (typeof boostUse.points_after_boost === 'string' ? parseInt(String(boostUse.points_after_boost), 10) : null);
        
        if (pointsAfterBoost !== null && !isNaN(pointsAfterBoost)) {
          boostsByUser.get(boostUse.user_id)!.set(boostUse.match_id, pointsAfterBoost);
        } else {
          console.warn(`[boost-points-utils] Invalid points_after_boost in filteredBoostUses:`, boostUse);
        }
      });
    } else {
      console.log(`[boost-points-utils] No boost uses found in database for ${userIds.length} users and ${allMatchIds.size} win matches`);
      if (allBoostUses && allBoostUses.length > 0) {
        console.log(`[boost-points-utils] ⚠️ Found ${allBoostUses.length} boosts total, but none match win matches:`, allBoostUses.map(b => ({
          user_id: b.user_id?.substring(0, 8),
          match_id: b.match_id?.substring(0, 8),
          points_after_boost: b.points_after_boost,
          applied_at: b.applied_at
        })));
        console.log(`[boost-points-utils] Win match IDs (${allMatchIds.size}):`, Array.from(allMatchIds).slice(0, 10).map(id => id.substring(0, 8)), allMatchIds.size > 10 ? '...' : '');
        console.log(`[boost-points-utils] Boost match IDs (${allBoostUses.length}):`, allBoostUses.slice(0, 10).map(b => b.match_id?.substring(0, 8)), allBoostUses.length > 10 ? '...' : '');
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
      if (userBoosts && userBoosts.size > 0) {
        console.log(`[boost-points-utils] Found ${userBoosts.size} boosts for user ${userId.substring(0, 8)}`);
        winMatches.forEach(matchId => {
          const pointsAfterBoost = userBoosts.get(matchId);
          if (pointsAfterBoost && typeof pointsAfterBoost === 'number') {
            // Points normaux pour une victoire : 10
            // Points avec boost : points_after_boost (généralement 13)
            // Bonus = points_after_boost - 10
            const matchBoost = pointsAfterBoost - 10;
            boostBonus += matchBoost;
            console.log(`[boost-points-utils] Boost found for user ${userId.substring(0, 8)} match ${matchId.substring(0, 8)}: ${pointsAfterBoost} points (bonus: +${matchBoost})`);
          } else {
            console.log(`[boost-points-utils] No boost found for user ${userId.substring(0, 8)} match ${matchId.substring(0, 8)} (pointsAfterBoost: ${pointsAfterBoost})`);
          }
        });
      } else {
        if (winMatches.size > 0) {
          console.log(`[boost-points-utils] No boosts found for user ${userId.substring(0, 8)} with ${winMatches.size} win matches`);
          console.log(`[boost-points-utils] Win match IDs for this user:`, Array.from(winMatches).map(id => id.substring(0, 8)));
        }
      }

      const totalPoints = basePoints + boostBonus + bonusNum + challengePointsNum;
      console.log(`[boost-points-utils] Total points for user ${userId.substring(0, 8)}: basePoints=${basePoints}, boostBonus=${boostBonus}, bonus=${bonusNum}, challengePoints=${challengePointsNum}, total=${totalPoints}`);
      results.set(userId, totalPoints);
    });
  } catch (error) {
    console.error("[boost-points-utils] Exception calculating points:", error);
    // Fallback : calculer sans boost
    playersData.forEach(({ userId, wins, losses, ties = 0, bonus, challengePoints }) => {
      // S'assurer que tous les paramètres sont des nombres
      const winsNum = typeof wins === 'number' ? wins : (typeof wins === 'string' ? parseInt(String(wins), 10) || 0 : 0);
      const lossesNum = typeof losses === 'number' ? losses : (typeof losses === 'string' ? parseInt(String(losses), 10) || 0 : 0);
      const tiesNum = typeof ties === 'number' ? ties : (typeof ties === 'string' ? parseInt(String(ties), 10) || 0 : 0);
      const bonusNum = typeof bonus === 'number' ? bonus : (typeof bonus === 'string' ? parseInt(String(bonus), 10) || 0 : 0);
      const challengePointsNum = typeof challengePoints === 'number' ? challengePoints : (typeof challengePoints === 'string' ? parseInt(String(challengePoints), 10) || 0 : 0);
      
      const basePoints = winsNum * 10 + lossesNum * 3 + tiesNum * 4;
      results.set(userId, basePoints + bonusNum + challengePointsNum);
    });
  }

  return results;
}


