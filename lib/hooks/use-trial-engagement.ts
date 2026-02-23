/**
 * Hook pour mettre à jour les métriques d'engagement après chaque action
 * À appeler après : ajout de joueur, création de match, création de challenge, connexion dashboard
 */

import { updateEngagementMetrics, checkAutoExtensionEligibility, grantAutoExtension } from '@/lib/trial-hybrid';
import { logger } from '@/lib/logger';

/**
 * Met à jour les métriques et vérifie l'extension automatique après une action
 */
export async function updateTrialEngagementAfterAction(clubId: string): Promise<void> {
  try {
    // Mettre à jour les métriques
    await updateEngagementMetrics(clubId);

    // Vérifier l'éligibilité à l'extension automatique
    const eligibility = await checkAutoExtensionEligibility(clubId);

    if (eligibility.eligible && eligibility.reason) {
      // Accorder l'extension automatique
      const result = await grantAutoExtension(clubId, eligibility.reason);

      if (result.success) {
        logger.info({ clubId: clubId.substring(0, 8) + '…', reason: eligibility.reason }, '[use-trial-engagement] Auto extension granted after action');

        // TODO: Envoyer notification in-app et email
        // await sendTrialEmail(clubId, 'auto_extension_granted');
        // await sendInAppNotification(clubId, 'auto_extension_granted');
      }
    }
  } catch (error) {
    logger.error({ clubId: clubId.substring(0, 8) + '…', error }, '[use-trial-engagement] Error updating engagement');
    // Ne pas bloquer l'action principale si la mise à jour échoue
  }
}

/**
 * Incrémente le compteur de connexions au dashboard
 */
export async function incrementDashboardLoginCount(clubId: string): Promise<void> {
  try {
    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return;
    }

    const supabaseAdmin = createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Incrémenter le compteur
    await supabaseAdmin.rpc('increment_club_dashboard_login_count', {
      p_club_id: clubId,
    });

    // Mettre à jour les métriques et vérifier l'extension
    await updateTrialEngagementAfterAction(clubId);
  } catch (error) {
    logger.error({ clubId: clubId.substring(0, 8) + '…', error }, '[use-trial-engagement] Error incrementing login count');
  }
}

/**
 * Incrémente le compteur d'invitations envoyées
 */
export async function incrementInvitationsSentCount(clubId: string): Promise<void> {
  try {
    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return;
    }

    const supabaseAdmin = createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Incrémenter le compteur
    await supabaseAdmin.rpc('increment_club_invitations_sent_count', {
      p_club_id: clubId,
    });

    // Mettre à jour les métriques et vérifier l'extension
    await updateTrialEngagementAfterAction(clubId);
  } catch (error) {
    logger.error({ clubId: clubId.substring(0, 8) + '…', error }, '[use-trial-engagement] Error incrementing invitations count');
  }
}

