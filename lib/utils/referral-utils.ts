/**
 * Utilitaires pour gérer le système de parrainage
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
 * Code promo unique accepté à l'inscription.
 * Le saisir octroie automatiquement 1 mois de Premium gratuit, sans paiement.
 */
export const CLUB_PROMO_CODE = "CLUB";
const CLUB_PREMIUM_DAYS = 30;
const CLUB_PAYMENT_METHOD = "club_promo";

/**
 * Génère un code de parrainage unique de 6 caractères
 */
export async function generateUniqueReferralCode(): Promise<string> {
  if (!supabaseAdmin) throw new Error("Service non disponible");

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let isUnique = false;
  let code = '';

  while (!isUnique) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("referral_code", code)
      .maybeSingle();

    if (!data) {
      isUnique = true;
    }
  }

  return code;
}

/**
 * Vérifie le code promo saisi à l'inscription.
 * Seul le code "CLUB" est accepté : il offre 1 mois de Premium gratuit.
 */
export async function validateReferralCode(code: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  if (!code || code.trim().length === 0) {
    return {
      valid: false,
      error: "Code requis",
    };
  }

  if (code.trim().toUpperCase() !== CLUB_PROMO_CODE) {
    return {
      valid: false,
      error: "Code invalide",
    };
  }

  return { valid: true };
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
      logger.error(`[referral-utils] Error checking referral usage for ${userId.substring(0, 8)}…: ${error.message}`);
      return false;
    }

    return (count || 0) > 0;
  } catch (error) {
    logger.error(`[referral-utils] Exception checking referral usage for ${userId.substring(0, 8)}…: ${error instanceof Error ? error.message : String(error)}`);
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
    logger.error(`[referral-utils] Exception checking self referral for ${userId.substring(0, 8)}…: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Octroie 1 mois (30 jours) de Premium gratuit à un joueur via le code promo CLUB.
 * Idempotent : si le compte a déjà bénéficié du code CLUB, rien n'est ré-octroyé.
 * On marque la source via payment_method pour que le cron d'expiration retire le
 * Premium au bout d'un mois (contrairement aux abonnements Stripe qui sont ignorés).
 */
async function grantClubPremium(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) return { success: false, error: "Service non disponible" };

  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("premium_until, payment_method")
      .eq("id", userId)
      .maybeSingle();

    // Idempotence : le code CLUB n'est utilisable qu'une seule fois par compte
    if (profile?.payment_method === CLUB_PAYMENT_METHOD) {
      return { success: true };
    }

    const now = new Date();
    let startFrom = now;

    // Si l'utilisateur a déjà du Premium actif, on prolonge depuis sa date de fin
    if (profile?.premium_until) {
      const currentEnd = new Date(profile.premium_until);
      if (currentEnd > now) {
        startFrom = currentEnd;
      }
    }

    const newEnd = new Date(startFrom);
    newEnd.setDate(newEnd.getDate() + CLUB_PREMIUM_DAYS);

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        is_premium: true,
        premium_until: newEnd.toISOString(),
        premium_since: now.toISOString(),
        payment_method: CLUB_PAYMENT_METHOD,
      })
      .eq("id", userId);

    if (error) {
      logger.error(`[referral-utils] Error granting CLUB premium to ${userId.substring(0, 8)}…: ${error.message}`);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    logger.error(`[referral-utils] Exception granting CLUB premium to ${userId.substring(0, 8)}…: ${error instanceof Error ? error.message : String(error)}`);
    return { success: false, error: "Erreur inconnue" };
  }
}

/**
 * Traite le code promo saisi à l'inscription d'un nouveau joueur.
 * Seul le code "CLUB" est accepté : il octroie automatiquement 1 mois de
 * Premium gratuit au joueur, sans paiement ni action supplémentaire.
 */
export async function processReferralCode(
  referralCode: string,
  referredUserId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!supabaseAdmin) {
    return {
      success: false,
      error: "Service non disponible",
    };
  }

  try {
    const normalizedCode = (referralCode || "").trim().toUpperCase();

    if (normalizedCode !== CLUB_PROMO_CODE) {
      return {
        success: false,
        error: "Code invalide",
      };
    }

    const granted = await grantClubPremium(referredUserId);
    if (!granted.success) {
      return {
        success: false,
        error: granted.error || "Erreur lors de l'attribution du Premium",
      };
    }

    return { success: true };
  } catch (error) {
    logger.error(`[referral-utils] Exception processing promo code for ${referredUserId.substring(0, 8)}…: ${error instanceof Error ? error.message : String(error)}`);
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
      maxReferrals: Infinity,
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
        maxReferrals: 2,
        referrals: [],
      };
    }

    let referralCode = profile.referral_code;

    // FIX: Si le code est manquant, on le génère à la volée
    if (!referralCode) {
      try {
        referralCode = await generateUniqueReferralCode();
        await supabaseAdmin
          .from("profiles")
          .update({ referral_code: referralCode })
          .eq("id", userId);
        logger.info(`[referral-utils] Generated missing referral code ${referralCode} for user ${userId.substring(0, 8)}…`);
      } catch (genError) {
        logger.error(`[referral-utils] Error generating lazy referral code for user ${userId.substring(0, 8)}…: ${genError instanceof Error ? genError.message : String(genError)}`);
      }
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
      referralCode: referralCode || null,
      referralCount: profile.referral_count || 0,
      maxReferrals: 2,
      referrals: referralsList,
    };
  } catch (error) {
    logger.error(`[referral-utils] Exception getting user referral info for ${userId.substring(0, 8)}…: ${error instanceof Error ? error.message : String(error)}`);
    return {
      referralCode: null,
      referralCount: 0,
      maxReferrals: Infinity,
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
    logger.error(`[referral-utils] Exception getting pending notifications for ${userId.substring(0, 8)}…: ${error instanceof Error ? error.message : String(error)}`);
    return { hasNewReferral: false };
  }
}

