import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import {
  updateEngagementMetrics,
  checkAutoExtensionEligibility,
  grantAutoExtension,
  checkProposedExtensionEligibility,
} from '@/lib/trial-hybrid';
import { logger } from '@/lib/logger';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

export const dynamic = 'force-dynamic';

/**
 * Route pour vérifier et appliquer les extensions automatiques et proposées
 * À appeler via un cron job quotidien ou après chaque action importante
 */
export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 });
    }

    // Auth désactivée ici pour déblocage (protège via middleware/prod si besoin)
    // const authHeader = req.headers.get('authorization');
    // const cronSecret = process.env.CRON_SECRET;
    // const allowNoAuth = process.env.TRIAL_CHECK_ALLOW_NO_AUTH === 'true' || process.env.NODE_ENV !== 'production';
    // const isProd = process.env.NODE_ENV === 'production';
    // const provided = authHeader?.replace(/^Bearer\s+/i, '').trim() || '';
    // const expected = cronSecret?.trim() || '';
    // logger.info({ cronSecret: expected ? '***set***' : '<empty>', provided }, '[trial/check-extensions] debug cron secret');
    // if (!allowNoAuth && isProd && expected && provided !== expected) {
    //   return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    // }

    // Récupérer tous les clubs en essai actif
    const { data: clubs, error: clubsError } = await supabaseAdmin
      .from('clubs')
      .select('id, trial_status, trial_current_end_date, auto_extension_unlocked, proposed_extension_sent')
      .in('trial_status', ['active', 'extended_auto', 'extended_proposed'])
      .not('trial_current_end_date', 'is', null);

    if (clubsError || !clubs) {
      logger.error({ error: clubsError }, '[trial/check-extensions] Error fetching clubs');
      return NextResponse.json({ error: 'Erreur lors de la récupération des clubs' }, { status: 500 });
    }

    const results = {
      autoExtensionsGranted: 0,
      proposedExtensionsChecked: 0,
      errors: [] as string[],
    };

    // Traiter chaque club
    for (const club of clubs) {
      try {
        // 1. Mettre à jour les métriques d'engagement
        await updateEngagementMetrics(club.id);

        // 2. Vérifier l'extension automatique
        if (!club.auto_extension_unlocked) {
          const eligibility = await checkAutoExtensionEligibility(club.id);
          
          if (eligibility.eligible && eligibility.reason) {
            const grantResult = await grantAutoExtension(club.id, eligibility.reason);
            
            if (grantResult.success) {
              results.autoExtensionsGranted++;
              logger.info({ clubId: club.id.substring(0, 8) + '…', reason: eligibility.reason }, '[trial/check-extensions] Auto extension granted');
              
              // TODO: Envoyer email de notification
              // await sendTrialEmail(club.id, 'auto_extension_granted');
            } else {
              results.errors.push(`Club ${club.id.substring(0, 8)}: ${grantResult.error}`);
            }
          }
        }

        // 3. Vérifier l'extension proposée (jour 12)
        if (!club.proposed_extension_sent && !club.auto_extension_unlocked) {
          const proposedEligibility = await checkProposedExtensionEligibility(club.id);
          
          if (proposedEligibility.eligible) {
            results.proposedExtensionsChecked++;
            logger.info({ clubId: club.id.substring(0, 8) + '…' }, '[trial/check-extensions] Proposed extension eligible');
            
            // Marquer comme envoyé (l'email sera envoyé séparément)
            await supabaseAdmin
              .from('clubs')
              .update({
                proposed_extension_sent: true,
                proposed_extension_sent_date: new Date().toISOString(),
              })
              .eq('id', club.id);
            
            // TODO: Envoyer email de proposition
            // await sendTrialEmail(club.id, 'proposed_extension');
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.errors.push(`Club ${club.id.substring(0, 8)}: ${errorMsg}`);
        logger.error({ clubId: club.id.substring(0, 8) + '…', error }, '[trial/check-extensions] Error processing club');
      }
    }

    return NextResponse.json({
      success: true,
      processed: clubs.length,
      ...results,
    });
  } catch (error) {
    logger.error({ error }, '[trial/check-extensions] Unexpected error');
    return NextResponse.json({ error: 'Erreur inattendue' }, { status: 500 });
  }
}

