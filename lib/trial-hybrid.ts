/**
 * Système d'essai gratuit hybride
 * Gestion des essais avec extensions automatiques, proposées et manuelles
 */

import { createClient as createServiceClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import Stripe from 'stripe';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  : null;

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
  })
  : null;

export type TrialStatus = 'active' | 'extended_auto' | 'extended_proposed' | 'extended_manual' | 'expired' | 'converted';
export type AutoExtensionReason = '20_matches' | '10_players';

export interface TrialMetrics {
  playersCount: number;
  matchesCount: number;
  challengesCount: number;
  dashboardLoginCount: number;
  invitationsSentCount: number;
}

export interface EngagementSignals {
  has4to9Players: boolean;
  has10to19Matches: boolean;
  has3PlusLogins: boolean;
  hasSentInvitation: boolean;
}

/**
 * Initialise un essai gratuit de 14 jours pour un nouveau club
 */
export async function initiateTrial(clubId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) {
    return { success: false, error: 'Configuration manquante' };
  }

  try {
    const now = new Date();

    // Récupérer l'offer_type du club pour déterminer la durée de l'essai
    const { data: club } = await supabaseAdmin
      .from('clubs')
      .select('offer_type')
      .eq('id', clubId)
      .single();

    const offerType = club?.offer_type || 'standard';
    const trialDuration = offerType === 'founder' ? 90 : 14;

    const baseEndDate = new Date(now);
    baseEndDate.setDate(baseEndDate.getDate() + trialDuration);

    // Essayer d'abord avec les nouveaux champs (système hybride)
    const newSystemUpdate = {
      trial_start_date: now.toISOString(),
      trial_end_date: baseEndDate.toISOString(), // Compatibilité avec l'ancien système
      trial_base_end_date: baseEndDate.toISOString(),
      trial_current_end_date: baseEndDate.toISOString(),
      trial_status: 'active',
      auto_extension_unlocked: false,
      proposed_extension_sent: false,
      manual_extension_granted: false,
      total_players_count: 0,
      total_matches_count: 0,
      total_challenges_count: 0,
      dashboard_login_count: 0,
      invitations_sent_count: 0,
    };

    let { error } = await supabaseAdmin
      .from('clubs')
      .update(newSystemUpdate)
      .eq('id', clubId);

    // Si erreur due à des colonnes manquantes, essayer avec l'ancien système uniquement
    if (error && (error.message?.includes('column') || error.message?.includes('does not exist'))) {
      logger.warn({ clubId: clubId.substring(0, 8) + '…' }, '[trial-hybrid] New trial columns not found, using old system (14 days)');

      // Mise à jour avec l'ancien système uniquement (14 jours au lieu de 30)
      const oldSystemUpdate = {
        trial_start_date: now.toISOString(),
        trial_end_date: baseEndDate.toISOString(), // 14 jours
      };

      const { error: oldError } = await supabaseAdmin
        .from('clubs')
        .update(oldSystemUpdate)
        .eq('id', clubId);

      if (oldError) {
        logger.error({ clubId: clubId.substring(0, 8) + '…', error: oldError }, '[trial-hybrid] Error initiating trial (old system)');
        return { success: false, error: oldError.message };
      }
    } else if (error) {
      logger.error({ clubId: clubId.substring(0, 8) + '…', error }, '[trial-hybrid] Error initiating trial');
      return { success: false, error: error.message };
    }

    logger.info({ clubId: clubId.substring(0, 8) + '…' }, '[trial-hybrid] Trial initiated (14 days)');
    return { success: true };
  } catch (error) {
    logger.error({ clubId: clubId.substring(0, 8) + '…', error }, '[trial-hybrid] Unexpected error initiating trial');
    return { success: false, error: 'Erreur inattendue' };
  }
}

/**
 * Calcule le nombre de jours restants avant la fin de l'essai
 */
export function getTrialDaysRemaining(trialCurrentEndDate: string | null): number | null {
  if (!trialCurrentEndDate) return null;

  const endDate = new Date(trialCurrentEndDate);
  const now = new Date();

  const endMidnight = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = endMidnight.getTime() - nowMidnight.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, daysRemaining);
}

/**
 * Vérifie si l'essai est actif
 */
export function isTrialActive(trialCurrentEndDate: string | null, trialStatus: TrialStatus | null): boolean {
  if (!trialCurrentEndDate || trialStatus === 'expired' || trialStatus === 'converted') {
    return false;
  }

  const daysRemaining = getTrialDaysRemaining(trialCurrentEndDate);
  return daysRemaining !== null && daysRemaining > 0;
}

/**
 * Marque l'essai comme expiré
 */
export async function expireTrial(clubId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) {
    return { success: false, error: 'Configuration manquante' };
  }

  try {
    const { error } = await supabaseAdmin
      .from('clubs')
      .update({ trial_status: 'expired' })
      .eq('id', clubId);

    if (error) {
      logger.error({ clubId: clubId.substring(0, 8) + '…', error }, '[trial-hybrid] Error expiring trial');
      return { success: false, error: error.message };
    }

    logger.info({ clubId: clubId.substring(0, 8) + '…' }, '[trial-hybrid] Trial expired');
    return { success: true };
  } catch (error) {
    logger.error({ clubId: clubId.substring(0, 8) + '…', error }, '[trial-hybrid] Unexpected error expiring trial');
    return { success: false, error: 'Erreur inattendue' };
  }
}

/**
 * Met à jour les métriques d'engagement d'un club
 */
export async function updateEngagementMetrics(clubId: string): Promise<{ success: boolean; metrics?: TrialMetrics; error?: string }> {
  if (!supabaseAdmin) {
    return { success: false, error: 'Configuration manquante' };
  }

  try {
    // Compter les joueurs
    const { count: playersCount } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', clubId);

    // Récupérer les joueurs du club pour compter les matchs
    const { data: clubPlayers, error: clubPlayersError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('club_id', clubId);

    if (clubPlayersError) {
      logger.error({ clubId: clubId.substring(0, 8) + '…', error: clubPlayersError }, '[trial-hybrid] Error fetching club players for metrics');
      return { success: false, error: clubPlayersError.message };
    }

    const playerIds = (clubPlayers || []).map(p => p.id);

    // Compter les matchs via match_participants (distinct match_id)
    let matchesCount = 0;
    if (playerIds.length > 0) {
      const { count, error: matchesCountError } = await supabaseAdmin
        .from('match_participants')
        .select('match_id', { count: 'exact', head: true, distinct: true })
        .in('user_id', playerIds);

      if (matchesCountError) {
        logger.error({ clubId: clubId.substring(0, 8) + '…', error: matchesCountError }, '[trial-hybrid] Error counting matches for metrics');
        return { success: false, error: matchesCountError.message };
      }
      matchesCount = count || 0;
    }

    // Compter les challenges depuis le storage (bucket "club-challenges")
    // Les challenges sont stockés dans des fichiers JSON : ${clubId}.json
    let challengesCount = 0;
    try {
      const { data, error: storageError } = await supabaseAdmin.storage
        .from('club-challenges')
        .download(`${clubId}.json`);

      if (!storageError && data) {
        const text = await data.text();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          challengesCount = parsed.length;
        }
      }
    } catch (error) {
      // Si le fichier n'existe pas ou erreur de parsing, challengesCount reste à 0
      logger.warn({ clubId: clubId.substring(0, 8) + '…', error }, '[trial-hybrid] Error counting challenges from storage');
    }

    const metrics: TrialMetrics = {
      playersCount: playersCount || 0,
      matchesCount,
      challengesCount: challengesCount || 0,
      dashboardLoginCount: 0, // Sera mis à jour séparément
      invitationsSentCount: 0, // Sera mis à jour séparément
    };

    // Mettre à jour dans la base
    const { error } = await supabaseAdmin
      .from('clubs')
      .update({
        total_players_count: metrics.playersCount,
        total_matches_count: metrics.matchesCount,
        total_challenges_count: metrics.challengesCount,
        last_engagement_check_date: new Date().toISOString(),
      })
      .eq('id', clubId);

    if (error) {
      logger.error({ clubId: clubId.substring(0, 8) + '…', error }, '[trial-hybrid] Error updating metrics');
      return { success: false, error: error.message };
    }

    return { success: true, metrics };
  } catch (error) {
    logger.error({ clubId: clubId.substring(0, 8) + '…', error }, '[trial-hybrid] Unexpected error updating metrics');
    return { success: false, error: 'Erreur inattendue' };
  }
}

/**
 * Vérifie si le club est éligible à l'extension automatique
 */
export async function checkAutoExtensionEligibility(clubId: string): Promise<{
  eligible: boolean;
  reason?: AutoExtensionReason;
  metrics?: TrialMetrics;
}> {
  if (!supabaseAdmin) {
    return { eligible: false };
  }

  try {
    // Recalculer les métriques à jour
    const metricsResult = await updateEngagementMetrics(clubId);
    if (!metricsResult.success || !metricsResult.metrics) {
      return { eligible: false };
    }
    const metrics = metricsResult.metrics;

    // Récupérer le flag d'auto-extension
    const { data: club } = await supabaseAdmin
      .from('clubs')
      .select('auto_extension_unlocked, total_challenges_count, dashboard_login_count')
      .eq('id', clubId)
      .single();

    if (!club || club.auto_extension_unlocked) {
      return { eligible: false };
    }

    // Seuils : 10 joueurs OU 20 matchs
    if (metrics.playersCount >= 10) {
      return { eligible: true, reason: '10_players', metrics };
    }

    if (metrics.matchesCount >= 20) {
      return { eligible: true, reason: '20_matches', metrics };
    }

    return { eligible: false };
  } catch (error) {
    logger.error({ clubId: clubId.substring(0, 8) + '…', error }, '[trial-hybrid] Error checking auto extension eligibility');
    return { eligible: false };
  }
}

/**
 * Accorde l'extension automatique (14 → 30 jours)
 */
export async function grantAutoExtension(
  clubId: string,
  reason: AutoExtensionReason
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) {
    return { success: false, error: 'Configuration manquante' };
  }

  try {
    // Récupérer la date de fin actuelle
    const { data: club } = await supabaseAdmin
      .from('clubs')
      .select('trial_current_end_date')
      .eq('id', clubId)
      .single();

    if (!club || !club.trial_current_end_date) {
      return { success: false, error: 'Club ou date de fin introuvable' };
    }

    // Ajouter 15 jours à la date de fin actuelle (extension automatique: 14 → 30 jours)
    const currentEndDate = new Date(club.trial_current_end_date);
    const newEndDate = new Date(currentEndDate);
    newEndDate.setDate(newEndDate.getDate() + 15);

    // Récupérer le club pour vérifier s'il a une subscription Stripe
    const { data: clubWithStripe } = await supabaseAdmin
      .from('clubs')
      .select('stripe_subscription_id')
      .eq('id', clubId)
      .single();

    // Mettre à jour la base de données
    const { error } = await supabaseAdmin
      .from('clubs')
      .update({
        trial_current_end_date: newEndDate.toISOString(),
        trial_status: 'extended_auto',
        auto_extension_unlocked: true,
        auto_extension_reason: reason,
      })
      .eq('id', clubId);

    if (error) {
      logger.error({ clubId: clubId.substring(0, 8) + '…', error }, '[trial-hybrid] Error granting auto extension');
      return { success: false, error: error.message };
    }

    // Mettre à jour Stripe si une subscription existe
    if (clubWithStripe?.stripe_subscription_id && stripe) {
      try {
        const trialEndTimestamp = Math.floor(newEndDate.getTime() / 1000);
        await stripe.subscriptions.update(clubWithStripe.stripe_subscription_id, {
          trial_end: trialEndTimestamp,
        });
        logger.info({
          clubId: clubId.substring(0, 8) + '…',
          subscriptionId: clubWithStripe.stripe_subscription_id.substring(0, 8) + '…',
          newTrialEnd: newEndDate.toISOString()
        }, '[trial-hybrid] Stripe subscription trial_end updated after auto extension');
      } catch (stripeError: any) {
        logger.error({
          clubId: clubId.substring(0, 8) + '…',
          error: stripeError?.message || String(stripeError)
        }, '[trial-hybrid] Error updating Stripe subscription trial_end after auto extension');
        // Ne pas faire échouer l'opération si Stripe échoue, on log juste l'erreur
      }
    }

    logger.info({ clubId: clubId.substring(0, 8) + '…', reason }, '[trial-hybrid] Auto extension granted');
    return { success: true };
  } catch (error) {
    logger.error({ clubId: clubId.substring(0, 8) + '…', error }, '[trial-hybrid] Unexpected error granting auto extension');
    return { success: false, error: 'Erreur inattendue' };
  }
}

/**
 * Vérifie si le club est éligible à l'extension proposée (jour 12)
 */
export async function checkProposedExtensionEligibility(clubId: string): Promise<{
  eligible: boolean;
  signals?: EngagementSignals;
}> {
  if (!supabaseAdmin) {
    return { eligible: false };
  }

  try {
    // Récupérer le club
    const { data: club } = await supabaseAdmin
      .from('clubs')
      .select(
        'trial_start_date, trial_base_end_date, proposed_extension_sent, auto_extension_unlocked, ' +
        'total_players_count, total_matches_count, dashboard_login_count, invitations_sent_count'
      )
      .eq('id', clubId)
      .single();

    if (!club || !club.trial_start_date || !club.trial_base_end_date) {
      return { eligible: false };
    }

    // Vérifier qu'on est au jour 12
    const startDate = new Date(club.trial_start_date);
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceStart !== 12) {
      return { eligible: false };
    }

    // Vérifier que l'extension automatique n'a pas été débloquée
    if (club.auto_extension_unlocked) {
      return { eligible: false };
    }

    // Vérifier que l'email n'a pas déjà été envoyé
    if (club.proposed_extension_sent) {
      return { eligible: false };
    }

    // Vérifier les signaux d'engagement moyen
    const signals: EngagementSignals = {
      has4to9Players: (club.total_players_count || 0) >= 4 && (club.total_players_count || 0) < 10,
      has10to19Matches: (club.total_matches_count || 0) >= 10 && (club.total_matches_count || 0) < 20,
      has3PlusLogins: (club.dashboard_login_count || 0) >= 3,
      hasSentInvitation: (club.invitations_sent_count || 0) >= 1,
    };

    const signalCount = Object.values(signals).filter(Boolean).length;

    if (signalCount >= 2) {
      return { eligible: true, signals };
    }

    return { eligible: false, signals };
  } catch (error) {
    logger.error({ clubId: clubId.substring(0, 8) + '…', error }, '[trial-hybrid] Error checking proposed extension eligibility');
    return { eligible: false };
  }
}

/**
 * Accorde l'extension proposée (+15 jours)
 */
export async function acceptProposedExtension(clubId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) {
    return { success: false, error: 'Configuration manquante' };
  }

  try {
    // Récupérer la date de fin actuelle
    const { data: club } = await supabaseAdmin
      .from('clubs')
      .select('trial_current_end_date')
      .eq('id', clubId)
      .single();

    if (!club || !club.trial_current_end_date) {
      return { success: false, error: 'Club ou date de fin introuvable' };
    }

    const currentEndDate = new Date(club.trial_current_end_date);
    const newEndDate = new Date(currentEndDate);
    newEndDate.setDate(newEndDate.getDate() + 15);

    // Récupérer le club pour vérifier s'il a une subscription Stripe
    const { data: clubWithStripe } = await supabaseAdmin
      .from('clubs')
      .select('stripe_subscription_id')
      .eq('id', clubId)
      .single();

    // Mettre à jour la base de données
    const { error } = await supabaseAdmin
      .from('clubs')
      .update({
        trial_current_end_date: newEndDate.toISOString(),
        trial_status: 'extended_proposed',
        proposed_extension_accepted: true,
      })
      .eq('id', clubId);

    if (error) {
      logger.error({ clubId: clubId.substring(0, 8) + '…', error }, '[trial-hybrid] Error accepting proposed extension');
      return { success: false, error: error.message };
    }

    // Mettre à jour Stripe si une subscription existe
    if (clubWithStripe?.stripe_subscription_id && stripe) {
      try {
        const trialEndTimestamp = Math.floor(newEndDate.getTime() / 1000);
        await stripe.subscriptions.update(clubWithStripe.stripe_subscription_id, {
          trial_end: trialEndTimestamp,
        });
        logger.info({
          clubId: clubId.substring(0, 8) + '…',
          subscriptionId: clubWithStripe.stripe_subscription_id.substring(0, 8) + '…',
          newTrialEnd: newEndDate.toISOString()
        }, '[trial-hybrid] Stripe subscription trial_end updated after proposed extension');
      } catch (stripeError: any) {
        logger.error({
          clubId: clubId.substring(0, 8) + '…',
          error: stripeError?.message || String(stripeError)
        }, '[trial-hybrid] Error updating Stripe subscription trial_end after proposed extension');
        // Ne pas faire échouer l'opération si Stripe échoue, on log juste l'erreur
      }
    }

    logger.info({ clubId: clubId.substring(0, 8) + '…' }, '[trial-hybrid] Proposed extension accepted');
    return { success: true };
  } catch (error) {
    logger.error({ clubId: clubId.substring(0, 8) + '…', error }, '[trial-hybrid] Unexpected error accepting proposed extension');
    return { success: false, error: 'Erreur inattendue' };
  }
}

/**
 * Accorde une extension manuelle par un admin
 */
export async function grantManualExtension(
  clubId: string,
  days: number,
  notes: string | null,
  adminUserId: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) {
    return { success: false, error: 'Configuration manquante' };
  }

  try {
    // Récupérer la date de fin actuelle
    const { data: club } = await supabaseAdmin
      .from('clubs')
      .select('trial_current_end_date')
      .eq('id', clubId)
      .single();

    if (!club || !club.trial_current_end_date) {
      return { success: false, error: 'Club ou date de fin introuvable' };
    }

    const currentEndDate = new Date(club.trial_current_end_date);
    const newEndDate = new Date(currentEndDate);
    newEndDate.setDate(newEndDate.getDate() + days);

    // Récupérer le club pour vérifier s'il a une subscription Stripe
    const { data: clubWithStripe } = await supabaseAdmin
      .from('clubs')
      .select('stripe_subscription_id')
      .eq('id', clubId)
      .single();

    // Mettre à jour la base de données
    const { error } = await supabaseAdmin
      .from('clubs')
      .update({
        trial_current_end_date: newEndDate.toISOString(),
        trial_status: 'extended_manual',
        manual_extension_granted: true,
        manual_extension_date: new Date().toISOString(),
        manual_extension_days: days,
        manual_extension_notes: notes,
        manual_extension_by_user_id: adminUserId,
      })
      .eq('id', clubId);

    if (error) {
      logger.error({ clubId: clubId.substring(0, 8) + '…', error }, '[trial-hybrid] Error granting manual extension');
      return { success: false, error: error.message };
    }

    // Mettre à jour Stripe si une subscription existe
    if (clubWithStripe?.stripe_subscription_id && stripe) {
      try {
        const trialEndTimestamp = Math.floor(newEndDate.getTime() / 1000);
        await stripe.subscriptions.update(clubWithStripe.stripe_subscription_id, {
          trial_end: trialEndTimestamp,
        });
        logger.info({
          clubId: clubId.substring(0, 8) + '…',
          subscriptionId: clubWithStripe.stripe_subscription_id.substring(0, 8) + '…',
          newTrialEnd: newEndDate.toISOString(),
          days
        }, '[trial-hybrid] Stripe subscription trial_end updated after manual extension');
      } catch (stripeError: any) {
        logger.error({
          clubId: clubId.substring(0, 8) + '…',
          error: stripeError?.message || String(stripeError)
        }, '[trial-hybrid] Error updating Stripe subscription trial_end after manual extension');
        // Ne pas faire échouer l'opération si Stripe échoue, on log juste l'erreur
      }
    }

    logger.info({ clubId: clubId.substring(0, 8) + '…', days, adminUserId: adminUserId.substring(0, 8) + '…' }, '[trial-hybrid] Manual extension granted');
    return { success: true };
  } catch (error) {
    logger.error({ clubId: clubId.substring(0, 8) + '…', error }, '[trial-hybrid] Unexpected error granting manual extension');
    return { success: false, error: 'Erreur inattendue' };
  }
}

/**
 * Calcule le score d'engagement d'un club (low/medium/high)
 */
export async function getTrialEngagementScore(clubId: string): Promise<'low' | 'medium' | 'high'> {
  if (!supabaseAdmin) {
    return 'low';
  }

  try {
    const { data: club } = await supabaseAdmin
      .from('clubs')
      .select('total_players_count, total_matches_count, total_challenges_count, dashboard_login_count')
      .eq('id', clubId)
      .single();

    if (!club) {
      return 'low';
    }

    const players = club.total_players_count || 0;
    const matches = club.total_matches_count || 0;
    const challenges = club.total_challenges_count || 0;
    const logins = club.dashboard_login_count || 0;

    // Score basé sur les seuils
    let score = 0;
    if (players >= 10) score += 3;
    else if (players >= 4) score += 1;

    if (matches >= 20) score += 3;
    else if (matches >= 10) score += 1;

    if (challenges >= 1) score += 2;

    if (logins >= 3) score += 1;

    if (score >= 6) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  } catch (error) {
    logger.error({ clubId: clubId.substring(0, 8) + '…', error }, '[trial-hybrid] Error calculating engagement score');
    return 'low';
  }
}

/**
 * Vérifie si un club peut accéder à une fonctionnalité premium
 */
export async function canAccessFeature(clubId: string, feature: string): Promise<boolean> {
  if (!supabaseAdmin) {
    return false;
  }

  try {
    const { data: club } = await supabaseAdmin
      .from('clubs')
      .select('trial_current_end_date, trial_status, subscription_status')
      .eq('id', clubId)
      .single();

    if (!club) {
      return false;
    }

    // Si abonnement actif, accès complet
    if (club.subscription_status === 'active') {
      return true;
    }

    // Si essai actif, accès complet
    const isActive = isTrialActive(club.trial_current_end_date, club.trial_status as TrialStatus);
    return isActive;
  } catch (error) {
    logger.error({ clubId: clubId.substring(0, 8) + '…', error }, '[trial-hybrid] Error checking feature access');
    return false;
  }
}

