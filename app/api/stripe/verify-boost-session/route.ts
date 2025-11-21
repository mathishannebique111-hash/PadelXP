import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { creditPlayerBoosts } from '@/lib/utils/boost-utils';
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
    if (!process.env.STRIPE_SECRET_KEY || !supabaseAdmin) {
      return NextResponse.json(
        { error: 'Configuration manquante' },
        { status: 500 }
      );
    }

    // Vérifier l'authentification
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[verify-boost-session] Unauthorized:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { sessionId } = body as { sessionId: string };

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Récupérer la session Stripe
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (stripeError) {
      console.error('[verify-boost-session] Error retrieving session:', stripeError);
      return NextResponse.json(
        { error: 'Session Stripe introuvable' },
        { status: 404 }
      );
    }

    // Vérifier que c'est bien une session de boost
    if (session.mode !== 'payment' || session.metadata?.type !== 'player_boost') {
      return NextResponse.json(
        { error: 'Cette session n\'est pas une session de boost' },
        { status: 400 }
      );
    }

    // Vérifier que le paiement est bien complété
    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return NextResponse.json(
        { error: 'Le paiement n\'est pas encore complété' },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur correspond
    const sessionUserId = session.metadata?.user_id;
    if (sessionUserId !== user.id) {
      return NextResponse.json(
        { error: 'Cette session ne vous appartient pas' },
        { status: 403 }
      );
    }

    // Vérifier si les boosts ont déjà été crédités
    const quantity = parseInt(session.metadata?.quantity || '1', 10);
    const paymentIntentId = session.payment_intent as string | null;

    // Vérifier si des boosts ont déjà été crédités pour cette session
    const { data: existingCredits, error: checkError } = await supabaseAdmin
      .from('player_boost_credits')
      .select('id')
      .eq('user_id', user.id)
      .eq('created_by_session_id', sessionId)
      .limit(1);

    if (checkError) {
      console.error('[verify-boost-session] Error checking existing credits:', checkError);
    }

    // Si des crédits existent déjà pour cette session, les boosts ont déjà été crédités
    if (existingCredits && existingCredits.length > 0) {
      console.log('[verify-boost-session] Boosts already credited for this session:', sessionId);
      return NextResponse.json({
        success: true,
        alreadyCredited: true,
        credited: quantity,
      });
    }

    // Créditer les boosts
    const result = await creditPlayerBoosts(
      user.id,
      quantity,
      paymentIntentId || undefined,
      sessionId
    );

    if (result.success) {
      console.log('[verify-boost-session] Boosts credited successfully:', {
        userId: user.id,
        quantity: result.credited,
        sessionId,
      });
      return NextResponse.json({
        success: true,
        credited: result.credited,
      });
    } else {
      console.error('[verify-boost-session] Failed to credit boosts:', result.error);
      return NextResponse.json(
        { error: result.error || 'Erreur lors du crédit des boosts' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[verify-boost-session] Error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Erreur serveur lors de la vérification de la session' },
      { status: 500 }
    );
  }
}

