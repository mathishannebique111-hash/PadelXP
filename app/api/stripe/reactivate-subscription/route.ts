import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { getUserClubInfo } from '@/lib/utils/club-utils';
import { getClubSubscription } from '@/lib/utils/subscription-utils';
import { createClient as createServiceClient } from '@supabase/supabase-js';

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
    // Vérifier que la clé Stripe est configurée
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not configured');
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

    // Vérifier que l'abonnement est annulé (cancel_at_period_end = true)
    if (!subscription.cancel_at_period_end) {
      return NextResponse.json(
        { error: 'Subscription is not cancelled' },
        { status: 400 }
      );
    }

    // Vérifier que l'abonnement Stripe existe
    if (!subscription.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'Stripe subscription ID not found' },
        { status: 400 }
      );
    }

    // Vérifier que la période n'est pas déjà terminée
    if (subscription.current_period_end) {
      const periodEnd = new Date(subscription.current_period_end);
      if (periodEnd <= new Date()) {
        return NextResponse.json(
          { error: 'Cannot reactivate: subscription period has already ended' },
          { status: 400 }
        );
      }
    }

    // Réactiver l'abonnement Stripe (annuler l'annulation)
    const stripeSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        cancel_at_period_end: false,
      }
    );

    // Mettre à jour la base de données
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        cancel_at_period_end: false,
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('[reactivate-subscription] Database update error:', updateError);
      // Essayer de revenir en arrière côté Stripe
      try {
        await stripe.subscriptions.update(
          subscription.stripe_subscription_id,
          { cancel_at_period_end: true }
        );
      } catch (stripeError) {
        console.error('[reactivate-subscription] Failed to revert Stripe:', stripeError);
      }

      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    // Logger l'événement
    await supabaseAdmin.from('subscription_events').insert({
      subscription_id: subscription.id,
      event_type: 'subscription_reactivated',
      from_status: subscription.status,
      to_status: subscription.status, // Le statut reste actif
      triggered_by: 'user',
      triggered_by_user_id: user.id,
      metadata: {
        cancel_at_period_end: false,
        current_period_end: stripeSubscription.current_period_end
          ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
          : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription reactivated successfully',
      cancel_at_period_end: false,
      current_period_end: stripeSubscription.current_period_end
        ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
        : null,
    });
  } catch (error) {
    console.error('[reactivate-subscription] Error:', error instanceof Error ? error.message : 'Unknown error');
    
    return NextResponse.json(
      { error: 'Failed to reactivate subscription' },
      { status: 500 }
    );
  }
}




