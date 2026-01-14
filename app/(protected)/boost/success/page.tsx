import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Stripe from "stripe";
import { creditPlayerBoosts, getPlayerBoostStats } from "@/lib/utils/boost-utils";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

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

export default async function BoostSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Vérifier et créditer les boosts si nécessaire (fallback si le webhook n'a pas encore été appelé)
  let boostsCredited = false;
  let creditError: string | null = null;
  const sessionId = searchParams.session_id;

  if (sessionId && stripe && supabaseAdmin) {
    try {
      // Récupérer la session Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      logger.info('[boost/success] Session retrieved:', {
        id: session.id,
        mode: session.mode,
        payment_status: session.payment_status,
        status: session.status,
        metadata: session.metadata,
        userId: user.id,
      });

      // Vérifier que c'est bien une session de boost et que le paiement est complété
      if (session.mode === 'payment'
        && session.metadata?.type === 'player_boost'
        && (session.payment_status === 'paid' || session.status === 'complete')
        && session.metadata?.user_id === user.id) {

        // Vérifier si des boosts ont déjà été crédités pour cette session
        const { data: existingCredits, error: checkError } = await supabaseAdmin
          .from('player_boost_credits')
          .select('id')
          .eq('user_id', user.id)
          .eq('created_by_session_id', sessionId)
          .limit(1);

        if (checkError) {
          logger.error('[boost/success] Error checking existing credits:', checkError);
        }

        // Si aucun crédit n'existe pour cette session, créditer les boosts
        if (!existingCredits || existingCredits.length === 0) {
          const quantity = parseInt(session.metadata?.quantity || '1', 10);
          const paymentIntentId = session.payment_intent as string | null;

          logger.info('[boost/success] Crediting boosts:', {
            userId: user.id,
            quantity,
            sessionId,
            paymentIntentId,
          });

          const result = await creditPlayerBoosts(
            user.id,
            quantity,
            paymentIntentId || undefined,
            sessionId
          );

          if (result.success) {
            boostsCredited = true;
            logger.info('[boost/success] Boosts credited successfully:', {
              userId: user.id,
              quantity: result.credited,
              sessionId,
            });
          } else {
            creditError = result.error || 'Erreur lors du crédit des boosts';
            logger.error('[boost/success] Failed to credit boosts:', result.error);
          }
        } else {
          // Les boosts ont déjà été crédités
          boostsCredited = true;
          logger.info('[boost/success] Boosts already credited for this session');
        }
      } else {
        logger.warn('[boost/success] Session is not a valid boost session:', {
          mode: session.mode,
          type: session.metadata?.type,
          payment_status: session.payment_status,
          status: session.status,
          userMatch: session.metadata?.user_id === user.id,
        });
      }
    } catch (error) {
      creditError = error instanceof Error ? error.message : 'Erreur inconnue lors de la vérification de la session';
      logger.error('[boost/success] Error processing boost session:', error);
      // Ne pas bloquer l'affichage de la page si la vérification échoue
      // Le webhook devrait créditer les boosts de toute façon
    }
  } else {
    if (!sessionId) {
      logger.warn('[boost/success] No session_id provided in searchParams');
    }
    if (!stripe) {
      logger.error('[boost/success] Stripe client not initialized');
    }
    if (!supabaseAdmin) {
      logger.error('[boost/success] Supabase admin client not available');
    }
  }

  // Récupérer les stats de boost pour affichage
  const boostStats = await getPlayerBoostStats(user.id);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#172554]">
      {/* Background avec overlay - Transparent en haut pour fusionner avec le fond du layout */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.15),transparent)] z-0" />

      {/* Halos vert et bleu animés */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#BFFF00] rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>


      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">⚡ Paiement réussi !</h1>
        </div>


        <div className="mt-8 rounded-2xl border border-green-500/40 bg-gradient-to-br from-green-600/20 to-emerald-600/20 p-8 text-center backdrop-blur-sm shadow-2xl">
          <div className="mb-4 text-7xl">✅</div>
          <h2 className="mb-4 text-3xl font-bold text-white">
            {boostsCredited || boostStats.creditsAvailable > 0 ? 'Boosts crédités avec succès !' : 'Paiement réussi !'}
          </h2>
          {creditError && (
            <div className="mb-4 rounded-lg border border-yellow-500/40 bg-yellow-600/20 p-4 text-sm text-yellow-100">
              <p className="font-semibold">⚠️ Attention :</p>
              <p className="mt-1">{creditError}</p>
              {sessionId && (
                <p className="mt-2 text-xs">Si les boosts n'apparaissent pas, ils seront crédités automatiquement dans quelques instants via le webhook Stripe.</p>
              )}
            </div>
          )}
          <p className="mb-6 text-lg text-white/90">
            {boostStats.creditsAvailable > 0 ? (
              <>Tu as maintenant <strong className="font-bold text-white">{boostStats.creditsAvailable}</strong> boost{boostStats.creditsAvailable > 1 ? 's' : ''} disponible{boostStats.creditsAvailable > 1 ? 's' : ''} et tu peux les utiliser lors de tes prochains matchs.</>
            ) : boostsCredited ? (
              <>Tes boosts sont maintenant disponibles et tu peux les utiliser lors de tes prochains matchs.</>
            ) : (
              <>Si les boosts n'apparaissent pas immédiatement, ils seront crédités automatiquement dans quelques instants. Tu peux actualiser la page pour vérifier.</>
            )}
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/boost"
              className="rounded-xl border-2 border-green-500/50 bg-gradient-to-r from-green-600/30 to-emerald-600/30 px-6 py-3 font-bold text-white transition-all hover:from-green-600/40 hover:to-emerald-600/40"
            >
              Voir mes boosts
            </Link>
            <Link
              href="/match/new"
              className="rounded-xl border-2 border-blue-500/50 bg-gradient-to-r from-blue-600/30 to-purple-600/30 px-6 py-3 font-bold text-white transition-all hover:from-blue-600/40 hover:to-purple-600/40"
            >
              Enregistrer un match
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


