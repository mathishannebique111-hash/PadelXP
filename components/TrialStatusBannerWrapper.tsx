import { createClient as createServiceClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import TrialStatusBanner from './TrialStatusBanner';
import type { SubscriptionStatus, PlanType } from '@/lib/subscription';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    })
  : null;

async function TrialStatusBannerWrapper({ clubId }: { clubId: string }) {
  if (!supabaseAdmin) return null;

  const { data: club } = await supabaseAdmin
    .from('clubs')
    .select('trial_end_date, selected_plan, plan_selected_at, subscription_status, subscription_started_at, stripe_subscription_id')
    .eq('id', clubId)
    .single();

  if (!club) return null;

  // Récupérer la date de prochain renouvellement depuis Stripe si subscription active
  let nextRenewalAt: string | null = null;
  if (club.subscription_status === 'active' && club.stripe_subscription_id && stripe) {
    try {
      const subscription = await stripe.subscriptions.retrieve(club.stripe_subscription_id);
      if (subscription.current_period_end) {
        nextRenewalAt = new Date(subscription.current_period_end * 1000).toISOString();
      }
    } catch (error) {
      // Ignorer les erreurs Stripe
    }
  }

  return (
    <TrialStatusBanner
      trialEndDate={club.trial_end_date}
      subscriptionStatus={(club.subscription_status || 'trialing') as SubscriptionStatus}
      selectedPlan={club.selected_plan as PlanType | null}
      planSelectedAt={club.plan_selected_at}
      subscriptionStartedAt={club.subscription_started_at}
      nextRenewalAt={nextRenewalAt}
      clubId={clubId}
    />
  );
}

export default TrialStatusBannerWrapper;

