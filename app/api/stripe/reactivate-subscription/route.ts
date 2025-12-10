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

    // Récupérer les informations du club (nouveau système)
    const { data: club, error: clubError } = await supabaseAdmin
      .from('clubs')
      .select('stripe_subscription_id, subscription_status, selected_plan, trial_end_date, trial_current_end_date')
      .eq('id', clubId)
      .single();

    if (clubError || !club) {
      return NextResponse.json(
        { error: 'Club not found' },
        { status: 404 }
      );
    }

    // Vérifier si l'abonnement est annulé (nouveau système)
    const isCanceledNewSystem = club.subscription_status === "canceled";
    
    // Récupérer l'abonnement du club (ancien système - table subscriptions)
    const subscription = await getClubSubscription(clubId);
    
    // Vérifier que l'abonnement est annulé
    const isCanceledOldSystem = subscription?.cancel_at_period_end === true || subscription?.status === "canceled";
    
    if (!isCanceledNewSystem && !isCanceledOldSystem) {
      return NextResponse.json(
        { error: 'Subscription is not cancelled' },
        { status: 400 }
      );
    }

    // Déterminer le stripe_subscription_id à utiliser
    const stripeSubscriptionId = subscription?.stripe_subscription_id || club.stripe_subscription_id;
    
    if (!stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'Stripe subscription ID not found' },
        { status: 400 }
      );
    }

    // Récupérer la subscription Stripe pour vérifier la période
    let stripeSubscription: Stripe.Subscription | null = null;
    try {
      stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    } catch (err: any) {
      logger.error({ error: err, subscriptionId: stripeSubscriptionId.substring(0, 8) + "…" }, '[reactivate-subscription] Error retrieving Stripe subscription');
      return NextResponse.json(
        { error: 'Error retrieving Stripe subscription' },
        { status: 500 }
      );
    }

    // Vérifier que la période n'est pas déjà terminée
    if (stripeSubscription.current_period_end) {
      const periodEnd = new Date(stripeSubscription.current_period_end * 1000);
      if (periodEnd <= new Date()) {
        return NextResponse.json(
          { error: 'Cannot reactivate: subscription period has already ended' },
          { status: 400 }
        );
      }
    }

    // Réactiver l'abonnement Stripe (annuler l'annulation)
    try {
      stripeSubscription = (await stripe.subscriptions.update(
        stripeSubscriptionId,
        {
          cancel_at_period_end: false,
        }
      )) as Stripe.Subscription;
    } catch (err: any) {
      const message = err instanceof Error ? err.message : String(err);

      // Cas particulier : l'abonnement est déjà entièrement annulé côté Stripe
      if (message.includes('A canceled subscription can only update its cancellation_details')) {
        logger.warn({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", subscriptionId: stripeSubscriptionId.substring(0, 8) + "…" }, '[reactivate-subscription] Subscription already fully cancelled on Stripe, cannot reactivate.');
        return NextResponse.json(
          { error: "L'abonnement a déjà été entièrement annulé sur Stripe et ne peut plus être réactivé." },
          { status: 400 }
        );
      }

      logger.error({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", subscriptionId: stripeSubscriptionId.substring(0, 8) + "…", error: message }, '[reactivate-subscription] Stripe update error');
      throw err;
    }

    // Mettre à jour la base de données selon le système utilisé
    let updateError = null;
    
    // Si nouveau système : mettre à jour la table clubs
    if (isCanceledNewSystem) {
      // Déterminer le bon statut : si le club a un plan choisi, utiliser trialing_with_plan, sinon trialing
      // Si l'essai est terminé, utiliser active
      const trialEndDate = club.trial_end_date || club.trial_current_end_date;
      const isTrialStillActive = trialEndDate ? new Date(trialEndDate) > new Date() : false;
      
      const newStatus = club.selected_plan 
        ? (isTrialStillActive ? 'trialing_with_plan' : 'active')
        : (isTrialStillActive ? 'trialing' : 'active');
      
      const { error } = await supabaseAdmin
        .from('clubs')
        .update({
          subscription_status: newStatus,
        })
        .eq('id', clubId);
      updateError = error;
    }
    
    // Si ancien système : mettre à jour la table subscriptions
    if (subscription && isCanceledOldSystem) {
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({
          cancel_at_period_end: false,
        })
        .eq('id', subscription.id);
      updateError = updateError || error;
    }

    if (updateError) {
      logger.error({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", subscriptionId: stripeSubscriptionId.substring(0, 8) + "…", error: updateError }, '[reactivate-subscription] Database update error');
      // Essayer de revenir en arrière côté Stripe
      try {
        await stripe.subscriptions.update(
          stripeSubscriptionId,
          { cancel_at_period_end: true }
        );
      } catch (stripeError) {
        logger.error({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", subscriptionId: stripeSubscriptionId.substring(0, 8) + "…", error: stripeError }, '[reactivate-subscription] Failed to revert Stripe');
      }

      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    // Logger l'événement (seulement si subscription existe dans l'ancienne table)
    if (subscription) {
      await supabaseAdmin.from('subscription_events').insert({
        subscription_id: subscription.id,
        event_type: 'subscription_reactivated',
        from_status: subscription.status,
        to_status: subscription.status, // Le statut reste actif
        triggered_by: 'user',
        triggered_by_user_id: user.id,
        metadata: {
          cancel_at_period_end: false,
          current_period_end: stripeSubscription && (stripeSubscription as any).current_period_end
            ? new Date((stripeSubscription as any).current_period_end * 1000).toISOString()
            : null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription reactivated successfully',
      cancel_at_period_end: false,
      current_period_end: stripeSubscription && (stripeSubscription as any).current_period_end
        ? new Date((stripeSubscription as any).current_period_end * 1000).toISOString()
        : null,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, '[reactivate-subscription] Error');
    
    return NextResponse.json(
      { error: 'Failed to reactivate subscription' },
      { status: 500 }
    );
  }
}




