import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { getUserClubInfo } from '@/lib/utils/club-utils';
import { getClubSubscription } from '@/lib/utils/subscription-utils';
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
    // Vérifier que la clé Stripe est configurée
    if (!process.env.STRIPE_SECRET_KEY) {
      logger.error({}, 'STRIPE_SECRET_KEY is not configured');
      return NextResponse.json(
        { error: 'Stripe configuration missing' },
        { status: 500 }
      );
    }

    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      return NextResponse.json(
        { error: 'Site URL configuration missing' },
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

    // Vérifier que le customer Stripe existe
    if (!subscription.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Stripe customer ID not found' },
        { status: 400 }
      );
    }

    // Créer une session du Customer Portal Stripe
    // Ajouter un paramètre pour déclencher une synchronisation au retour
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/facturation?sync=1`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, '[customer-portal] Error');
    
    return NextResponse.json(
      { error: 'Failed to create customer portal session' },
      { status: 500 }
    );
  }
}



