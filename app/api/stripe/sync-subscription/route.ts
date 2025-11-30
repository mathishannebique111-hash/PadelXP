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
    const supabase = createClient();
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
      logger.error({ error: fetchError, userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…" }, '[sync-subscription] Error fetching subscription:');
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
        
        // Déterminer le cycle du plan
        let planCycle: 'monthly' | 'quarterly' | 'annual' | null = existingSubscription.plan_cycle as any;
        if (stripeSubscription.items.data.length > 0) {
          const price = stripeSubscription.items.data[0].price;
          const interval = price.recurring?.interval;
          const intervalCount = price.recurring?.interval_count || 1;
          
          if (interval === 'month') {
            planCycle = intervalCount === 1 ? 'monthly' : intervalCount === 3 ? 'quarterly' : 'monthly';
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

        // Mettre à jour l'abonnement
        // Important : inclure cancel_at_period_end pour détecter les annulations
        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: stripeSubscription.status === 'active' ? 'active' : existingSubscription.status,
            cancel_at_period_end: stripeSubscription.cancel_at_period_end || false,
            stripe_customer_id: customerId,
            plan_cycle: planCycle,
            current_period_start: currentPeriodStart.toISOString(),
            current_period_end: currentPeriodEnd.toISOString(),
            next_renewal_at: nextRenewal.toISOString(),
            has_payment_method: stripeSubscription.default_payment_method !== null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSubscription.id);

        if (updateError) {
          logger.error({ error: updateError, userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", subscriptionId: existingSubscription.stripe_subscription_id?.substring(0, 8) + "…" }, '[sync-subscription] Update error:');
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
        logger.error({ error: error instanceof Error ? error.message : String(error), userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", subscriptionId: existingSubscription.stripe_subscription_id?.substring(0, 8) + "…" }, '[sync-subscription] Error retrieving Stripe subscription:');
        return NextResponse.json(
          { error: 'Failed to retrieve Stripe subscription' },
          { status: 500 }
        );
      }
    }

    // Si pas de stripe_subscription_id, chercher les abonnements Stripe récents pour ce club
    // On cherche par email ou par metadata club_id, ou dans les sessions checkout récentes
    const clubEmail = user.email;
    
    // D'abord, chercher dans les sessions checkout récentes (dernières 24h)
    // qui pourraient contenir un abonnement pour ce club
    const oneDayAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
    
    let foundSubscription: Stripe.Subscription | null = null;
    let foundCustomerId: string | null = null;

    try {
      // Chercher les sessions checkout récentes
      const sessions = await stripe.checkout.sessions.list({
        limit: 100,
        created: { gte: oneDayAgo },
      });

      // Parcourir les sessions pour trouver celles qui ont un abonnement
      for (const session of sessions.data) {
        if (session.payment_status === 'paid' && session.status === 'complete') {
          if (session.subscription) {
            const subscriptionId = typeof session.subscription === 'string' 
              ? session.subscription 
              : session.subscription.id;
            
            try {
              const sub = await stripe.subscriptions.retrieve(subscriptionId);
              
              // Vérifier si l'abonnement semble correspondre (statut actif, créé récemment)
              if (sub.status === 'active' || sub.status === 'trialing') {
                // Si on trouve un abonnement actif récent, on l'utilise
                foundSubscription = sub;
                foundCustomerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
                logger.info({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", subscriptionId: subscriptionId.substring(0, 8) + "…" }, '[sync-subscription] Found subscription in recent checkout session:');
                break;
              }
            } catch (err) {
              // Continuer si on ne peut pas récupérer l'abonnement
              continue;
            }
          }
        }
      }
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error), userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…" }, '[sync-subscription] Error searching checkout sessions:');
    }

    // Si on n'a pas trouvé dans les sessions checkout, chercher par email
    if (!foundSubscription && clubEmail) {
      try {
        // Chercher le customer Stripe par email
        const customers = await stripe.customers.list({
          email: clubEmail,
          limit: 10,
        });

        // Pour chaque customer, chercher les abonnements actifs
        for (const customer of customers.data) {
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'all',
            limit: 5,
          });

          // Prendre le plus récent abonnement actif
          const activeSubs = subscriptions.data.filter(sub => 
            sub.status === 'active' || sub.status === 'trialing'
          ).sort((a, b) => b.created - a.created);

          if (activeSubs.length > 0) {
            foundSubscription = activeSubs[0];
            foundCustomerId = customer.id;
            logger.info({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", subscriptionId: foundSubscription.id.substring(0, 8) + "…", email: clubEmail?.substring(0, 8) + "…" }, '[sync-subscription] Found subscription by email:');
            break;
          }
        }
      } catch (error) {
        logger.error({ error: error instanceof Error ? error.message : String(error), userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", email: clubEmail?.substring(0, 8) + "…" }, '[sync-subscription] Error searching by email:');
      }
    }

    // Si toujours rien, retourner une erreur avec des instructions
    if (!foundSubscription) {
      return NextResponse.json(
        { 
          error: 'Aucun abonnement Stripe trouvé. Si vous avez effectué un paiement, assurez-vous que l\'email utilisé correspond à celui de votre compte, ou utilisez le bouton de vérification après avoir complété le paiement.',
          hint: 'Vous pouvez aussi fournir le session_id de votre paiement Stripe si vous l\'avez.'
        },
        { status: 404 }
      );
    }

    const customer = foundCustomerId ? { id: foundCustomerId } : null;
    
    const latestSubscription = foundSubscription;
    
    // Déterminer le cycle du plan
    let planCycle: 'monthly' | 'quarterly' | 'annual' | null = null;
    if (latestSubscription.items.data.length > 0) {
      const price = latestSubscription.items.data[0].price;
      const interval = price.recurring?.interval;
      const intervalCount = price.recurring?.interval_count || 1;
      
      if (interval === 'month') {
        planCycle = intervalCount === 1 ? 'monthly' : intervalCount === 3 ? 'quarterly' : 'monthly';
      } else if (interval === 'year') {
        planCycle = 'annual';
      }
    }

    // Dates importantes
    // Si l'abonnement est en période d'essai Stripe, utiliser trial_end comme début de période
    let currentPeriodStart: Date;
    let currentPeriodEnd: Date;
    let nextRenewal: Date;

    if (latestSubscription.status === 'trialing' && latestSubscription.trial_end) {
      // L'abonnement est en période d'essai Stripe
      // Le premier paiement sera après trial_end
      const trialEnd = new Date(latestSubscription.trial_end * 1000);
      currentPeriodStart = trialEnd;
      
      // Calculer current_period_end selon le cycle du plan
      const interval = latestSubscription.items.data[0]?.price?.recurring?.interval;
      const intervalCount = latestSubscription.items.data[0]?.price?.recurring?.interval_count || 1;
      
      currentPeriodEnd = new Date(trialEnd);
      if (interval === 'month') {
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + intervalCount);
      } else if (interval === 'year') {
        currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + intervalCount);
      }
      
      nextRenewal = new Date(currentPeriodEnd);
    } else {
      // Abonnement actif normal
      currentPeriodStart = new Date(latestSubscription.current_period_start * 1000);
      currentPeriodEnd = new Date(latestSubscription.current_period_end * 1000);
      nextRenewal = new Date(latestSubscription.current_period_end * 1000);
    }

    // Mettre à jour l'abonnement
    // Important : inclure cancel_at_period_end pour détecter les annulations
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: latestSubscription.status === 'active' ? 'active' : existingSubscription.status,
        cancel_at_period_end: latestSubscription.cancel_at_period_end || false,
        stripe_subscription_id: latestSubscription.id,
        stripe_customer_id: foundCustomerId,
        plan_cycle: planCycle,
        current_period_start: currentPeriodStart.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
        next_renewal_at: nextRenewal.toISOString(),
        has_payment_method: latestSubscription.default_payment_method !== null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingSubscription.id);

    if (updateError) {
      logger.error({ error: updateError, userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", subscriptionId: latestSubscription.id.substring(0, 8) + "…" }, '[sync-subscription] Update error:');
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
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined }, '[sync-subscription] Error:');
    return NextResponse.json(
      { error: 'Failed to sync subscription' },
      { status: 500 }
    );
  }
}

