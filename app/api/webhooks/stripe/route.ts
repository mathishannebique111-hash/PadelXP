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

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      default:
        logger.info('[webhook-stripe] Unhandled event type', { type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('[webhook-stripe] Error processing webhook', {
      error: error instanceof Error ? error.message : String(error),
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

  const status: SubscriptionStatus = subscription.status === 'trialing' ? 'trialing_with_plan' : 'active';

  await supabaseAdmin
    .from('clubs')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: status,
    })
    .eq('id', clubId);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const clubId = subscription.metadata?.club_id;
  if (!clubId || !supabaseAdmin) return;

  let status: SubscriptionStatus = 'active';
  if (subscription.status === 'trialing') status = 'trialing_with_plan';
  else if (subscription.status === 'past_due') status = 'past_due';
  else if (subscription.status === 'canceled' || subscription.status === 'unpaid') status = 'canceled';

  const updateData: any = { subscription_status: status };
  if (subscription.status === 'active' && subscription.current_period_start) {
    updateData.subscription_started_at = new Date(subscription.current_period_start * 1000).toISOString();
  }

  await supabaseAdmin.from('clubs').update(updateData).eq('id', clubId);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const clubId = subscription.metadata?.club_id;
  if (!clubId || !supabaseAdmin) return;
  await supabaseAdmin
    .from('clubs')
    .update({ subscription_status: 'canceled', stripe_subscription_id: null })
    .eq('id', clubId);
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  // Logique existante
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId || typeof subscriptionId !== 'string' || !supabaseAdmin) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const clubId = subscription.metadata?.club_id;

  if (clubId && (invoice.billing_reason === 'subscription_create' || invoice.billing_reason === 'subscription_cycle')) {
    await supabaseAdmin
      .from('clubs')
      .update({ subscription_status: 'active', subscription_started_at: new Date().toISOString() })
      .eq('id', clubId);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // Logique existante
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const participantId = session.metadata?.participant_id;

  if (!participantId || !supabaseAdmin) return;

  logger.info('[webhook-stripe] Checkout session completed', {
    sessionId: session.id,
    participantId
  });

  const { error } = await supabaseAdmin
    .from('reservation_participants')
    .update({ payment_status: 'paid' })
    .eq('id', participantId);

  if (error) {
    logger.error('[webhook-stripe] Error updating participant payment status', { error });
  }
}
