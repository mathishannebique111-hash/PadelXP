import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { logger } from "@/lib/logger";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
    })
  : null;

/**
 * Route API pour corriger les clubs qui avaient déjà débloqué l'extension
 * automatique avant les modifications récentes.
 * 
 * Cette route :
 * 1. Identifie les clubs avec auto_extension_unlocked = true
 * 2. Recalcule trial_current_end_date à J+30 depuis le début
 * 3. Met à jour Stripe si une subscription existe
 */
export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Configuration Supabase manquante" },
        { status: 500 }
      );
    }

    // Récupérer tous les clubs avec extension automatique débloquée
    // OU les clubs qui ont 30 jours mais pas le flag (à corriger)
    const { data: clubs, error: fetchError } = await supabaseAdmin
      .from('clubs')
      .select('id, name, trial_start_date, trial_end_date, trial_current_end_date, auto_extension_unlocked, auto_extension_reason, stripe_subscription_id, total_players_count, total_matches_count')
      .not('trial_start_date', 'is', null)
      .or('auto_extension_unlocked.eq.true,auto_extension_unlocked.is.null');

    if (fetchError) {
      logger.error({ error: fetchError }, '[fix-auto-extensions] Error fetching clubs');
      return NextResponse.json(
        { error: "Erreur lors de la récupération des clubs" },
        { status: 500 }
      );
    }

    if (!clubs || clubs.length === 0) {
      return NextResponse.json({
        message: "Aucun club avec extension automatique trouvé",
        fixed: 0,
        stripe_updated: 0
      });
    }

    let fixedCount = 0;
    let stripeUpdatedCount = 0;
    const errors: Array<{ clubId: string; error: string }> = [];

    for (const club of clubs) {
      try {
        if (!club.trial_start_date) {
          continue;
        }

        const startDate = new Date(club.trial_start_date);
        
        // Utiliser trial_current_end_date si disponible, sinon trial_end_date, sinon calculer
        const currentEndDateValue = club.trial_current_end_date || club.trial_end_date;
        
        // Calculer la durée actuelle si on a une date de fin
        let currentDays = 0;
        if (currentEndDateValue) {
          const currentEndDate = new Date(currentEndDateValue);
          currentDays = Math.ceil((currentEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        }

        // Si le club a déjà 30 jours et le flag, vérifier la synchronisation
        if (currentDays >= 29 && club.auto_extension_unlocked && club.trial_current_end_date && club.trial_end_date) {
          // Vérifier si trial_end_date est aussi à jour
          const trialEndDate = new Date(club.trial_end_date);
          const trialCurrentEndDate = new Date(club.trial_current_end_date);
          const daysDiff = Math.abs(trialEndDate.getTime() - trialCurrentEndDate.getTime()) / (1000 * 60 * 60 * 24);
          
          // Si les deux dates sont synchronisées, on passe
          if (daysDiff < 1) {
            continue;
          }
        }

        // Calculer la nouvelle date de fin (J+30 depuis le début)
        const newEndDate = new Date(startDate);
        newEndDate.setDate(newEndDate.getDate() + 30);
        
        // Déterminer la raison de l'extension si pas déjà définie
        let extensionReason = club.auto_extension_reason;
        if (!extensionReason) {
          if ((club.total_players_count || 0) >= 10) {
            extensionReason = '10_players';
          } else if ((club.total_matches_count || 0) >= 20) {
            extensionReason = '20_matches';
          }
        }

        // Mettre à jour la base de données
        // Mettre à jour trial_current_end_date ET trial_end_date (pour compatibilité)
        // Ajouter le flag auto_extension_unlocked si pas déjà présent
        const updateData: any = {
          trial_current_end_date: newEndDate.toISOString(),
          trial_end_date: newEndDate.toISOString(), // Compatibilité avec l'ancien système
          trial_status: 'extended_auto',
          auto_extension_unlocked: true
        };
        
        // Ajouter la raison si elle existe
        if (extensionReason) {
          updateData.auto_extension_reason = extensionReason;
        }
        
        const { error: updateError } = await supabaseAdmin
          .from('clubs')
          .update(updateData)
          .eq('id', club.id);

        if (updateError) {
          logger.error({ 
            clubId: club.id.substring(0, 8) + '…',
            error: updateError 
          }, '[fix-auto-extensions] Error updating club');
          errors.push({ 
            clubId: club.id, 
            error: `Erreur DB: ${updateError.message}` 
          });
          continue;
        }

        fixedCount++;

        // Mettre à jour Stripe si une subscription existe
        if (club.stripe_subscription_id && stripe) {
          try {
            const trialEndTimestamp = Math.floor(newEndDate.getTime() / 1000);
            await stripe.subscriptions.update(club.stripe_subscription_id, {
              trial_end: trialEndTimestamp,
            });
            stripeUpdatedCount++;
            logger.info({ 
              clubId: club.id.substring(0, 8) + '…',
              subscriptionId: club.stripe_subscription_id.substring(0, 8) + '…',
              newTrialEnd: newEndDate.toISOString()
            }, '[fix-auto-extensions] Stripe subscription updated');
          } catch (stripeError: any) {
            logger.error({ 
              clubId: club.id.substring(0, 8) + '…',
              error: stripeError?.message || String(stripeError)
            }, '[fix-auto-extensions] Error updating Stripe subscription');
            errors.push({ 
              clubId: club.id, 
              error: `Erreur Stripe: ${stripeError?.message || String(stripeError)}` 
            });
          }
        }
      } catch (error: any) {
        logger.error({ 
          clubId: club.id.substring(0, 8) + '…',
          error: error?.message || String(error)
        }, '[fix-auto-extensions] Unexpected error processing club');
        errors.push({ 
          clubId: club.id, 
          error: `Erreur inattendue: ${error?.message || String(error)}` 
        });
      }
    }

    return NextResponse.json({
      message: "Correction des extensions automatiques terminée",
      total_clubs: clubs.length,
      fixed: fixedCount,
      stripe_updated: stripeUpdatedCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    logger.error({ error: error?.message || String(error) }, '[fix-auto-extensions] Unexpected error');
    return NextResponse.json(
      { error: "Erreur inattendue lors de la correction" },
      { status: 500 }
    );
  }
}

