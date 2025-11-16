import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
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
    // Vérifier l'authentification
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!supabaseAdmin || !process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Configuration manquante' },
        { status: 500 }
      );
    }

    // Trouver le club TCAM
    const { data: clubs, error: clubError } = await supabaseAdmin
      .from('clubs')
      .select('id, name, email')
      .ilike('name', '%tcam%');

    if (clubError) {
      console.error('[sync-tcam] Error finding club:', clubError);
      return NextResponse.json(
        { error: 'Error finding club' },
        { status: 500 }
      );
    }

    if (!clubs || clubs.length === 0) {
      return NextResponse.json(
        { error: 'No club found matching TCAM' },
        { status: 404 }
      );
    }

    const club = clubs[0];
    console.log('[sync-tcam] Found club:', club.name, 'ID:', club.id);

    // Récupérer l'abonnement du club
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('club_id', club.id)
      .maybeSingle();

    if (subError) {
      console.error('[sync-tcam] Error fetching subscription:', subError);
      return NextResponse.json(
        { error: 'Error fetching subscription' },
        { status: 500 }
      );
    }

    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription found for club' },
        { status: 404 }
      );
    }

    // Si on a un stripe_subscription_id, récupérer les dates depuis Stripe
    if (!subscription.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No stripe_subscription_id found, cannot update dates' },
        { status: 400 }
      );
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    
    // Calculer les dates correctes
    let currentPeriodStart: Date;
    let currentPeriodEnd: Date;
    let nextRenewal: Date;

    if (stripeSubscription.status === 'trialing' && stripeSubscription.trial_end) {
      // L'abonnement est en période d'essai Stripe
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

    // Mettre à jour dans la base de données
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        current_period_start: currentPeriodStart.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
        next_renewal_at: nextRenewal.toISOString(),
        status: stripeSubscription.status === 'active' ? 'active' : subscription.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('[sync-tcam] Error updating subscription:', updateError);
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription dates updated successfully',
      club: club.name,
      dates: {
        current_period_start: currentPeriodStart.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
        next_renewal_at: nextRenewal.toISOString(),
      },
    });
  } catch (error) {
    console.error('[sync-tcam] Error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to sync subscription dates' },
      { status: 500 }
    );
  }
}




