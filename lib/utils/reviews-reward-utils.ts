/**
 * Utilitaires pour gérer les récompenses liées aux avis (objectif 50 avis)
 */

import { createClient as createAdminClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

const REVIEWS_GOAL = 50;
const FREE_BOOST_SESSION_ID = "reviews_50_goal_reward";

/**
 * Vérifie si l'objectif de 50 avis est atteint
 */
export async function isReviewsGoalReached(): Promise<boolean> {
  if (!supabaseAdmin) {
    console.warn("[reviews-reward-utils] Supabase admin client not available");
    return false;
  }

  try {
    const { count, error } = await supabaseAdmin
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("is_hidden", false);

    if (error) {
      console.error("[reviews-reward-utils] Error counting reviews:", error);
      return false;
    }

    return (count || 0) >= REVIEWS_GOAL;
  } catch (error) {
    console.error("[reviews-reward-utils] Exception checking reviews goal:", error);
    return false;
  }
}

/**
 * Récupère la date à laquelle l'objectif de 50 avis a été atteint
 * Retourne null si l'objectif n'est pas encore atteint
 */
export async function getReviewsGoalReachedDate(): Promise<string | null> {
  if (!supabaseAdmin) {
    return null;
  }

  try {
    // Récupérer le 50ème avis (non masqué)
    const { data: reviews, error } = await supabaseAdmin
      .from("reviews")
      .select("created_at")
      .eq("is_hidden", false)
      .order("created_at", { ascending: true })
      .limit(REVIEWS_GOAL);

    if (error || !reviews || reviews.length < REVIEWS_GOAL) {
      return null;
    }

    // Le 50ème avis est le dernier de la liste
    return reviews[REVIEWS_GOAL - 1]?.created_at || null;
  } catch (error) {
    console.error("[reviews-reward-utils] Exception getting goal reached date:", error);
    return null;
  }
}

/**
 * Vérifie si un joueur a laissé un avis avant l'atteinte de l'objectif de 50 avis
 */
export async function hasUserReviewedBeforeGoal(userId: string): Promise<boolean> {
  if (!supabaseAdmin) {
    return false;
  }

  try {
    const goalReachedDate = await getReviewsGoalReachedDate();
    
    // Si l'objectif n'est pas encore atteint, tous les joueurs qui ont laissé un avis sont éligibles
    if (!goalReachedDate) {
      const { count, error } = await supabaseAdmin
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      if (error) {
        console.error("[reviews-reward-utils] Error checking user review:", error);
        return false;
      }

      return (count || 0) > 0;
    }

    // Si l'objectif est atteint, vérifier si l'utilisateur a laissé un avis avant cette date
    const { count, error } = await supabaseAdmin
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .lt("created_at", goalReachedDate);

    if (error) {
      console.error("[reviews-reward-utils] Error checking user review before goal:", error);
      return false;
    }

    return (count || 0) > 0;
  } catch (error) {
    console.error("[reviews-reward-utils] Exception checking user review eligibility:", error);
    return false;
  }
}

/**
 * Vérifie si un joueur a déjà réclamé son boost gratuit pour l'objectif de 50 avis
 */
export async function hasUserClaimedFreeBoost(userId: string): Promise<boolean> {
  if (!supabaseAdmin) {
    return false;
  }

  try {
    const { count, error } = await supabaseAdmin
      .from("player_boost_credits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("created_by_session_id", FREE_BOOST_SESSION_ID);

    if (error) {
      console.error("[reviews-reward-utils] Error checking claimed boost:", error);
      return false;
    }

    return (count || 0) > 0;
  } catch (error) {
    console.error("[reviews-reward-utils] Exception checking claimed boost:", error);
    return false;
  }
}

/**
 * Crédite un joueur avec un boost gratuit pour avoir participé à l'objectif de 50 avis
 */
export async function creditUserFreeBoost(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!supabaseAdmin) {
    return {
      success: false,
      error: "Admin client not available",
    };
  }

  try {
    // Vérifier que l'objectif est atteint
    const goalReached = await isReviewsGoalReached();
    if (!goalReached) {
      return {
        success: false,
        error: "L'objectif de 50 avis n'est pas encore atteint",
      };
    }

    // Vérifier que l'utilisateur est éligible
    const isEligible = await hasUserReviewedBeforeGoal(userId);
    if (!isEligible) {
      return {
        success: false,
        error: "Vous n'êtes pas éligible pour cette récompense",
      };
    }

    // Vérifier que l'utilisateur n'a pas déjà réclamé le boost
    const alreadyClaimed = await hasUserClaimedFreeBoost(userId);
    if (alreadyClaimed) {
      return {
        success: false,
        error: "Vous avez déjà réclamé cette récompense",
      };
    }

    // Créditer le boost gratuit
    const { data: insertedCredit, error: insertError } = await supabaseAdmin
      .from("player_boost_credits")
      .insert({
        user_id: userId,
        created_by_session_id: FREE_BOOST_SESSION_ID,
        stripe_payment_intent_id: null,
      })
      .select("id")
      .single();

    if (insertError || !insertedCredit) {
      console.error("[reviews-reward-utils] Error crediting free boost:", insertError);
      return {
        success: false,
        error: "Erreur lors de l'attribution du boost gratuit",
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("[reviews-reward-utils] Exception crediting free boost:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Récupère le nombre total d'avis (non masqués)
 */
export async function getTotalReviewsCount(): Promise<number> {
  if (!supabaseAdmin) {
    return 0;
  }

  try {
    const { count, error } = await supabaseAdmin
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("is_hidden", false);

    if (error) {
      console.error("[reviews-reward-utils] Error counting reviews:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("[reviews-reward-utils] Exception counting reviews:", error);
    return 0;
  }
}

