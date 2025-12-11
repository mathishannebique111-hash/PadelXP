import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { getUserClubInfo } from '@/lib/utils/club-utils';
import { getClubSubscription } from '@/lib/utils/subscription-utils';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { calculateCycleEndDate, type PlanType } from '@/lib/subscription';

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

    // Récupérer les informations du club (nouveau système)
    const { data: club, error: clubError } = await supabaseAdmin
      .from('clubs')
      .select('stripe_subscription_id, subscription_status, selected_plan, trial_end_date, trial_current_end_date, subscription_started_at')
      .eq('id', clubId)
      .single();

    if (clubError || !club) {
      return NextResponse.json(
        { error: 'Club not found' },
        { status: 404 }
      );
    }

    // Vérifier si l'abonnement est déjà annulé (nouveau système)
    if (club.subscription_status === 'canceled') {
      return NextResponse.json(
        { error: 'Subscription is already cancelled' },
        { status: 400 }
      );
    }

    // Récupérer l'abonnement du club (ancien système - table subscriptions)
    const subscription = await getClubSubscription(clubId);
    
    // Si pas de subscription dans l'ancienne table, utiliser le nouveau système
    if (!subscription) {
      // Vérifier si le club a un plan choisi (nouveau système)
      if (!club.selected_plan || (club.subscription_status !== 'trialing_with_plan' && club.subscription_status !== 'active')) {
        return NextResponse.json(
          { error: 'Subscription not found' },
          { status: 404 }
        );
      }

      // Calculer la date de fin de l'abonnement
      // Si en essai : fin de l'essai + durée du cycle choisi
      // Si après l'essai : date de début de l'abonnement + durée du cycle choisi
      const trialEndDate = club.trial_current_end_date || club.trial_end_date;
      const isTrialActive = trialEndDate ? new Date(trialEndDate) > new Date() : false;
      
      let subscriptionEndDate: Date | null = null;
      
      if (isTrialActive && trialEndDate) {
        // Pendant l'essai : fin de l'essai + durée du cycle
        const trialEnd = new Date(trialEndDate);
        const subscriptionStartDate = new Date(trialEnd);
        subscriptionStartDate.setDate(subscriptionStartDate.getDate() + 1); // Lendemain de la fin de l'essai
        subscriptionEndDate = calculateCycleEndDate(subscriptionStartDate, club.selected_plan as PlanType);
      } else if (club.subscription_started_at) {
        // Après l'essai : date de début + durée du cycle
        subscriptionEndDate = calculateCycleEndDate(new Date(club.subscription_started_at), club.selected_plan as PlanType);
      } else if (club.stripe_subscription_id) {
        // Récupérer la date depuis Stripe
        try {
          const stripeSub = await stripe.subscriptions.retrieve(club.stripe_subscription_id);
          if (stripeSub.current_period_end) {
            subscriptionEndDate = new Date(stripeSub.current_period_end * 1000);
          }
        } catch (err) {
          logger.warn({ clubId: clubId.substring(0, 8) + "…" }, '[cancel-subscription] Could not retrieve Stripe subscription for end date');
        }
      }

      // Nouveau système : annuler directement via Stripe si subscription_id existe
      let stripeSubscription: Stripe.Subscription | null = null;
      
      if (club.stripe_subscription_id) {
        try {
          // Récupérer la subscription Stripe pour vérifier son statut
          stripeSubscription = await stripe.subscriptions.retrieve(club.stripe_subscription_id);
          
          // Si l'abonnement est annulé pendant l'essai, utiliser cancel_at avec la date de fin de la première période
          // (fin de l'essai + durée du cycle) pour que le premier paiement soit effectué à la fin de l'essai,
          // puis la subscription soit annulée après la première période payée. Aucun remboursement ne sera effectué.
          // Si après l'essai, utiliser cancel_at_period_end pour conserver l'accès jusqu'à la fin du cycle
          if (isTrialActive && trialEndDate && subscriptionEndDate && stripeSubscription.status === 'trialing') {
            // Calculer la date de fin de la première période (fin de l'essai + durée du cycle)
            // Convertir en timestamp Unix
            const cancelAtTimestamp = Math.floor(subscriptionEndDate.getTime() / 1000);
            
            stripeSubscription = await stripe.subscriptions.update(
              club.stripe_subscription_id,
              {
                cancel_at: cancelAtTimestamp,
              }
            );
            
            logger.info({ 
              clubId: clubId.substring(0, 8) + "…",
              cancelAt: cancelAtTimestamp,
              cancelAtDate: subscriptionEndDate.toISOString()
            }, '[cancel-subscription] Subscription cancelled during trial - will cancel after first paid period, first payment will still be made at end of trial');
          } else {
            // Après l'essai : utiliser cancel_at_period_end
            stripeSubscription = await stripe.subscriptions.update(
              club.stripe_subscription_id,
              {
                cancel_at_period_end: true,
              }
            );
            
            logger.info({ clubId: clubId.substring(0, 8) + "…" }, '[cancel-subscription] Subscription will be cancelled at period end');
          }
        } catch (err: any) {
          const message = err instanceof Error ? err.message : String(err);
          if (message.includes('A canceled subscription can only update its cancellation_details') || 
              message.includes('No such subscription')) {
            logger.warn({ clubId: clubId.substring(0, 8) + "…" }, '[cancel-subscription] Subscription already cancelled on Stripe');
            stripeSubscription = null;
          } else {
            logger.error({ clubId: clubId.substring(0, 8) + "…", error: message }, '[cancel-subscription] Stripe update error');
            throw err;
          }
        }
      }

      // Mettre à jour le statut dans la table clubs (nouveau système)
      // Stocker la date de fin de l'abonnement dans subscription_started_at (ou créer un nouveau champ si nécessaire)
      const updateData: any = {
        subscription_status: 'canceled',
      };
      
      // Si on a calculé une date de fin, la stocker dans subscription_started_at (temporairement, en attendant un champ dédié)
      // En fait, on peut utiliser subscription_started_at pour stocker la date de début, et calculer la fin à partir de là
      // Mais pour l'instant, on va stocker la date de fin dans subscription_started_at (à améliorer plus tard avec un champ dédié)
      if (subscriptionEndDate) {
        // On stocke la date de fin dans subscription_started_at (à améliorer avec un champ dédié subscription_end_date)
        updateData.subscription_started_at = subscriptionEndDate.toISOString();
      }

      const { error: updateError } = await supabaseAdmin
        .from('clubs')
        .update(updateData)
        .eq('id', clubId);

      if (updateError) {
        logger.error({ clubId: clubId.substring(0, 8) + "…", error: updateError }, '[cancel-subscription] Database update error');
        return NextResponse.json(
          { error: 'Failed to update subscription' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Subscription will be canceled at the end of the current period',
        cancel_at_period_end: true,
        subscription_end_date: subscriptionEndDate?.toISOString() || null,
      });
    }

    // Ancien système : utiliser la logique existante
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




