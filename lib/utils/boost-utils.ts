/**
 * Utilitaires pour la gestion des boosts de points des joueurs
 */

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

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
  const errorDetails: Record<string, any> = {};
  if (error?.message) errorDetails.message = error.message;
  if (error?.details) errorDetails.details = error.details;
  if (error?.hint) errorDetails.hint = error.hint;
  if (error?.code) errorDetails.code = error.code;

  if (Object.keys(errorDetails).length === 0) {
    const errorType = typeof error;
    const errorString = String(error);
    logger.error({ type: errorType, stringRepresentation: errorString !== "[object Object]" ? errorString : undefined }, `[boost-utils] ${context} (empty error object)`);
  } else {
    logger.error({ ...errorDetails }, `[boost-utils] ${context}`);
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
    logger.warn({}, "[boost-utils] Supabase admin client not available");
    return 0;
  }

  try {
    const shortUserId = userId.substring(0, 8) + "...";
    logger.info({ userId: shortUserId }, "[boost-utils] Counting boost credits");

    const { data: allCreditsData, error: allCreditsError } = await supabaseAdmin
      .from("player_boost_credits")
      .select("id, consumed_at")
      .eq("user_id", userId);

    if (allCreditsError) {
      logSupabaseError("Error fetching all boost credits", allCreditsError);
    }

    const { data: creditsData, error: fetchError } = await supabaseAdmin
      .from("player_boost_credits")
      .select("id, consumed_at")
      .eq("user_id", userId)
      .is("consumed_at", null);

    if (fetchError) {
      logSupabaseError("Error fetching available boost credits", fetchError);
      const { data: creditsDataAlt, error: fetchErrorAlt } = await supabaseAdmin
        .from("player_boost_credits")
        .select("id, consumed_at")
        .eq("user_id", userId);

      if (!fetchErrorAlt && creditsDataAlt) {
        const availableCount = creditsDataAlt.filter(c => !c.consumed_at).length;
        logger.info({ userId: shortUserId, count: availableCount }, "[boost-utils] Available credits (alt method)");
        return availableCount;
      }
      return 0;
    }

    const countMethod1 = creditsData?.length || 0;

    const { count: countFromQuery, error: countError } = await supabaseAdmin
      .from("player_boost_credits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("consumed_at", null);

    if (countError) {
      logSupabaseError("Error counting boost credits", countError);
      logger.info({ userId: shortUserId, count: countMethod1 }, "[boost-utils] Using method 1 count");
      return countMethod1;
    }

    const { data: directCheck, error: directError } = await supabaseAdmin
      .from("player_boost_credits")
      .select("id, consumed_at")
      .eq("user_id", userId)
      .or("consumed_at.is.null");

    if (directError) {
      logSupabaseError("Error in direct boost credits check", directError);
    }

    const directCount = directCheck?.length || 0;

    const counts = [countMethod1, countFromQuery || 0, directCount].filter(
      c => typeof c === "number"
    );
    let finalCount = counts.length > 0 ? Math.max(...counts) : 0;

    if (allCreditsData) {
      const manualCount = allCreditsData.filter(
        c => c.consumed_at === null || c.consumed_at === undefined
      ).length;

      if (manualCount !== finalCount) {
        logger.warn({ userId: shortUserId, finalCount, manualCount }, "[boost-utils] Boost credits count mismatch");
        finalCount = manualCount;
      }
    }

    logger.info({ userId: shortUserId, count: finalCount }, "[boost-utils] Final boost credits count");

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
    logger.warn({}, "[boost-utils] Supabase admin client not available");
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

    const used = count || 0;
    logger.info({ userId: userId.substring(0, 8) + "...", used }, "[boost-utils] Boosts used this month");

    return used;
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
    const canUse = await canPlayerUseBoost(userId);
    if (!canUse.canUse) {
      return {
        success: false,
        error: canUse.reason || "Impossible d'utiliser un boost",
      };
    }

    const { data: availableCredit, error: creditError } = await supabaseAdmin
      .from("player_boost_credits")
      .select("id")
      .eq("user_id", userId)
      .is("consumed_at", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (creditError || !availableCredit) {
      logSupabaseError("Error finding available credit", creditError);
      return {
        success: false,
        error: "Aucun boost disponible trouvé",
      };
    }

    const pointsAfterBoost = Math.round(pointsBeforeBoost * (1 + BOOST_PERCENTAGE));

    logger.info({ userId: userId.substring(0, 8) + "...", matchId: matchId.substring(0, 8) + "...", pointsBeforeBoost, pointsAfterBoost, percentage: BOOST_PERCENTAGE }, "[consumeBoostForMatch] Calculating boosted points");

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

    const { data: verifyCredit, error: verifyError } = await supabaseAdmin
      .from("player_boost_credits")
      .select("id, consumed_at")
      .eq("id", availableCredit.id)
      .single();

    if (verifyError || !verifyCredit || !verifyCredit.consumed_at) {
      logSupabaseError("Credit not consumed properly", verifyError);
      return {
        success: false,
        error: "Erreur lors de la vérification de la consommation du boost",
      };
    }

    const appliedAt = new Date().toISOString();
    const { data: boostUse, error: useError } = await supabaseAdmin
      .from("player_boost_uses")
      .insert({
        user_id: userId,
        match_id: matchId,
        boost_credit_id: availableCredit.id,
        percentage: BOOST_PERCENTAGE,
        points_before_boost: pointsBeforeBoost,
        points_after_boost: pointsAfterBoost,
        applied_at: appliedAt,
      })
      .select("id, points_after_boost, points_before_boost, applied_at")
      .single();

    if (useError || !boostUse) {
      logSupabaseError("Error recording boost use", useError);
      await supabaseAdmin
        .from("player_boost_credits")
        .update({ consumed_at: null })
        .eq("id", availableCredit.id);
      return {
        success: false,
        error: "Erreur lors de l'enregistrement de l'utilisation du boost",
      };
    }

    logger.info({ boostUseId: boostUse.id.substring(0, 8) + "...", userId: userId.substring(0, 8) + "...", matchId: matchId.substring(0, 8) + "...", pointsBeforeBoost: boostUse.points_before_boost, pointsAfterBoost: boostUse.points_after_boost }, "[consumeBoostForMatch] Boost use recorded");

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

    logger.info({ userId: userId.substring(0, 8) + "...", credited: insertedCredits.length }, "[boost-utils] Boosts credited");

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
  const shortUserId = userId.substring(0, 8) + "...";
  logger.info({ userId: shortUserId }, "[boost-utils] Getting boost stats");

  const [creditsAvailable, usedThisMonth] = await Promise.all([
    getPlayerBoostCreditsAvailable(userId),
    getPlayerBoostsUsedThisMonth(userId),
  ]);

  const remainingThisMonth = Math.max(0, MAX_BOOSTS_PER_MONTH - usedThisMonth);
  const canUse = creditsAvailable > 0 && usedThisMonth < MAX_BOOSTS_PER_MONTH;

  const stats = {
    creditsAvailable,
    usedThisMonth,
    remainingThisMonth,
    canUse,
  };

  logger.info({ userId: shortUserId, ...stats }, "[boost-utils] Boost stats");

  return stats;
}
