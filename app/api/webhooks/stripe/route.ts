import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import type { SubscriptionStatus } from '@/lib/subscription';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature || !WEBHOOK_SECRET) {
    logger.error('[webhook-stripe] Missing signature or webhook secret');
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  // Vérification anticipée de la signature Stripe
  try {
    stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    logger.error('[webhook-stripe] Webhook signature pre-check failed', { 
      error: err instanceof Error ? err.message : String(err) 
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    logger.error('[webhook-stripe] Webhook signature verification failed', { 
      error: err instanceof Error ? err.message : String(err) 
    });
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(subscription);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleTrialWillEnd(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        logger.info('[webhook-stripe] Unhandled event type', { type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('[webhook-stripe] Error processing webhook', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      eventType: event.type,
    });

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const clubId = subscription.metadata?.club_id;
  if (!clubId || !supabaseAdmin) return;

  logger.info('[webhook-stripe] Subscription created', { 
    subscriptionId: subscription.id.substring(0, 8) + "…", 
    clubId: clubId.substring(0, 8) + "…" 
  });

  // Mettre à jour le statut vers trialing_with_plan si en période d'essai
  const status: SubscriptionStatus = subscription.status === 'trialing' ? 'trialing_with_plan' : 'active';

  const { error } = await supabaseAdmin
    .from('clubs')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: status,
    })
    .eq('id', clubId);

  if (error) {
    logger.error('[webhook-stripe] Error updating club on subscription created', { 
      error: error.message, 
      clubId: clubId.substring(0, 8) + "…" 
    });
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const clubId = subscription.metadata?.club_id;
  if (!clubId || !supabaseAdmin) return;

  logger.info('[webhook-stripe] Subscription updated', { 
    subscriptionId: subscription.id.substring(0, 8) + "…", 
    status: subscription.status 
  });

  // Déterminer le statut selon l'état Stripe
  let status: SubscriptionStatus = 'active';

  if (subscription.status === 'trialing') {
    status = 'trialing_with_plan';
  } else if (subscription.status === 'active') {
    status = 'active';
  } else if (subscription.status === 'past_due') {
    status = 'past_due';
  } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    status = 'canceled';
  }

  const updateData: any = {
    subscription_status: status,
  };

  // Si l'abonnement devient actif, mettre à jour subscription_started_at
  if (subscription.status === 'active' && subscription.current_period_start) {
    updateData.subscription_started_at = new Date(subscription.current_period_start * 1000).toISOString();
  }

  const { error } = await supabaseAdmin
    .from('clubs')
    .update(updateData)
    .eq('id', clubId);

  if (error) {
    logger.error('[webhook-stripe] Error updating club on subscription updated', { 
      error: error.message, 
      clubId: clubId.substring(0, 8) + "…" 
    });
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const clubId = subscription.metadata?.club_id;
  if (!clubId || !supabaseAdmin) return;

  logger.info('[webhook-stripe] Subscription deleted', { 
    subscriptionId: subscription.id.substring(0, 8) + "…", 
    clubId: clubId.substring(0, 8) + "…" 
  });

  // Récupérer les informations du club pour vérifier si l'annulation était pendant l'essai
  const { data: club } = await supabaseAdmin
    .from('clubs')
    .select('trial_end_date, trial_current_end_date, selected_plan, subscription_status')
    .eq('id', clubId)
    .single();

  // Si la subscription était annulée pendant l'essai, on garde le stripe_subscription_id
  // pour référence, mais on met le statut à 'canceled'
  // Si elle était active, on peut mettre stripe_subscription_id à null
  const wasCanceledDuringTrial = club?.subscription_status === 'canceled' && 
    club?.trial_current_end_date && 
    new Date(club.trial_current_end_date) > new Date();

  const updateData: any = {
    subscription_status: 'canceled',
  };

  // Si annulée pendant l'essai, garder le stripe_subscription_id pour référence
  // Sinon, le mettre à null car la subscription est complètement supprimée
  if (!wasCanceledDuringTrial) {
    updateData.stripe_subscription_id = null;
  }

  const { error } = await supabaseAdmin
    .from('clubs')
    .update(updateData)
    .eq('id', clubId);

  if (error) {
    logger.error('[webhook-stripe] Error updating club on subscription deleted', { 
      error: error.message, 
      clubId: clubId.substring(0, 8) + "…" 
    });
  }
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  const clubId = subscription.metadata?.club_id;
  if (!clubId || !supabaseAdmin) return;

  logger.info('[webhook-stripe] Trial will end', { 
    subscriptionId: subscription.id.substring(0, 8) + "…", 
    clubId: clubId.substring(0, 8) + "…" 
  });

  // TODO: Envoyer un email de rappel 3 jours avant la fin de l'essai
  // Pour l'instant, on log juste l'événement
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId || typeof subscriptionId !== 'string' || !supabaseAdmin) return;

  // Récupérer la subscription pour obtenir le club_id
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const clubId = subscription.metadata?.club_id;
  if (!clubId) return;

  logger.info('[webhook-stripe] Invoice payment succeeded', { 
    subscriptionId: subscriptionId.substring(0, 8) + "…", 
    clubId: clubId.substring(0, 8) + "…", 
    billingReason: invoice.billing_reason 
  });

  // Si c'est le premier paiement (subscription_create), activer l'abonnement
  if (invoice.billing_reason === 'subscription_create' || invoice.billing_reason === 'subscription_cycle') {
    const { error } = await supabaseAdmin
      .from('clubs')
      .update({
        subscription_status: 'active',
        subscription_started_at: new Date().toISOString(),
      })
      .eq('id', clubId);

    if (error) {
      logger.error('[webhook-stripe] Error updating club on invoice payment succeeded', { 
        error: error.message, 
        clubId: clubId.substring(0, 8) + "…" 
      });
    }
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId || typeof subscriptionId !== 'string' || !supabaseAdmin) return;

  // Récupérer la subscription pour obtenir le club_id
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const clubId = subscription.metadata?.club_id;
  if (!clubId) return;

  logger.info('[webhook-stripe] Invoice payment failed', { 
    subscriptionId: subscriptionId.substring(0, 8) + "…", 
    clubId: clubId.substring(0, 8) + "…" 
  });

  // Mettre à jour le statut vers past_due
  const { error } = await supabaseAdmin
    .from('clubs')
    .update({
      subscription_status: 'past_due',
    })
    .eq('id', clubId);

  if (error) {
    logger.error('[webhook-stripe] Error updating club on invoice payment failed', { 
      error: error.message, 
      clubId: clubId.substring(0, 8) + "…" 
    });
  }

  // TODO: Envoyer un email au club pour l'informer du problème de paiement
}
