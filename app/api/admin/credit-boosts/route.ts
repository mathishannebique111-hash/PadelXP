import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { creditPlayerBoosts, getPlayerBoostStats } from '@/lib/utils/boost-utils';
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

// Route pour créditer manuellement les boosts d'un joueur
// Utile pour réparer les cas où les boosts n'ont pas été crédités
export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin || !stripe) {
      return NextResponse.json(
        { error: 'Configuration manquante' },
        { status: 500 }
      );
    }

    // Vérifier l'authentification
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { sessionId, quantity, checkAll } = body as { sessionId?: string; quantity?: number; checkAll?: boolean };

    // Si sessionId fourni, vérifier la session Stripe et créditer
    if (sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        // Vérifier que c'est bien une session de boost
        if (session.mode !== 'payment' || session.metadata?.type !== 'player_boost') {
          return NextResponse.json(
            { error: 'Cette session n\'est pas une session de boost' },
            { status: 400 }
          );
        }

        // Vérifier que le paiement est complété
        if (session.payment_status !== 'paid') {
          return NextResponse.json(
            { error: `Le paiement n'est pas complété. Statut: ${session.payment_status}` },
            { status: 400 }
          );
        }

        // Vérifier que l'utilisateur correspond
        if (session.metadata?.user_id !== user.id) {
          return NextResponse.json(
            { error: 'Cette session ne vous appartient pas' },
            { status: 403 }
          );
        }

        // Vérifier si des boosts ont déjà été crédités
        const { data: existingCredits } = await supabaseAdmin
          .from('player_boost_credits')
          .select('id')
          .eq('user_id', user.id)
          .eq('created_by_session_id', sessionId)
          .limit(1);

        if (existingCredits && existingCredits.length > 0) {
          return NextResponse.json({
            success: true,
            message: 'Les boosts ont déjà été crédités pour cette session',
            alreadyCredited: true,
          });
        }

        // Créditer les boosts
        const boostQuantity = parseInt(session.metadata?.quantity || '1', 10);
        const paymentIntentId = session.payment_intent as string | null;
        
        const result = await creditPlayerBoosts(
          user.id,
          boostQuantity,
          paymentIntentId || undefined,
          sessionId
        );

        if (result.success) {
          // Récupérer les nouvelles stats
          const newStats = await getPlayerBoostStats(user.id);
          return NextResponse.json({
            success: true,
            credited: result.credited,
            boostStats: newStats,
          });
        } else {
          return NextResponse.json(
            { error: result.error || 'Erreur lors du crédit des boosts' },
            { status: 500 }
          );
        }
      } catch (stripeError) {
        console.error('[admin/credit-boosts] Stripe error:', stripeError);
        return NextResponse.json(
          { error: `Erreur Stripe: ${stripeError instanceof Error ? stripeError.message : 'Erreur inconnue'}` },
          { status: 500 }
        );
      }
    }

    // Si checkAll est true, vérifier toutes les sessions Stripe du joueur et créditer les boosts manquants
    if (checkAll) {
      try {
        // Récupérer toutes les sessions Stripe du joueur avec pagination
        let allSessions: Stripe.Checkout.Session[] = [];
        let hasMore = true;
        let startingAfter: string | undefined;

        while (hasMore) {
          const sessions = await stripe.checkout.sessions.list({
            limit: 100,
            starting_after: startingAfter,
          });

          allSessions = allSessions.concat(
            sessions.data.filter(
              (s) =>
                s.mode === 'payment' &&
                s.metadata?.type === 'player_boost' &&
                s.metadata?.user_id === user.id &&
                (s.payment_status === 'paid' || s.status === 'complete')
            )
          );

          hasMore = sessions.has_more;
          if (hasMore && sessions.data.length > 0) {
            startingAfter = sessions.data[sessions.data.length - 1].id;
          }
        }

        console.log('[admin/credit-boosts] Found sessions:', allSessions.length);

        let totalCredited = 0;
        const errors: string[] = [];

        // Pour chaque session, vérifier si les boosts ont été crédités
        for (const session of allSessions) {
          const { data: existingCredits } = await supabaseAdmin
            .from('player_boost_credits')
            .select('id')
            .eq('user_id', user.id)
            .eq('created_by_session_id', session.id)
            .limit(1);

          // Si les boosts n'ont pas été crédités pour cette session, les créditer
          if (!existingCredits || existingCredits.length === 0) {
            const boostQuantity = parseInt(session.metadata?.quantity || '1', 10);
            const paymentIntentId = session.payment_intent as string | null;

            const result = await creditPlayerBoosts(
              user.id,
              boostQuantity,
              paymentIntentId || undefined,
              session.id
            );

            if (result.success) {
              totalCredited += result.credited;
              console.log('[admin/credit-boosts] Credited boosts for session:', session.id, result.credited);
            } else {
              errors.push(`Session ${session.id}: ${result.error || 'Erreur inconnue'}`);
            }
          }
        }

        // Récupérer les nouvelles stats
        const newStats = await getPlayerBoostStats(user.id);

        return NextResponse.json({
          success: true,
          credited: totalCredited,
          checkedSessions: allSessions.length,
          errors: errors.length > 0 ? errors : undefined,
          boostStats: newStats,
        });
      } catch (checkError) {
        console.error('[admin/credit-boosts] Error checking all sessions:', checkError);
        return NextResponse.json(
          { error: `Erreur lors de la vérification: ${checkError instanceof Error ? checkError.message : 'Erreur inconnue'}` },
          { status: 500 }
        );
      }
    }

    // Si quantity fournie sans sessionId, créditer directement (pour debug/admin)
    if (quantity && quantity > 0) {
      const result = await creditPlayerBoosts(user.id, quantity);
      
      if (result.success) {
        const newStats = await getPlayerBoostStats(user.id);
        return NextResponse.json({
          success: true,
          credited: result.credited,
          boostStats: newStats,
        });
      } else {
        return NextResponse.json(
          { error: result.error || 'Erreur lors du crédit des boosts' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'sessionId ou quantity requis' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[admin/credit-boosts] Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

