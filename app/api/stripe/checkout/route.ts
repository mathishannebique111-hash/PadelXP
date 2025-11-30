import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getUserClubInfo } from '@/lib/utils/club-utils';
import { getClubSubscription } from '@/lib/utils/subscription-utils';
import { logger } from '@/lib/logger';

// Initialiser Stripe avec la clé secrète
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
});

export const dynamic = 'force-dynamic';

/**
 * Schéma Stripe checkout : priceId obligatoire (Stripe price_*), mode optionnel limité à subscription/payment.
 */
const stripeCheckoutSchema = z.object({
  priceId: z.string().min(1, 'priceId requis').regex(/^price_[a-zA-Z0-9]+$/, 'priceId invalide'),
  mode: z.enum(['subscription', 'payment']).optional(),
});

export async function POST(req: NextRequest) {
  let priceId: string | undefined;
  
  try {
    // Vérifier que la clé Stripe est configurée
    if (!process.env.STRIPE_SECRET_KEY) {
      logger.error({}, 'STRIPE_SECRET_KEY is not configured');
      return NextResponse.json(
        { error: 'Stripe configuration missing' },
        { status: 500 }
      );
    }

    // Vérifier que l'URL du site est configurée
    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      logger.error({}, 'NEXT_PUBLIC_SITE_URL is not configured');
      return NextResponse.json(
        { error: 'Site URL configuration missing' },
        { status: 500 }
      );
    }

    // Parser et valider le body de la requête
    const body = await req.json();
    const parsedBody = stripeCheckoutSchema.safeParse(body);
    if (!parsedBody.success) {
      logger.error({ validationErrors: parsedBody.error.flatten().fieldErrors }, '[checkout] Invalid payload');
      return NextResponse.json(
        { error: 'Invalid checkout payload', details: parsedBody.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    priceId = parsedBody.data.priceId;
    const { mode } = parsedBody.data;

    // Déterminer le mode (par défaut 'subscription')
    const checkoutMode: 'subscription' | 'payment' = mode || 'subscription';

    // Récupérer l'utilisateur et son club pour vérifier la période d'essai
    let trialEndTimestamp: number | null = null;
    
    if (checkoutMode === 'subscription') {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { clubId } = await getUserClubInfo();
          
          if (clubId) {
            const subscription = await getClubSubscription(clubId);
            const now = new Date();

            // 1) Si le club a une période d'essai PadelXP qui n'est pas encore terminée
            if (!trialEndTimestamp && subscription?.trial_end_at) {
              const trialEndDate = new Date(subscription.trial_end_at);

              if (trialEndDate > now) {
                // Calculer le lendemain de la fin de l'essai à minuit (00:00:00)
                const nextDay = new Date(trialEndDate);
                nextDay.setDate(nextDay.getDate() + 1);
                nextDay.setHours(0, 0, 0, 0);

                // Convertir en timestamp Unix (secondes)
                trialEndTimestamp = Math.floor(nextDay.getTime() / 1000);

                logger.info({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", trialEndAt: subscription.trial_end_at, trialEndTimestamp }, '[checkout] Trial end date found (PadelXP trial)');
              }
            }

            // 2) Si le club n'est plus en essai mais dispose encore d'un cycle d'abonnement en cours
            // (par exemple abonnement mensuel annulé sur Stripe mais encore actif jusqu'à current_period_end),
            // on décale le début du nouveau plan au lendemain de la fin de ce cycle pour éviter toute double facturation.
            if (!trialEndTimestamp && subscription?.current_period_end) {
              const currentPeriodEnd = new Date(subscription.current_period_end);

              if (currentPeriodEnd > now) {
                const nextDayAfterPeriod = new Date(currentPeriodEnd);
                nextDayAfterPeriod.setDate(nextDayAfterPeriod.getDate() + 1);
                nextDayAfterPeriod.setHours(0, 0, 0, 0);

                trialEndTimestamp = Math.floor(nextDayAfterPeriod.getTime() / 1000);

                logger.info({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", status: subscription.status, cancel_at_period_end: subscription.cancel_at_period_end, current_period_end: subscription.current_period_end, trialEndTimestamp }, '[checkout] Trial end date derived from existing subscription period');
              }
            }
          }
        }
      } catch (error) {
        logger.error({ error }, '[checkout] Error fetching trial info');
        // On continue même si on ne peut pas récupérer l'info d'essai
      }
    }

    logger.info({ priceId: priceId.substring(0, 10) + "…", mode: checkoutMode, hasTrialEnd: !!trialEndTimestamp }, '[checkout] Creating session');

    // Préparer les paramètres de la session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: checkoutMode,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/facturation/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/facturation/cancel`,
    };

    // Si on a un trial_end, l'ajouter aux données de subscription
    if (checkoutMode === 'subscription' && trialEndTimestamp) {
      sessionParams.subscription_data = {
        trial_end: trialEndTimestamp,
      };
    }

    // Créer la session de checkout
    const session = await stripe.checkout.sessions.create(sessionParams);

    // Renvoyer l'URL de la session
    if (!session.url) {
      return NextResponse.json(
        { error: 'Failed to create checkout session URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    // Logger l'erreur complète pour le debugging
    let errorMessage = 'Unknown error';
    let errorDetails: any = {};

    if (error instanceof Stripe.errors.StripeError) {
      errorMessage = error.message;
      errorDetails = {
        type: error.type,
        code: error.code,
        param: error.param,
        message: error.message,
      };
      
      // Message plus spécifique selon le type d'erreur
      if (error.type === 'StripeInvalidRequestError') {
        if (error.message?.includes('No such price')) {
          errorMessage = `Price ID invalide : "${priceId}". Vérifiez que vous utilisez un Price ID de test Stripe valide.`;
        } else if (error.message?.includes('Invalid API Key')) {
          errorMessage = 'Clé API Stripe invalide. Vérifiez votre STRIPE_SECRET_KEY.';
        }
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = {
        message: error.message,
        stack: error.stack,
      };
    } else {
      errorDetails = { raw: String(error) };
    }

    logger.error({ error: errorMessage, details: errorDetails, priceId: priceId ? priceId.substring(0, 10) + "…" : 'unknown' }, '[checkout] Stripe checkout error');
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
      },
      { status: 500 }
    );
  }
}


