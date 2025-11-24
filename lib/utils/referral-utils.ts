/**
 * Utilitaires pour gérer le système de parrainage
 */

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { creditPlayerBoosts } from "./boost-utils";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

const REFERRAL_BOOST_SESSION_ID = "referral_reward";
const MAX_REFERRALS_PER_USER = 2;

/**
 * Vérifie si un code de parrainage existe et est valide
 */
export async function validateReferralCode(code: string): Promise<{
  valid: boolean;
  referrerId?: string;
  referrerName?: string;
  error?: string;
}> {
  if (!supabaseAdmin) {
    return {
      valid: false,
      error: "Service non disponible",
    };
  }

  if (!code || code.trim().length === 0) {
    return {
      valid: false,
      error: "Code de parrainage requis",
    };
  }

  try {
    const normalizedCode = code.trim().toUpperCase();
    
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, referral_count")
      .eq("referral_code", normalizedCode)
      .maybeSingle();

    if (error) {
      console.error("[referral-utils] Error validating referral code:", error);
      return {
        valid: false,
        error: "Erreur lors de la validation du code",
      };
    }

    if (!profile) {
      return {
        valid: false,
        error: "Code de parrainage invalide",
      };
    }

    // Vérifier que le parrain n'a pas atteint la limite de 2 filleuls
    if ((profile.referral_count || 0) >= MAX_REFERRALS_PER_USER) {
      return {
        valid: false,
        error: "Ce code de parrainage a atteint la limite de 2 filleuls",
      };
    }

    return {
      valid: true,
      referrerId: profile.id,
      referrerName: profile.display_name || "Joueur",
    };
  } catch (error) {
    console.error("[referral-utils] Exception validating referral code:", error);
    return {
      valid: false,
      error: "Erreur lors de la validation du code",
    };
  }
}

/**
 * Vérifie si un utilisateur a déjà utilisé un code de parrainage
 */
export async function hasUserUsedReferralCode(userId: string): Promise<boolean> {
  if (!supabaseAdmin) {
    return false;
  }

  try {
    const { count, error } = await supabaseAdmin
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referred_id", userId);

    if (error) {
      console.error("[referral-utils] Error checking referral usage:", error);
      return false;
    }

    return (count || 0) > 0;
  } catch (error) {
    console.error("[referral-utils] Exception checking referral usage:", error);
    return false;
  }
}

/**
 * Vérifie si un utilisateur essaie d'utiliser son propre code
 */
export async function isSelfReferral(userId: string, referralCode: string): Promise<boolean> {
  if (!supabaseAdmin) {
    return false;
  }

  try {
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("referral_code")
      .eq("id", userId)
      .maybeSingle();

    if (error || !profile) {
      return false;
    }

    return profile.referral_code?.toUpperCase() === referralCode.trim().toUpperCase();
  } catch (error) {
    console.error("[referral-utils] Exception checking self referral:", error);
    return false;
  }
}

/**
 * Traite un code de parrainage lors de l'inscription d'un nouveau joueur
 * Crée la relation parrain/filleul et attribue les boosts
 */
export async function processReferralCode(
  referralCode: string,
  referredUserId: string
): Promise<{
  success: boolean;
  referrerId?: string;
  referrerName?: string;
  error?: string;
}> {
  if (!supabaseAdmin) {
    return {
      success: false,
      error: "Service non disponible",
    };
  }

  try {
    // Normaliser le code
    const normalizedCode = referralCode.trim().toUpperCase();

    // 1. Valider le code
    const validation = await validateReferralCode(normalizedCode);
    if (!validation.valid || !validation.referrerId) {
      return {
        success: false,
        error: validation.error || "Code de parrainage invalide",
      };
    }

    const referrerId = validation.referrerId;
    const referrerName = validation.referrerName || "Joueur";

    // 2. Vérifier que l'utilisateur n'a pas déjà utilisé un code
    const alreadyUsed = await hasUserUsedReferralCode(referredUserId);
    if (alreadyUsed) {
      return {
        success: false,
        error: "Vous avez déjà utilisé un code de parrainage",
      };
    }

    // 3. Vérifier l'auto-parrainage
    const isSelf = await isSelfReferral(referredUserId, normalizedCode);
    if (isSelf) {
      return {
        success: false,
        error: "Vous ne pouvez pas utiliser votre propre code de parrainage",
      };
    }

    // 4. Vérifier à nouveau la limite (pour éviter les race conditions)
    const { data: referrerProfile } = await supabaseAdmin
      .from("profiles")
      .select("referral_count")
      .eq("id", referrerId)
      .maybeSingle();

    if (!referrerProfile || (referrerProfile.referral_count || 0) >= MAX_REFERRALS_PER_USER) {
      return {
        success: false,
        error: "Ce code de parrainage a atteint la limite de 2 filleuls",
      };
    }

    // 5. Créer la relation de parrainage dans une transaction
    const { data: referral, error: referralError } = await supabaseAdmin
      .from("referrals")
      .insert({
        referrer_id: referrerId,
        referred_id: referredUserId,
        referral_code_used: normalizedCode,
        referrer_boost_awarded: false,
        referred_boost_awarded: false,
      })
      .select("id")
      .single();

    if (referralError || !referral) {
      // Vérifier si c'est une violation d'unicité (déjà utilisé)
      if (referralError?.code === "23505") {
        return {
          success: false,
          error: "Vous avez déjà utilisé un code de parrainage",
        };
      }
      console.error("[referral-utils] Error creating referral:", referralError);
      return {
        success: false,
        error: "Erreur lors de l'enregistrement du parrainage",
      };
    }

    // 6. Incrémenter le compteur de parrainages du parrain
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ referral_count: (referrerProfile.referral_count || 0) + 1 })
      .eq("id", referrerId);

    if (updateError) {
      console.error("[referral-utils] Error updating referral count:", updateError);
      // Ne pas échouer complètement, mais logger l'erreur
    }

    // 7. Attribuer les boosts (parrain + filleul)
    const [referrerBoostResult, referredBoostResult] = await Promise.all([
      creditPlayerBoosts(referrerId, 1, undefined, REFERRAL_BOOST_SESSION_ID),
      creditPlayerBoosts(referredUserId, 1, undefined, REFERRAL_BOOST_SESSION_ID),
    ]);

    // 8. Marquer les boosts comme attribués
    const boostAwarded = referrerBoostResult.success && referredBoostResult.success;
    if (boostAwarded) {
      await supabaseAdmin
        .from("referrals")
        .update({
          referrer_boost_awarded: referrerBoostResult.success,
          referred_boost_awarded: referredBoostResult.success,
        })
        .eq("id", referral.id);
    } else {
      console.error("[referral-utils] Error awarding boosts:", {
        referrer: referrerBoostResult.error,
        referred: referredBoostResult.error,
      });
    }

    return {
      success: true,
      referrerId,
      referrerName,
    };
  } catch (error) {
    console.error("[referral-utils] Exception processing referral code:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Récupère les informations de parrainage d'un utilisateur
 */
export async function getUserReferralInfo(userId: string): Promise<{
  referralCode: string | null;
  referralCount: number;
  maxReferrals: number;
  referrals: Array<{
    referredId: string;
    referredName: string;
    createdAt: string;
  }>;
}> {
  if (!supabaseAdmin) {
    return {
      referralCode: null,
      referralCount: 0,
      maxReferrals: MAX_REFERRALS_PER_USER,
      referrals: [],
    };
  }

  try {
    // Récupérer le code et le compteur
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("referral_code, referral_count")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !profile) {
      return {
        referralCode: null,
        referralCount: 0,
        maxReferrals: MAX_REFERRALS_PER_USER,
        referrals: [],
      };
    }

    // Récupérer la liste des filleuls
    const { data: referrals, error: referralsError } = await supabaseAdmin
      .from("referrals")
      .select("referred_id, created_at")
      .eq("referrer_id", userId)
      .order("created_at", { ascending: false });

    const referralsList = [];
    if (referrals && referrals.length > 0) {
      // Récupérer les noms des filleuls
      const referredIds = referrals.map(r => r.referred_id);
      const { data: referredProfiles } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name")
        .in("id", referredIds);

      const profilesMap = new Map(
        (referredProfiles || []).map(p => [p.id, p.display_name || "Joueur"])
      );

      referralsList.push(...referrals.map(r => ({
        referredId: r.referred_id,
        referredName: profilesMap.get(r.referred_id) || "Joueur",
        createdAt: r.created_at,
      })));
    }

    return {
      referralCode: profile.referral_code || null,
      referralCount: profile.referral_count || 0,
      maxReferrals: MAX_REFERRALS_PER_USER,
      referrals: referralsList,
    };
  } catch (error) {
    console.error("[referral-utils] Exception getting user referral info:", error);
    return {
      referralCode: null,
      referralCount: 0,
      maxReferrals: MAX_REFERRALS_PER_USER,
      referrals: [],
    };
  }
}

/**
 * Vérifie si un utilisateur a des notifications de parrainage à afficher
 */
export async function getPendingReferralNotifications(userId: string): Promise<{
  hasNewReferral: boolean;
  referredName?: string;
  referralDate?: string;
}> {
  if (!supabaseAdmin) {
    return { hasNewReferral: false };
  }

  try {
    // Vérifier si l'utilisateur a parrainé quelqu'un récemment (dans les dernières 24h)
    // et que le boost a été attribué (pour s'assurer que le processus est complet)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: recentReferral, error } = await supabaseAdmin
      .from("referrals")
      .select("referred_id, created_at, referrer_boost_awarded")
      .eq("referrer_id", userId)
      .eq("referrer_boost_awarded", true)
      .gte("created_at", oneDayAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !recentReferral) {
      return { hasNewReferral: false };
    }

    // Récupérer le nom du filleul
    const { data: referredProfile } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("id", recentReferral.referred_id)
      .maybeSingle();

    return {
      hasNewReferral: true,
      referredName: referredProfile?.display_name || "Joueur",
      referralDate: recentReferral.created_at,
    };
  } catch (error) {
    console.error("[referral-utils] Exception getting pending notifications:", error);
    return { hasNewReferral: false };
  }
}

