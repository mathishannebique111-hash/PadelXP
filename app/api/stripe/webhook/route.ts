import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// Initialiser Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
});

const supabaseAdmin = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    )
  : null;

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Vérifier que le webhook secret est configuré
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('[webhook] STRIPE_WEBHOOK_SECRET is not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Récupérer le body et la signature
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      logger.error('[webhook] Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Pré-vérification de la signature Stripe
    try {
      stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      logger.error('[webhook] Pre-check signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    // CRITIQUE : Vérifier la signature du webhook
    // Cela garantit que la requête provient bien de Stripe (obligatoire PCI-DSS)
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
    } catch (err: any) {
      logger.error('[webhook] Signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    logger.info({ eventType: event.type, eventId: event.id }, '[webhook] Event received');

    // Traiter les événements selon leur type
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        logger.info({ sessionId: session.id, mode: session.mode, metadata: session.metadata }, '[webhook] checkout.session.completed');

        // Si c'est un achat de boost pour un joueur
        if (session.mode === 'payment' && session.metadata?.type === 'player_boost') {
          const userId = session.metadata.user_id;
          // La quantité dans les métadonnées correspond au nombre de boosts à créditer (1, 5 ou 10)
          const quantity = parseInt(session.metadata.quantity || '1', 10);
          const paymentIntentId = session.payment_intent as string | null;
          const priceId = session.metadata.price_id; // Price ID utilisé (pour référence)

          if (!userId) {
            logger.error('[webhook] Missing user_id in metadata for boost purchase');
            break;
          }

          if (!supabaseAdmin) {
            logger.error('[webhook] Supabase admin client not available');
            break;
          }

          // Créditer les boosts au joueur (quantité réelle : 1, 5 ou 10 selon le produit acheté)
          const { creditPlayerBoosts } = await import('@/lib/utils/boost-utils');
          const result = await creditPlayerBoosts(
            userId,
            quantity, // Quantité réelle de boosts à créditer
            paymentIntentId || undefined,
            session.id
          );

          if (result.success) {
            logger.info({
              userId,
              quantity: result.credited,
              priceId: priceId || 'unknown',
              sessionId: session.id,
            }, '[webhook] Boost credits added successfully');
          } else {
            logger.error('[webhook] Failed to credit boosts:', result.error);
          }
        } else {
          // Le traitement pour les autres types de checkout est déjà fait ailleurs
          logger.info('[webhook] Other checkout.session.completed event (not boost)');
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        logger.info({ eventType: event.type, subscriptionId: subscription.id, cancelAtPeriodEnd: subscription.cancel_at_period_end, status: subscription.status }, '[webhook] subscription event');

        // Mettre à jour la base de données avec les informations de l'abonnement Stripe
        if (supabaseAdmin && subscription.id) {
          // Déterminer le plan cycle depuis les items
          let planCycle: string | null = null;
          if (subscription.items.data.length > 0) {
            const price = subscription.items.data[0].price;
            if (price.recurring) {
              if (price.recurring.interval === 'month' && price.recurring.interval_count === 1) {
                planCycle = 'monthly';
              } else if (price.recurring.interval === 'month' && price.recurring.interval_count === 3) {
                planCycle = 'quarterly';
              } else if (price.recurring.interval === 'year') {
                planCycle = 'annual';
              }
            }
          }

          // Calculer les dates
          let currentPeriodStart: Date | null = null;
          let currentPeriodEnd: Date | null = null;
          let nextRenewal: Date | null = null;

          if (subscription.status === 'trialing' && subscription.trial_end) {
            const trialEnd = new Date(subscription.trial_end * 1000);
            currentPeriodStart = trialEnd;
            const interval = subscription.items.data[0]?.price?.recurring?.interval;
            const intervalCount = subscription.items.data[0]?.price?.recurring?.interval_count || 1;
            currentPeriodEnd = new Date(trialEnd);
            if (interval === 'month') {
              currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + intervalCount);
            } else if (interval === 'year') {
              currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + intervalCount);
            }
            nextRenewal = new Date(currentPeriodEnd);
          } else {
            currentPeriodStart = new Date(subscription.current_period_start * 1000);
            currentPeriodEnd = new Date(subscription.current_period_end * 1000);
            nextRenewal = new Date(subscription.current_period_end * 1000);
          }

          // Mettre à jour l'abonnement
          const updateData: any = {
            status: subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end || false,
            stripe_subscription_id: subscription.id,
            plan_cycle: planCycle,
            current_period_start: currentPeriodStart?.toISOString() || null,
            current_period_end: currentPeriodEnd?.toISOString() || null,
            next_renewal_at: nextRenewal?.toISOString() || null,
            trial_end_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          };

          // Si on a le customer_id, mettre à jour aussi
          if (subscription.customer) {
            updateData.stripe_customer_id = typeof subscription.customer === 'string' 
              ? subscription.customer 
              : subscription.customer.id;
          }

          await supabaseAdmin
            .from('subscriptions')
            .update(updateData)
            .eq('stripe_subscription_id', subscription.id);
          
          logger.info('[webhook] Subscription updated in database:', subscription.id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        logger.info('[webhook] subscription.deleted:', subscription.id);
        
        // Mettre à jour le statut dans la base de données
        if (supabaseAdmin) {
          await supabaseAdmin
            .from('subscriptions')
            .update({ 
              status: 'canceled',
              cancel_at_period_end: false,
            })
            .eq('stripe_subscription_id', subscription.id);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        logger.info('[webhook] invoice.payment_succeeded:', invoice.id);
        
        // Mettre à jour le statut de l'abonnement si nécessaire
        // Générer une facture PDF (voir section facturation)
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        logger.info('[webhook] invoice.payment_failed:', invoice.id);
        
        // Notifier le client ou mettre à jour le statut
        if (supabaseAdmin && invoice.subscription) {
          await supabaseAdmin
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', invoice.subscription as string);
        }
        break;
      }

      default:
        logger.info('[webhook] Unhandled event type:', event.type);
    }

    // Toujours retourner 200 pour confirmer la réception
    return NextResponse.json({ received: true, eventType: event.type });

  } catch (error: any) {
    logger.error({ err: error }, '[webhook] Error processing webhook');
    return NextResponse.json(
      { error: `Webhook error: ${error.message}` },
      { status: 500 }
    );
  }
}

// Stripe nécessite que les webhooks acceptent aussi GET pour vérification
export async function GET() {
  return NextResponse.json({ 
    message: 'Stripe webhook endpoint',
    status: 'active'
  });
}
