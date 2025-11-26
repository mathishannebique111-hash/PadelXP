import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getUserClubInfo } from '@/lib/utils/club-utils';
import { getClubSubscription } from '@/lib/utils/subscription-utils';

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
      console.error('STRIPE_SECRET_KEY is not configured');
      return NextResponse.json(
        { error: 'Stripe configuration missing' },
        { status: 500 }
      );
    }

    // Vérifier que l'URL du site est configurée
    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      console.error('NEXT_PUBLIC_SITE_URL is not configured');
      return NextResponse.json(
        { error: 'Site URL configuration missing' },
        { status: 500 }
      );
    }

    // Parser et valider le body de la requête
    const body = await req.json();
    const parsedBody = stripeCheckoutSchema.safeParse(body);
    if (!parsedBody.success) {
      console.error('[checkout] Invalid payload', parsedBody.error.flatten().fieldErrors);
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
            
            // Si le club a une période d'essai qui n'est pas encore terminée
            if (subscription?.trial_end_at) {
              const trialEndDate = new Date(subscription.trial_end_at);
              const now = new Date();
              
              // Si l'essai n'est pas encore terminé
              if (trialEndDate > now) {
                // Calculer le lendemain de la fin de l'essai à minuit (00:00:00)
                const nextDay = new Date(trialEndDate);
                nextDay.setDate(nextDay.getDate() + 1);
                nextDay.setHours(0, 0, 0, 0);
                
                // Convertir en timestamp Unix (secondes)
                trialEndTimestamp = Math.floor(nextDay.getTime() / 1000);
                
                console.log('[checkout] Trial end date found:', {
                  trialEndAt: subscription.trial_end_at,
                  trialEndDate: trialEndDate.toISOString(),
                  nextDay: nextDay.toISOString(),
                  trialEndTimestamp,
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('[checkout] Error fetching trial info:', error);
        // On continue même si on ne peut pas récupérer l'info d'essai
      }
    }

    console.log('[checkout] Creating session:', { 
      priceId, 
      mode: checkoutMode,
      trialEndTimestamp: trialEndTimestamp || undefined,
    });

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

    console.error('[checkout] Stripe checkout error:', {
      error: errorMessage,
      details: errorDetails,
      priceId: priceId || 'unknown',
    });
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
      },
      { status: 500 }
    );
  }
}


