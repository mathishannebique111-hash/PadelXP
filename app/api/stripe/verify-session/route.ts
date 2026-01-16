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

    const body = await req.json();
    const { sessionId } = body as { sessionId: string };

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Récupérer la session Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    // Récupérer l'abonnement Stripe si disponible
    let subscriptionId: string | null = null;
    let customerId: string | null = null;
    let priceId: string | null = null;
    let planCycle: 'monthly' | 'annual' | null = null;

    if (session.subscription && typeof session.subscription === 'string') {
      subscriptionId = session.subscription;
      const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
      customerId = typeof stripeSubscription.customer === 'string' ? stripeSubscription.customer : stripeSubscription.customer.id;

      // Déterminer le cycle du plan
      if (stripeSubscription.items.data.length > 0) {
        priceId = stripeSubscription.items.data[0].price.id;
        const interval = stripeSubscription.items.data[0].price.recurring?.interval;
        const intervalCount = stripeSubscription.items.data[0].price.recurring?.interval_count || 1;

        if (interval === 'month') {
          planCycle = 'monthly';
        } else if (interval === 'year') {
          planCycle = 'annual';
        }
      }

      // Dates importantes
      // Si l'abonnement est en période d'essai Stripe, utiliser trial_end comme début de période
      let currentPeriodStart: Date;
      let currentPeriodEnd: Date;
      let nextRenewal: Date;

      if (stripeSubscription.status === 'trialing' && stripeSubscription.trial_end) {
        // L'abonnement est en période d'essai Stripe
        // Le premier paiement sera après trial_end
        const trialEnd = new Date(stripeSubscription.trial_end * 1000);
        currentPeriodStart = trialEnd;

        // Calculer current_period_end selon le cycle du plan
        const interval = stripeSubscription.items.data[0]?.price?.recurring?.interval;
        const intervalCount = stripeSubscription.items.data[0]?.price?.recurring?.interval_count || 1;

        currentPeriodEnd = new Date(trialEnd);
        if (interval === 'month') {
          currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + intervalCount);
        } else if (interval === 'year') {
          currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + intervalCount);
        }

        nextRenewal = new Date(currentPeriodEnd);
      } else {
        // Abonnement actif normal
        currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
        currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
        nextRenewal = new Date(stripeSubscription.current_period_end * 1000);
      }

      // Récupérer l'abonnement existant du club
      const { data: existingSubscription } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('club_id', clubId)
        .maybeSingle();

      // Déterminer le statut : si en période d'essai Stripe, utiliser "trialing", sinon "active"
      const subscriptionStatus = stripeSubscription.status === 'trialing' ? 'trialing' : 'active';

      if (existingSubscription) {
        // Mettre à jour l'abonnement existant
        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: subscriptionStatus,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            plan_cycle: planCycle,
            current_period_start: currentPeriodStart.toISOString(),
            current_period_end: currentPeriodEnd.toISOString(),
            next_renewal_at: nextRenewal.toISOString(),
            has_payment_method: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSubscription.id);

        if (updateError) {
          logger.error({ error: updateError, userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", subscriptionId: subscriptionId?.substring(0, 8) + "…" }, '[verify-session] Update error:');
          return NextResponse.json(
            { error: 'Failed to update subscription' },
            { status: 500 }
          );
        }
      } else {
        // Créer un nouvel abonnement
        const { error: insertError } = await supabaseAdmin
          .from('subscriptions')
          .insert({
            club_id: clubId,
            status: subscriptionStatus,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            plan_cycle: planCycle,
            current_period_start: currentPeriodStart.toISOString(),
            current_period_end: currentPeriodEnd.toISOString(),
            next_renewal_at: nextRenewal.toISOString(),
            has_payment_method: true,
            trial_start_at: null,
            trial_end_at: null,
          });

        if (insertError) {
          logger.error({ error: insertError, userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", subscriptionId: subscriptionId?.substring(0, 8) + "…" }, '[verify-session] Insert error:');
          return NextResponse.json(
            { error: 'Failed to create subscription' },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      subscriptionId,
      customerId,
      planCycle,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined }, '[verify-session] Error:');
    return NextResponse.json(
      { error: 'Failed to verify session' },
      { status: 500 }
    );
  }
}

