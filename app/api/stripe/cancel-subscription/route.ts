import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { getUserClubInfo } from '@/lib/utils/club-utils';
import { getClubSubscription } from '@/lib/utils/subscription-utils';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
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
    // Vérifier que la clé Stripe est configurée
    if (!process.env.STRIPE_SECRET_KEY) {
      logger.error({}, 'STRIPE_SECRET_KEY is not configured');
      return NextResponse.json(
        { error: 'Stripe configuration missing' },
        { status: 500 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      );
    }

    // Vérifier l'authentification
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Récupérer le club de l'utilisateur
    const { clubId } = await getUserClubInfo();
    if (!clubId) {
      return NextResponse.json(
        { error: 'Club not found' },
        { status: 404 }
      );
    }

    // Vérifier que l'utilisateur est admin du club
    const { data: adminCheck } = await supabaseAdmin
      .from('club_admins')
      .select('id')
      .eq('club_id', clubId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!adminCheck) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be a club admin' },
        { status: 403 }
      );
    }

    // Récupérer l'abonnement du club
    const subscription = await getClubSubscription(clubId);
    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Vérifier que l'abonnement n'est pas déjà totalement annulé
    if (subscription.status === 'canceled') {
      return NextResponse.json(
        { error: 'Subscription is already cancelled' },
        { status: 400 }
      );
    }

    let stripeSubscription: Stripe.Subscription | null = null;

    // Si un abonnement Stripe existe, programmer l'annulation à fin de période côté Stripe.
    // Si aucune subscription Stripe n'existe (ancien flux), on se contente de marquer l'annulation en base.
    if (subscription.stripe_subscription_id) {
      try {
        stripeSubscription = await stripe.subscriptions.update(
          subscription.stripe_subscription_id,
          {
            cancel_at_period_end: true,
          }
        );
      } catch (err: any) {
        const message = err instanceof Error ? err.message : String(err);

        // Si l'abonnement est déjà annulé côté Stripe, on ne considère pas cela comme une erreur bloquante :
        // on continue en mettant à jour la base de données pour refléter l'annulation.
        if (message.includes('A canceled subscription can only update its cancellation_details')) {
          logger.warn({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", subscriptionId: subscription.id.substring(0, 8) + "…" }, '[cancel-subscription] Subscription already cancelled on Stripe, continuing with local cancel_at_period_end update.');
          stripeSubscription = null;
        } else {
          logger.error({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", subscriptionId: subscription.id.substring(0, 8) + "…", error: message }, '[cancel-subscription] Stripe update error');
          throw err;
        }
      }
    }

    // Mettre à jour la base de données
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
      })
      .eq('id', subscription.id);

    if (updateError) {
      logger.error({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", subscriptionId: subscription.id.substring(0, 8) + "…", error: updateError }, '[cancel-subscription] Database update error');
      // Essayer de revenir en arrière côté Stripe uniquement si on avait mis à jour Stripe
      if (subscription.stripe_subscription_id && stripeSubscription) {
        try {
          await stripe.subscriptions.update(
            subscription.stripe_subscription_id,
            { cancel_at_period_end: false }
          );
        } catch (stripeError) {
          logger.error({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", subscriptionId: subscription.id.substring(0, 8) + "…", error: stripeError }, '[cancel-subscription] Failed to revert Stripe');
        }
      }

      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    // Logger l'événement
    await supabaseAdmin.from('subscription_events').insert({
      subscription_id: subscription.id,
      event_type: 'subscription_cancel_scheduled',
      from_status: subscription.status,
      to_status: subscription.status, // Le statut reste actif jusqu'à la fin
      triggered_by: 'user',
      triggered_by_user_id: user.id,
      metadata: {
        cancel_at_period_end: true,
        current_period_end: stripeSubscription && (stripeSubscription as any).current_period_end
          ? new Date((stripeSubscription as any).current_period_end * 1000).toISOString()
          : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription will be canceled at the end of the current period',
      cancel_at_period_end: true,
        current_period_end: stripeSubscription && (stripeSubscription as any).current_period_end
          ? new Date((stripeSubscription as any).current_period_end * 1000).toISOString()
          : null,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, '[cancel-subscription] Error');
    
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}




