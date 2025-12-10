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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { clubId } = await getUserClubInfo();
    if (!clubId) {
      return NextResponse.json(
        { error: 'Club non trouvé' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { clubId: bodyClubId } = body;

    // Vérifier que le clubId correspond
    if (bodyClubId !== clubId) {
      return NextResponse.json(
        { error: 'Club ID invalide' },
        { status: 400 }
      );
    }

    // Récupérer le club
    const { data: club, error: clubError } = await supabaseAdmin
      .from('clubs')
      .select('stripe_subscription_id')
      .eq('id', clubId)
      .single();

    if (clubError || !club || !club.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'Abonnement non trouvé' },
        { status: 404 }
      );
    }

    // Annuler la subscription Stripe (à la fin de la période)
    await stripe.subscriptions.update(club.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // Mettre à jour le statut dans Supabase
    const { error: updateError } = await supabaseAdmin
      .from('clubs')
      .update({
        subscription_status: 'canceled',
      })
      .eq('id', clubId);

    if (updateError) {
      logger.error({ error: updateError, clubId: clubId.substring(0, 8) + "…" }, '[cancel-subscription] Error updating club');
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du statut' },
        { status: 500 }
      );
    }

    logger.info({ clubId: clubId.substring(0, 8) + "…", subscriptionId: club.stripe_subscription_id.substring(0, 8) + "…" }, '[cancel-subscription] Subscription canceled');

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, '[cancel-subscription] Unexpected error');

    return NextResponse.json(
      { error: 'Erreur lors de l\'annulation de l\'abonnement' },
      { status: 500 }
    );
  }
}

