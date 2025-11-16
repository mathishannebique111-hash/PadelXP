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

    // Vérifier que l'abonnement est actif
    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
      return NextResponse.json(
        { error: 'Subscription is not active' },
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

    // Annuler l'abonnement Stripe à la fin de la période
    const stripeSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        cancel_at_period_end: true,
      }
    );

    // Mettre à jour la base de données
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('[cancel-subscription] Database update error:', updateError);
      // Essayer de revenir en arrière côté Stripe
      try {
        await stripe.subscriptions.update(
          subscription.stripe_subscription_id,
          { cancel_at_period_end: false }
        );
      } catch (stripeError) {
        console.error('[cancel-subscription] Failed to revert Stripe:', stripeError);
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
        current_period_end: stripeSubscription.current_period_end
          ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
          : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription will be canceled at the end of the current period',
      cancel_at_period_end: true,
      current_period_end: stripeSubscription.current_period_end
        ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
        : null,
    });
  } catch (error) {
    console.error('[cancel-subscription] Error:', error instanceof Error ? error.message : 'Unknown error');
    
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}




