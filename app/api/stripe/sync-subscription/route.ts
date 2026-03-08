import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { getUserClubInfo } from '@/lib/utils/club-utils';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
});

// IDs des tarifs pour l'option Réservations
const PRICE_RESERVATIONS_MONTHLY = 'price_1T8nLO3RWATPTiiqZmw2Y9Ba';
const PRICE_RESERVATIONS_ANNUAL = 'price_1T8nLk3RWATPTiiqWoSpO9a8';

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

    // Récupérer l'abonnement existant du club
    const { data: existingSubscription, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('club_id', clubId)
      .maybeSingle();

    if (fetchError) {
      logger.error('[sync-subscription] Error fetching subscription', { error: fetchError, userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…" });
      return NextResponse.json(
        { error: 'Failed to fetch subscription' },
        { status: 500 }
      );
    }

    if (!existingSubscription) {
      return NextResponse.json(
        { error: 'No subscription found for this club' },
        { status: 404 }
      );
    }

    // Si on a déjà un stripe_subscription_id, le récupérer et mettre à jour
    if (existingSubscription.stripe_subscription_id) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(existingSubscription.stripe_subscription_id);
        const customerId = typeof stripeSubscription.customer === 'string' ? stripeSubscription.customer : stripeSubscription.customer.id;
        
        // Déterminer le cycle du plan et l'option réservations depuis les items
        let planCycle: 'monthly' | 'quarterly' | 'annual' | null = null;
        let hasReservationsOption = false;

        for (const item of stripeSubscription.items.data) {
          const price = item.price;
          const priceId = price.id;

          // Détecter l'option réservations
          if (priceId === PRICE_RESERVATIONS_MONTHLY || priceId === PRICE_RESERVATIONS_ANNUAL) {
            hasReservationsOption = true;
            continue;
          }

          // Détecter le cycle principal (si pas encore trouvé)
          if (!planCycle && price.recurring) {
            const interval = price.recurring.interval;
            const intervalCount = price.recurring.interval_count || 1;
            
            if (interval === 'month') {
              planCycle = intervalCount === 1 ? 'monthly' : intervalCount === 3 ? 'quarterly' : 'monthly';
            } else if (interval === 'year') {
              planCycle = 'annual';
            }
          }
        }

        // Dates importantes
        let currentPeriodStart: Date;
        let currentPeriodEnd: Date;
        let nextRenewal: Date;

        if (stripeSubscription.status === 'trialing' && stripeSubscription.trial_end) {
          const trialEnd = new Date(stripeSubscription.trial_end * 1000);
          currentPeriodStart = trialEnd;
          
          // Trouver l'item principal pour la durée du cycle
          const mainItem = stripeSubscription.items.data.find(item => 
            item.price.id !== PRICE_RESERVATIONS_MONTHLY && 
            item.price.id !== PRICE_RESERVATIONS_ANNUAL
          ) || stripeSubscription.items.data[0];

          const interval = mainItem?.price?.recurring?.interval;
          const intervalCount = mainItem?.price?.recurring?.interval_count || 1;
          
          currentPeriodEnd = new Date(trialEnd);
          if (interval === 'month') {
            currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + intervalCount);
          } else if (interval === 'year') {
            currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + intervalCount);
          }
          
          nextRenewal = new Date(currentPeriodEnd);
        } else {
          currentPeriodStart = new Date((stripeSubscription as any).current_period_start * 1000);
          currentPeriodEnd = new Date((stripeSubscription as any).current_period_end * 1000);
          nextRenewal = new Date((stripeSubscription as any).current_period_end * 1000);
        }

        // Mettre à jour l'abonnement
        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: stripeSubscription.status === 'active' ? 'active' : stripeSubscription.status as any,
            cancel_at_period_end: stripeSubscription.cancel_at_period_end || false,
            stripe_customer_id: customerId,
            plan_cycle: planCycle,
            has_reservations_option: hasReservationsOption,
            current_period_start: currentPeriodStart.toISOString(),
            current_period_end: currentPeriodEnd.toISOString(),
            next_renewal_at: nextRenewal.toISOString(),
            has_payment_method: stripeSubscription.default_payment_method !== null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSubscription.id);

        if (!updateError) {
          await supabaseAdmin
            .from('clubs')
            .update({ has_reservations_option: hasReservationsOption })
            .eq('id', clubId);
        }

        if (updateError) {
          logger.error('[sync-subscription] Update error', { error: updateError, userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", subscriptionId: existingSubscription.stripe_subscription_id?.substring(0, 8) + "…" });
          return NextResponse.json(
            { error: 'Failed to update subscription' },
            { status: 500 }
          );
        }

        return NextResponse.json({ 
          success: true,
          message: 'Subscription synced successfully',
        });
      } catch (error) {
        logger.error('[sync-subscription] Error retrieving Stripe subscription', { error: error instanceof Error ? error.message : String(error), userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", subscriptionId: existingSubscription.stripe_subscription_id?.substring(0, 8) + "…" });
        return NextResponse.json(
          { error: 'Failed to retrieve Stripe subscription' },
          { status: 500 }
        );
      }
    }

    // Si pas de stripe_subscription_id, chercher les abonnements Stripe récents pour ce club
    const clubEmail = user.email;
    const oneDayAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
    
    let foundSubscription: Stripe.Subscription | null = null;
    let foundCustomerId: string | null = null;

    try {
      const sessions = await stripe.checkout.sessions.list({
        limit: 100,
        created: { gte: oneDayAgo },
      });

      for (const session of sessions.data) {
        if (session.payment_status === 'paid' && session.status === 'complete') {
          if (session.subscription) {
            const subscriptionId = typeof session.subscription === 'string' 
              ? session.subscription 
              : session.subscription.id;
            
            try {
              const sub = await stripe.subscriptions.retrieve(subscriptionId);
              if (sub.status === 'active' || sub.status === 'trialing') {
                foundSubscription = sub;
                foundCustomerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
                logger.info('[sync-subscription] Found subscription in recent checkout session', { userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", subscriptionId: subscriptionId.substring(0, 8) + "…" });
                break;
              }
            } catch (err) {
              continue;
            }
          }
        }
      }
    } catch (error) {
      logger.error('[sync-subscription] Error searching checkout sessions', { error: error instanceof Error ? error.message : String(error), userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…" });
    }

    if (!foundSubscription && clubEmail) {
      try {
        const customers = await stripe.customers.list({
          email: clubEmail,
          limit: 10,
        });

        for (const customer of customers.data) {
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'all',
            limit: 5,
          });

          const activeSubs = subscriptions.data.filter(sub => 
            sub.status === 'active' || sub.status === 'trialing'
          ).sort((a, b) => b.created - a.created);

          if (activeSubs.length > 0) {
            foundSubscription = activeSubs[0];
            foundCustomerId = customer.id;
            logger.info('[sync-subscription] Found subscription by email', { userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", subscriptionId: foundSubscription.id.substring(0, 8) + "…", email: clubEmail?.substring(0, 8) + "…" });
            break;
          }
        }
      } catch (error) {
        logger.error('[sync-subscription] Error searching by email', { error: error instanceof Error ? error.message : String(error), userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", email: clubEmail?.substring(0, 8) + "…" });
      }
    }

    if (!foundSubscription) {
      return NextResponse.json(
        { 
          error: 'Aucun abonnement Stripe trouvé. Si vous avez effectué un paiement, assurez-vous que l\'email utilisé correspond à celui de votre compte, ou utilisez le bouton de vérification après avoir complété le paiement.',
          hint: 'Vous pouvez aussi fournir le session_id de votre paiement Stripe si vous l\'avez.'
        },
        { status: 404 }
      );
    }

    const latestSubscription = foundSubscription;
    
    // Déterminer le cycle du plan et l'option réservations depuis les items
    let planCycle: 'monthly' | 'quarterly' | 'annual' | null = null;
    let hasReservationsOption = false;

    for (const item of latestSubscription.items.data) {
      const price = item.price;
      const priceId = price.id;

      if (priceId === PRICE_RESERVATIONS_MONTHLY || priceId === PRICE_RESERVATIONS_ANNUAL) {
        hasReservationsOption = true;
        continue;
      }

      if (!planCycle && price.recurring) {
        const interval = price.recurring.interval;
        const intervalCount = price.recurring.interval_count || 1;
        
        if (interval === 'month') {
          planCycle = intervalCount === 1 ? 'monthly' : intervalCount === 3 ? 'quarterly' : 'monthly';
        } else if (interval === 'year') {
          planCycle = 'annual';
        }
      }
    }

    let currentPeriodStart: Date;
    let currentPeriodEnd: Date;
    let nextRenewal: Date;

    if (latestSubscription.status === 'trialing' && latestSubscription.trial_end) {
      const trialEnd = new Date(latestSubscription.trial_end * 1000);
      currentPeriodStart = trialEnd;
      
      const mainItem = latestSubscription.items.data.find(item => 
        item.price.id !== PRICE_RESERVATIONS_MONTHLY && 
        item.price.id !== PRICE_RESERVATIONS_ANNUAL
      ) || latestSubscription.items.data[0];

      const interval = mainItem?.price?.recurring?.interval;
      const intervalCount = mainItem?.price?.recurring?.interval_count || 1;
      
      currentPeriodEnd = new Date(trialEnd);
      if (interval === 'month') {
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + intervalCount);
      } else if (interval === 'year') {
        currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + intervalCount);
      }
      
      nextRenewal = new Date(currentPeriodEnd);
    } else {
      currentPeriodStart = new Date((latestSubscription as any).current_period_start * 1000);
      currentPeriodEnd = new Date((latestSubscription as any).current_period_end * 1000);
      nextRenewal = new Date((latestSubscription as any).current_period_end * 1000);
    }

    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: latestSubscription.status === 'active' ? 'active' : latestSubscription.status as any,
        cancel_at_period_end: latestSubscription.cancel_at_period_end || false,
        stripe_subscription_id: latestSubscription.id,
        stripe_customer_id: foundCustomerId,
        plan_cycle: planCycle,
        has_reservations_option: hasReservationsOption,
        current_period_start: currentPeriodStart.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
        next_renewal_at: nextRenewal.toISOString(),
        has_payment_method: latestSubscription.default_payment_method !== null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingSubscription.id);

    if (!updateError) {
      await supabaseAdmin
        .from('clubs')
        .update({ has_reservations_option: hasReservationsOption })
        .eq('id', clubId);
    }

    if (updateError) {
      logger.error('[sync-subscription] Update error', { error: updateError, userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", subscriptionId: latestSubscription.id.substring(0, 8) + "…" });
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Subscription synced successfully',
      subscriptionId: latestSubscription.id,
    });
  } catch (error) {
    logger.error('[sync-subscription] Error', { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: 'Failed to sync subscription' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Subscription sync endpoint',
    status: 'active'
  });
}
