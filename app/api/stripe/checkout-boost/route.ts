import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { BOOST_PRICE_IDS } from '@/lib/config/boost-prices';

// Fonction helper pour récupérer les variables d'environnement au runtime
function getEnvVar(key: string): string | undefined {
  return typeof process !== 'undefined' && process.env ? process.env[key] : undefined;
}

// Initialiser Stripe avec la clé secrète
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let priceId: string | undefined;
  let quantity: number = 1;

  try {
    // Vérifier que la clé Stripe est configurée
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[checkout-boost] STRIPE_SECRET_KEY is not configured');
      return NextResponse.json(
        { error: 'Stripe configuration missing' },
        { status: 500 }
      );
    }

    // Vérifier que l'URL du site est configurée
    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      console.error('[checkout-boost] NEXT_PUBLIC_SITE_URL is not configured');
      return NextResponse.json(
        { error: 'Site URL configuration missing' },
        { status: 500 }
      );
    }

    // Récupérer l'utilisateur authentifié
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[checkout-boost] Unauthorized:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parser le body de la requête
    const body = await req.json();
    priceId = body.priceId; // Le priceId est maintenant passé directement depuis le frontend
    quantity = body.quantity || 1;

    // Debug: Vérifier les valeurs reçues
    console.log('[checkout-boost] Request body:', {
      priceId: priceId || 'EMPTY',
      quantity,
      receivedPriceIdType: typeof priceId,
    });
    console.log('[checkout-boost] BOOST_PRICE_IDS from config:', BOOST_PRICE_IDS);

    // Valider le priceId
    if (!priceId || typeof priceId !== 'string' || priceId.trim() === '') {
      console.error('[checkout-boost] Invalid or missing priceId:', {
        priceId,
        type: typeof priceId,
        isEmpty: priceId === '',
        isWhitespace: priceId?.trim() === '',
      });
      return NextResponse.json(
        { 
          error: 'Price ID requis et doit être une chaîne de caractères',
          debug: process.env.NODE_ENV === 'development' ? {
            received: priceId,
            type: typeof priceId,
          } : undefined
        },
        { status: 400 }
      );
    }

    // Déterminer la quantité de boosts à créditer selon le Price ID
    // Vérifier aussi directement les variables d'environnement au runtime
    const priceId1 = BOOST_PRICE_IDS.x1 || getEnvVar('NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_1') || getEnvVar('STRIPE_PRICE_PLAYER_BOOST');
    const priceId5 = BOOST_PRICE_IDS.x5 || getEnvVar('NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_5');
    const priceId10 = BOOST_PRICE_IDS.x10 || getEnvVar('NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_10');
    
    let boostsToCredit = 1;
    if (priceId === priceId1) {
      boostsToCredit = 1;
    } else if (priceId === priceId5) {
      boostsToCredit = 5;
    } else if (priceId === priceId10) {
      boostsToCredit = 10;
    } else {
      // Si le Price ID n'est pas reconnu, utiliser la quantité passée (fallback)
      boostsToCredit = quantity || 1;
      console.warn('[checkout-boost] Price ID non reconnu, utilisation de la quantité fournie:', {
        receivedPriceId: priceId,
        knownPriceIds: { x1: priceId1, x5: priceId5, x10: priceId10 },
        boostsToCredit,
      });
    }

    // Quantité Stripe est toujours 1 pour les produits fixes
    const stripeQuantity = 1;

    console.log('[checkout-boost] Creating session:', {
      priceId,
      stripeQuantity,
      boostsToCredit,
      userId: user.id,
    });

    // Créer la session de checkout en mode "payment" (paiement unique, pas abonnement)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', // Paiement unique
      line_items: [
        {
          price: priceId,
          quantity: stripeQuantity, // Toujours 1 pour les produits fixes
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/boost/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/boost?cancelled=true`,
      customer_email: user.email || undefined,
      metadata: {
        user_id: user.id,
        type: 'player_boost',
        quantity: boostsToCredit.toString(), // Quantité réelle de boosts à créditer (1, 5 ou 10)
        price_id: priceId, // Stocker le Price ID pour référence
      },
    });

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

    console.error('[checkout-boost] Stripe checkout error:', {
      error: errorMessage,
      details: errorDetails,
      priceId: priceId || 'unknown',
      quantity,
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

