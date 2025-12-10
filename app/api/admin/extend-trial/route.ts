import { NextRequest, NextResponse } from "next/server";
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
 * Route API pour étendre manuellement l'essai d'un club
 * 
 * Cette route :
 * 1. Ajoute 16 jours à la date de fin actuelle (14 → 30 jours)
 * 2. Met à jour la base de données (trial_current_end_date, auto_extension_unlocked, etc.)
 * 3. Met à jour Stripe si une subscription existe
 * 
 * Usage:
 * POST /api/admin/extend-trial
 * Body: { "clubId": "uuid-du-club" }
 */
export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Configuration Supabase manquante" },
        { status: 500 }
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { error: "Configuration Stripe manquante" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { clubId } = body;

    if (!clubId || typeof clubId !== 'string') {
      return NextResponse.json(
        { error: "clubId requis (UUID)" },
        { status: 400 }
      );
    }

    // Récupérer le club
    const { data: club, error: fetchError } = await supabaseAdmin
      .from('clubs')
      .select('id, name, trial_start_date, trial_end_date, trial_current_end_date, auto_extension_unlocked, auto_extension_reason, stripe_subscription_id')
      .eq('id', clubId)
      .single();

    if (fetchError || !club) {
      logger.error({ clubId: clubId.substring(0, 8) + '…', error: fetchError }, '[extend-trial] Error fetching club');
      return NextResponse.json(
        { error: "Club introuvable" },
        { status: 404 }
      );
    }

    if (!club.trial_start_date) {
      return NextResponse.json(
        { error: "Le club n'a pas de date de début d'essai" },
        { status: 400 }
      );
    }

    // Calculer la nouvelle date de fin
    // Si trial_current_end_date existe, ajouter 16 jours
    // Sinon, calculer à partir de trial_start_date + 30 jours
    let newEndDate: Date;
    
    if (club.trial_current_end_date) {
      const currentEndDate = new Date(club.trial_current_end_date);
      newEndDate = new Date(currentEndDate);
      newEndDate.setDate(newEndDate.getDate() + 16);
    } else if (club.trial_end_date) {
      const currentEndDate = new Date(club.trial_end_date);
      newEndDate = new Date(currentEndDate);
      newEndDate.setDate(newEndDate.getDate() + 16);
    } else {
      // Fallback: 30 jours depuis le début
      const startDate = new Date(club.trial_start_date);
      newEndDate = new Date(startDate);
      newEndDate.setDate(newEndDate.getDate() + 30);
    }

    // Déterminer la raison de l'extension
    const extensionReason = club.auto_extension_reason || 'manual';

    // Mettre à jour la base de données
    const updateData: any = {
      trial_current_end_date: newEndDate.toISOString(),
      trial_end_date: newEndDate.toISOString(), // Compatibilité avec l'ancien système
      trial_status: 'extended_auto',
      auto_extension_unlocked: true,
      auto_extension_reason: extensionReason
    };

    const { error: updateError } = await supabaseAdmin
      .from('clubs')
      .update(updateData)
      .eq('id', clubId);

    if (updateError) {
      logger.error({ 
        clubId: clubId.substring(0, 8) + '…',
        error: updateError 
      }, '[extend-trial] Error updating club');
      return NextResponse.json(
        { error: `Erreur lors de la mise à jour: ${updateError.message}` },
        { status: 500 }
      );
    }

    logger.info({ 
      clubId: clubId.substring(0, 8) + '…',
      clubName: club.name,
      newEndDate: newEndDate.toISOString()
    }, '[extend-trial] Club database updated');

    // Mettre à jour Stripe si une subscription existe
    let stripeUpdated = false;
    let stripeError: string | null = null;

    if (club.stripe_subscription_id) {
      try {
        const trialEndTimestamp = Math.floor(newEndDate.getTime() / 1000);
        await stripe.subscriptions.update(club.stripe_subscription_id, {
          trial_end: trialEndTimestamp,
          proration_behavior: 'none'
        });
        stripeUpdated = true;
        logger.info({ 
          clubId: clubId.substring(0, 8) + '…',
          subscriptionId: club.stripe_subscription_id.substring(0, 8) + '…',
          newTrialEnd: newEndDate.toISOString(),
          trialEndTimestamp
        }, '[extend-trial] Stripe subscription updated');
      } catch (stripeErr: any) {
        stripeError = stripeErr?.message || String(stripeErr);
        logger.error({ 
          clubId: clubId.substring(0, 8) + '…',
          subscriptionId: club.stripe_subscription_id.substring(0, 8) + '…',
          error: stripeError
        }, '[extend-trial] Error updating Stripe subscription');
      }
    }

    return NextResponse.json({
      success: true,
      message: "Extension d'essai appliquée avec succès",
      club: {
        id: club.id,
        name: club.name,
        trial_start_date: club.trial_start_date,
        trial_current_end_date: newEndDate.toISOString(),
        auto_extension_unlocked: true,
        auto_extension_reason: extensionReason
      },
      stripe: {
        updated: stripeUpdated,
        subscription_id: club.stripe_subscription_id || null,
        error: stripeError || null
      }
    });
  } catch (error: any) {
    logger.error({ error: error?.message || String(error) }, '[extend-trial] Unexpected error');
    return NextResponse.json(
      { error: `Erreur inattendue: ${error?.message || String(error)}` },
      { status: 500 }
    );
  }
}

