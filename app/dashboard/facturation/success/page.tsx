import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserClubInfo } from '@/lib/utils/club-utils';
import Link from 'next/link';
import Stripe from 'stripe';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import RefreshSubscriptionButton from '@/components/billing/RefreshSubscriptionButton';

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

async function verifyAndUpdateSubscription(sessionId: string, clubId: string) {
  if (!supabaseAdmin || !process.env.STRIPE_SECRET_KEY) {
    console.error('[SuccessPage] Missing configuration');
    return;
  }

  try {
    // Récupérer la session Stripe avec tous les détails
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    console.log('[SuccessPage] Session retrieved:', {
      id: session.id,
      status: session.status,
      payment_status: session.payment_status,
      mode: session.mode,
      subscription: session.subscription,
      customer: session.customer,
    });

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      console.error('[SuccessPage] Payment not completed:', {
        payment_status: session.payment_status,
        status: session.status,
      });
      return;
    }

    // Récupérer l'abonnement Stripe
    let subscriptionId: string | null = null;
    let customerId: string | null = null;

    if (session.subscription) {
      subscriptionId = typeof session.subscription === 'string' 
        ? session.subscription 
        : session.subscription.id;
    }

    if (session.customer) {
      customerId = typeof session.customer === 'string' 
        ? session.customer 
        : session.customer.id;
    }

    if (!subscriptionId) {
      console.error('[SuccessPage] No subscription ID found in session');
      return;
    }

    console.log('[SuccessPage] Found subscription:', {
      subscriptionId,
      customerId,
    });

    // Récupérer l'abonnement Stripe complet
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Déterminer le cycle du plan
    let planCycle: 'monthly' | 'quarterly' | 'annual' | null = null;
    if (stripeSubscription.items.data.length > 0) {
      const price = stripeSubscription.items.data[0].price;
      const interval = price.recurring?.interval;
      const intervalCount = price.recurring?.interval_count || 1;
      
      if (interval === 'month') {
        planCycle = intervalCount === 1 ? 'monthly' : intervalCount === 3 ? 'quarterly' : 'monthly';
      } else if (interval === 'year') {
        planCycle = 'annual';
      }

      console.log('[SuccessPage] Plan cycle determined:', {
        interval,
        intervalCount,
        planCycle,
        priceId: price.id,
      });
    }

      // Dates importantes
      // Si l'abonnement est en période d'essai, utiliser trial_end comme current_period_start
      // Sinon, utiliser current_period_start normal
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

    // Récupérer l'abonnement existant du club
    const { data: existingSubscription, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('club_id', clubId)
      .maybeSingle();

    if (fetchError) {
      console.error('[SuccessPage] Error fetching existing subscription:', fetchError);
      return;
    }

    if (existingSubscription) {
      console.log('[SuccessPage] Updating existing subscription:', existingSubscription.id);
      
      // Mettre à jour l'abonnement existant
      const { error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'active',
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId,
          plan_cycle: planCycle,
          current_period_start: currentPeriodStart.toISOString(),
          current_period_end: currentPeriodEnd.toISOString(),
          next_renewal_at: nextRenewal.toISOString(),
          has_payment_method: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSubscription.id);

      if (updateError) {
        console.error('[SuccessPage] Update error:', updateError);
      } else {
        console.log('[SuccessPage] Subscription updated successfully:', {
          subscriptionId,
          planCycle,
          currentPeriodEnd: currentPeriodEnd.toISOString(),
        });
      }
    } else {
      console.error('[SuccessPage] No existing subscription found for club:', clubId);
    }
  } catch (error) {
    console.error('[SuccessPage] Error verifying session:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

async function SuccessContent({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const params = await searchParams;
  const sessionId = params?.session_id;
  
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/clubs/login?next=/dashboard/facturation');
  }

  let updateSuccess = false;
  
  // Si on a un session_id, vérifier et mettre à jour l'abonnement
  if (sessionId) {
    const { clubId } = await getUserClubInfo();
    if (clubId) {
      console.log('[SuccessPage] Attempting to verify subscription for club:', clubId, 'session:', sessionId);
      await verifyAndUpdateSubscription(sessionId, clubId);
      updateSuccess = true;
    } else {
      console.error('[SuccessPage] No club ID found for user');
    }
  } else {
    console.warn('[SuccessPage] No session_id in URL');
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-3xl font-bold text-white">Paiement réussi !</h1>
        <p className="text-white/70 text-lg">
          Votre abonnement a été activé avec succès. Vous pouvez maintenant profiter de toutes les fonctionnalités de PadelXP.
        </p>
        {sessionId && (
          <div className="pt-4">
            <RefreshSubscriptionButton sessionId={sessionId} />
          </div>
        )}
        <div className="flex flex-col gap-3 pt-4">
          <Link
            href="/dashboard/facturation"
            className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-600 border border-emerald-400/50 shadow-[0_6px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_24px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-100 transition-all duration-300"
          >
            Retour à la page de facturation
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white bg-white/10 border border-white/20 hover:bg-white/20 transition-colors"
          >
            Aller au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-white">Chargement...</div>
        </div>
      }
    >
      <SuccessContent searchParams={searchParams} />
    </Suspense>
  );
}

