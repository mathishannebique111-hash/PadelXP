/**
 * Utilitaires pour la gestion des boosts de points des joueurs
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
    const allKeys = Object.keys(error || {});
    const errorType = typeof error;
    const errorString = String(error);
    console.error(`[boost-utils] ${context} (empty error object):`, {
      type: errorType,
      keys: allKeys,
      stringRepresentation: errorString !== "[object Object]" ? errorString : undefined,
      rawError: error
    });
  } else {
    console.error(`[boost-utils] ${context}:`, errorDetails);
  }
}

/**
 * Constantes pour les boosts
 */
export const BOOST_PERCENTAGE = 0.3; // +30% de points
export const MAX_BOOSTS_PER_MONTH = 10; // Limite de 10 boosts utilisés par mois

/**
 * Compte le nombre de boosts disponibles (non consommés) pour un joueur
 */
export async function getPlayerBoostCreditsAvailable(userId: string): Promise<number> {
  if (!supabaseAdmin) {
    console.warn("[boost-utils] Supabase admin client not available");
    return 0;
  }

  try {
    console.log("[boost-utils] Counting boost credits for user:", userId);
    
    // Vérifier d'abord que le client admin est disponible
    if (!supabaseAdmin) {
      console.error("[boost-utils] Supabase admin client is null or undefined");
      return 0;
    }
    
    // Récupérer tous les crédits pour ce user_id (même consommés pour debug)
    const { data: allCreditsData, error: allCreditsError } = await supabaseAdmin
      .from("player_boost_credits")
      .select("id, user_id, consumed_at, created_at")
      .eq("user_id", userId);

    if (allCreditsError) {
      console.error("[boost-utils] Error fetching all credits:", allCreditsError);
      logSupabaseError("Error fetching all boost credits", allCreditsError);
    } else {
      console.log("[boost-utils] All credits for user (including consumed):", allCreditsData?.length || 0);
      if (allCreditsData && allCreditsData.length > 0) {
        console.log("[boost-utils] Sample credit data:", allCreditsData[0]);
      }
    }

    // Méthode 1: Récupérer tous les crédits et filtrer
    const { data: creditsData, error: fetchError } = await supabaseAdmin
      .from("player_boost_credits")
      .select("id, user_id, consumed_at, created_at")
      .eq("user_id", userId)
      .is("consumed_at", null);

    if (fetchError) {
      console.error("[boost-utils] Error fetching available credits:", fetchError);
      logSupabaseError("Error fetching available boost credits", fetchError);
      // Essayer une autre approche : vérifier si consumed_at est null ou undefined
      const { data: creditsDataAlt, error: fetchErrorAlt } = await supabaseAdmin
        .from("player_boost_credits")
        .select("id, user_id, consumed_at")
        .eq("user_id", userId);
      
      if (!fetchErrorAlt && creditsDataAlt) {
        const availableCount = creditsDataAlt.filter(c => !c.consumed_at).length;
        console.log("[boost-utils] Available credits (alt method):", availableCount);
        return availableCount;
      }
      return 0;
    }

    const count = creditsData?.length || 0;
    console.log("[boost-utils] Available boost credits (method 1 - filter):", count);
    
    if (creditsData && creditsData.length > 0) {
      console.log("[boost-utils] Available credits details:", creditsData.map(c => ({
        id: c.id,
        user_id: c.user_id,
        consumed_at: c.consumed_at,
        created_at: c.created_at
      })));
    }

    // Méthode 2: Utiliser count pour vérifier
    const { count: countFromQuery, error: countError } = await supabaseAdmin
      .from("player_boost_credits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("consumed_at", null);

    if (countError) {
      console.error("[boost-utils] Error counting boost credits:", countError);
      logSupabaseError("Error counting boost credits", countError);
      // Retourner le count de la méthode 1
      console.log("[boost-utils] Using method 1 count:", count);
      return count;
    }

    console.log("[boost-utils] Available boost credits (method 2 - count):", countFromQuery);

    // Méthode 3: Double vérification avec une requête explicite
    const { data: directCheck, error: directError } = await supabaseAdmin
      .from("player_boost_credits")
      .select("id")
      .eq("user_id", userId)
      .or("consumed_at.is.null");
    
    const directCount = directCheck?.length || 0;
    console.log("[boost-utils] Available boost credits (method 3 - direct):", directCount);

    // Prendre le maximum entre les trois méthodes pour être sûr
    const counts = [count, countFromQuery || 0, directCount].filter(c => typeof c === 'number');
    const finalCount = counts.length > 0 ? Math.max(...counts) : 0;
    
    console.log("[boost-utils] Final count for user:", userId, "is", finalCount, "(from counts:", counts, ")");
    
    // Si on a récupéré tous les crédits, vérifier manuellement
    if (allCreditsData) {
      const manualCount = allCreditsData.filter(c => c.consumed_at === null || c.consumed_at === undefined).length;
      console.log("[boost-utils] Manual count from all credits:", manualCount);
      if (manualCount !== finalCount) {
        console.warn("[boost-utils] Count mismatch! Manual:", manualCount, "vs Final:", finalCount);
        return manualCount; // Utiliser le compte manuel qui est plus fiable
      }
    }
    
    return finalCount;
  } catch (error) {
    logSupabaseError("Exception counting boost credits", error);
    return 0;
  }
}

/**
 * Compte le nombre de boosts déjà utilisés ce mois-ci pour un joueur
 */
export async function getPlayerBoostsUsedThisMonth(userId: string): Promise<number> {
  if (!supabaseAdmin) {
    console.warn("[boost-utils] Supabase admin client not available");
    return 0;
  }

  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthStartISO = monthStart.toISOString();

    const { count, error } = await supabaseAdmin
      .from("player_boost_uses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("applied_at", monthStartISO);

    if (error) {
      logSupabaseError("Error counting boosts used this month", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    logSupabaseError("Exception counting boosts used this month", error);
    return 0;
  }
}

/**
 * Vérifie si un joueur peut utiliser un boost (a des crédits ET n'a pas atteint la limite mensuelle)
 */
export async function canPlayerUseBoost(userId: string): Promise<{
  canUse: boolean;
  creditsAvailable: number;
  usedThisMonth: number;
  reason?: string;
}> {
  const [creditsAvailable, usedThisMonth] = await Promise.all([
    getPlayerBoostCreditsAvailable(userId),
    getPlayerBoostsUsedThisMonth(userId),
  ]);

  if (creditsAvailable === 0) {
    return {
      canUse: false,
      creditsAvailable: 0,
      usedThisMonth,
      reason: "Tu n'as plus de boosts disponibles. Achète-en de nouveaux pour continuer !",
    };
  }

  if (usedThisMonth >= MAX_BOOSTS_PER_MONTH) {
    return {
      canUse: false,
      creditsAvailable,
      usedThisMonth,
      reason: `Tu as atteint la limite de ${MAX_BOOSTS_PER_MONTH} boosts utilisés ce mois-ci. Tu pourras en utiliser à nouveau le mois prochain.`,
    };
  }

  return {
    canUse: true,
    creditsAvailable,
    usedThisMonth,
  };
}

/**
 * Consomme un boost crédit pour un joueur et l'applique à un match
 * Cette fonction doit être appelée côté serveur uniquement
 */
export async function consumeBoostForMatch(
  userId: string,
  matchId: string,
  pointsBeforeBoost: number
): Promise<{
  success: boolean;
  boostCreditId?: string;
  pointsAfterBoost?: number;
  error?: string;
}> {
  if (!supabaseAdmin) {
    return {
      success: false,
      error: "Admin client not available",
    };
  }

  try {
    // Vérifier que le joueur peut utiliser un boost
    const canUse = await canPlayerUseBoost(userId);
    if (!canUse.canUse) {
      return {
        success: false,
        error: canUse.reason || "Impossible d'utiliser un boost",
      };
    }

    // Trouver un crédit disponible
    const { data: availableCredit, error: creditError } = await supabaseAdmin
      .from("player_boost_credits")
      .select("id")
      .eq("user_id", userId)
      .is("consumed_at", null)
      .order("created_at", { ascending: true }) // FIFO : utiliser les plus anciens d'abord
      .limit(1)
      .single();

    if (creditError || !availableCredit) {
      logSupabaseError("Error finding available credit", creditError);
      return {
        success: false,
        error: "Aucun boost disponible trouvé",
      };
    }

    // Calculer les points après boost (+30%)
    // Exemple: 10 * (1 + 0.3) = 10 * 1.3 = 13 points
    const pointsAfterBoost = Math.round(pointsBeforeBoost * (1 + BOOST_PERCENTAGE));
    
    console.log(`[consumeBoostForMatch] Calculating boosted points:`, {
      pointsBeforeBoost,
      BOOST_PERCENTAGE,
      calculation: `${pointsBeforeBoost} * (1 + ${BOOST_PERCENTAGE}) = ${pointsBeforeBoost * (1 + BOOST_PERCENTAGE)}`,
      pointsAfterBoost: Math.round(pointsBeforeBoost * (1 + BOOST_PERCENTAGE)),
      finalValue: pointsAfterBoost
    });

    // Marquer le crédit comme consommé
    console.log(`[consumeBoostForMatch] Marking credit as consumed:`, {
      creditId: availableCredit.id,
      userId,
      timestamp: new Date().toISOString()
    });
    
    const consumedAt = new Date().toISOString();
    const { error: consumeError } = await supabaseAdmin
      .from("player_boost_credits")
      .update({ consumed_at: consumedAt })
      .eq("id", availableCredit.id);

    if (consumeError) {
      logSupabaseError("Error consuming credit", consumeError);
      return {
        success: false,
        error: "Erreur lors de la consommation du boost",
      };
    }

    // Vérifier que le crédit a bien été consommé
    const { data: verifyCredit, error: verifyError } = await supabaseAdmin
      .from("player_boost_credits")
      .select("id, consumed_at")
      .eq("id", availableCredit.id)
      .single();

    if (verifyError || !verifyCredit || !verifyCredit.consumed_at) {
      console.error(`[consumeBoostForMatch] ❌ Credit not consumed properly:`, {
        creditId: availableCredit.id,
        verifyError,
        verifyCredit
      });
      return {
        success: false,
        error: "Erreur lors de la vérification de la consommation du boost",
      };
    }

    console.log(`[consumeBoostForMatch] ✅ Credit consumed successfully:`, {
      creditId: availableCredit.id,
      consumedAt: verifyCredit.consumed_at
    });

    // Enregistrer l'utilisation du boost avec les points boostés (13 points au lieu de 10)
    console.log(`[consumeBoostForMatch] Recording boost use in database:`, {
      userId,
      matchId,
      boostCreditId: availableCredit.id,
      pointsBeforeBoost,
      pointsAfterBoost,
      percentage: BOOST_PERCENTAGE
    });
    
    const { data: boostUse, error: useError } = await supabaseAdmin
      .from("player_boost_uses")
      .insert({
        user_id: userId,
        match_id: matchId,
        boost_credit_id: availableCredit.id,
        percentage: BOOST_PERCENTAGE,
        points_before_boost: pointsBeforeBoost,
        points_after_boost: pointsAfterBoost, // 13 points au lieu de 10
      })
      .select("id, points_after_boost, points_before_boost")
      .single();

    if (useError || !boostUse) {
      logSupabaseError("Error recording boost use", useError);
      // Rollback : remettre le crédit comme disponible
      await supabaseAdmin
        .from("player_boost_credits")
        .update({ consumed_at: null })
        .eq("id", availableCredit.id);
      return {
        success: false,
        error: "Erreur lors de l'enregistrement de l'utilisation du boost",
      };
    }

    console.log(`[consumeBoostForMatch] ✅ Boost use recorded successfully:`, {
      boostUseId: boostUse.id,
      pointsBeforeBoost: boostUse.points_before_boost,
      pointsAfterBoost: boostUse.points_after_boost,
      expectedPointsAfterBoost: pointsAfterBoost
    });

    return {
      success: true,
      boostCreditId: availableCredit.id,
      pointsAfterBoost,
    };
  } catch (error) {
    logSupabaseError("Exception consuming boost", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Crédite un joueur avec un ou plusieurs boosts après un paiement Stripe
 */
export async function creditPlayerBoosts(
  userId: string,
  quantity: number,
  stripePaymentIntentId?: string,
  stripeSessionId?: string
): Promise<{
  success: boolean;
  credited: number;
  error?: string;
}> {
  if (!supabaseAdmin) {
    return {
      success: false,
      credited: 0,
      error: "Admin client not available",
    };
  }

  if (quantity <= 0) {
    return {
      success: false,
      credited: 0,
      error: "La quantité doit être supérieure à 0",
    };
  }

  try {
    // Créer les crédits
    const credits = Array.from({ length: quantity }, () => ({
      user_id: userId,
      stripe_payment_intent_id: stripePaymentIntentId || null,
      created_by_session_id: stripeSessionId || null,
    }));

    const { data: insertedCredits, error: insertError } = await supabaseAdmin
      .from("player_boost_credits")
      .insert(credits)
      .select("id");

    if (insertError || !insertedCredits || insertedCredits.length !== quantity) {
      logSupabaseError("Error crediting boosts", insertError);
      return {
        success: false,
        credited: 0,
        error: "Erreur lors du crédit des boosts",
      };
    }

    return {
      success: true,
      credited: insertedCredits.length,
    };
  } catch (error) {
    logSupabaseError("Exception crediting boosts", error);
    return {
      success: false,
      credited: 0,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Récupère les statistiques de boost d'un joueur
 */
export async function getPlayerBoostStats(userId: string): Promise<{
  creditsAvailable: number;
  usedThisMonth: number;
  remainingThisMonth: number;
  canUse: boolean;
}> {
  console.log("[boost-utils] Getting boost stats for user:", userId);
  
  const [creditsAvailable, usedThisMonth] = await Promise.all([
    getPlayerBoostCreditsAvailable(userId),
    getPlayerBoostsUsedThisMonth(userId),
  ]);

  console.log("[boost-utils] Boost stats calculated:", {
    userId,
    creditsAvailable,
    usedThisMonth,
  });

  const remainingThisMonth = Math.max(0, MAX_BOOSTS_PER_MONTH - usedThisMonth);
  const canUse = creditsAvailable > 0 && usedThisMonth < MAX_BOOSTS_PER_MONTH;

  const stats = {
    creditsAvailable,
    usedThisMonth,
    remainingThisMonth,
    canUse,
  };

  console.log("[boost-utils] Final boost stats:", stats);

  return stats;
}


