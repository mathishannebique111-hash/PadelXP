import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { getUserClubInfo } from '@/lib/utils/club-utils';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !supabaseAdmin) {
      return NextResponse.json(
        { error: 'Configuration manquante' },
        { status: 500 }
      );
    }

    // Vérifier l'authentification
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { clubId } = await getUserClubInfo();
    if (!clubId) {
      return NextResponse.json(
        { error: 'Club non trouvé' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { clubId: bodyClubId } = body;

    // Vérifier que le clubId correspond
    if (bodyClubId !== clubId) {
      return NextResponse.json(
        { error: 'Club ID invalide' },
        { status: 400 }
      );
    }

    // Récupérer le club
    const { data: club, error: clubError } = await supabaseAdmin
      .from('clubs')
      .select('stripe_subscription_id, subscription_status')
      .eq('id', clubId)
      .single();

    if (clubError || !club || !club.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'Abonnement non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier que l'abonnement est annulé
    if (club.subscription_status !== 'canceled') {
      return NextResponse.json(
        { error: 'L\'abonnement n\'est pas annulé' },
        { status: 400 }
      );
    }

    // Récupérer la subscription Stripe
    let stripeSubscription: Stripe.Subscription;
    try {
      stripeSubscription = await stripe.subscriptions.retrieve(club.stripe_subscription_id);
    } catch (err) {
      logger.error({ error: err, subscriptionId: club.stripe_subscription_id.substring(0, 8) + "…" }, '[reactivate-subscription] Error retrieving Stripe subscription');
      return NextResponse.json(
        { error: 'Erreur lors de la récupération de l\'abonnement Stripe' },
        { status: 500 }
      );
    }

    // Vérifier que la période n'est pas déjà terminée
    if (stripeSubscription.current_period_end) {
      const periodEnd = new Date(stripeSubscription.current_period_end * 1000);
      if (periodEnd <= new Date()) {
        return NextResponse.json(
          { error: 'Impossible de réactiver : la période d\'abonnement est déjà terminée' },
          { status: 400 }
        );
      }
    }

    // Réactiver l'abonnement Stripe (annuler l'annulation)
    try {
      await stripe.subscriptions.update(club.stripe_subscription_id, {
        cancel_at_period_end: false,
      });
    } catch (err: any) {
      const message = err instanceof Error ? err.message : String(err);

      // Cas particulier : l'abonnement est déjà entièrement annulé côté Stripe
      if (message.includes('A canceled subscription can only update its cancellation_details')) {
        logger.warn({ clubId: clubId.substring(0, 8) + "…", subscriptionId: club.stripe_subscription_id.substring(0, 8) + "…" }, '[reactivate-subscription] Subscription already fully cancelled on Stripe');
        return NextResponse.json(
          { error: 'L\'abonnement a déjà été entièrement annulé et ne peut plus être réactivé' },
          { status: 400 }
        );
      }

      logger.error({ error: message, clubId: clubId.substring(0, 8) + "…" }, '[reactivate-subscription] Stripe update error');
      throw err;
    }

    // Mettre à jour le statut dans Supabase
    const { error: updateError } = await supabaseAdmin
      .from('clubs')
      .update({
        subscription_status: 'active',
      })
      .eq('id', clubId);

    if (updateError) {
      logger.error({ error: updateError, clubId: clubId.substring(0, 8) + "…" }, '[reactivate-subscription] Error updating club');
      // Essayer de revenir en arrière côté Stripe
      try {
        await stripe.subscriptions.update(club.stripe_subscription_id, {
          cancel_at_period_end: true,
        });
      } catch (stripeError) {
        logger.error({ error: stripeError, clubId: clubId.substring(0, 8) + "…" }, '[reactivate-subscription] Failed to revert Stripe');
      }

      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du statut' },
        { status: 500 }
      );
    }

    logger.info({ clubId: clubId.substring(0, 8) + "…", subscriptionId: club.stripe_subscription_id.substring(0, 8) + "…" }, '[reactivate-subscription] Subscription reactivated');

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, '[reactivate-subscription] Unexpected error');

    return NextResponse.json(
      { error: 'Erreur lors de la réactivation de l\'abonnement' },
      { status: 500 }
    );
  }
}

