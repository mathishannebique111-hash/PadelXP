import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { BOOST_PRICE_IDS } from '@/lib/config/boost-prices';
import { logger } from '@/lib/logger';

// Fonction helper pour récupérer les variables d'environnement au runtime
function getEnvVar(key: string): string | undefined {
  return typeof process !== 'undefined' && process.env ? process.env[key] : undefined;
}

// Initialiser Stripe avec la clé secrète
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
});

export const dynamic = 'force-dynamic';

/**
 * Schéma Stripe checkout boost : priceId Stripe obligatoire, quantity entière positive (fallback = 1).
 */
const checkoutBoostSchema = z.object({
  priceId: z.string().min(1, 'priceId requis').regex(/^price_[a-zA-Z0-9]+$/, 'priceId Stripe invalide'),
  quantity: z.number().int().positive().max(100).optional(),
});

export async function POST(req: NextRequest) {
  let priceId: string | undefined;
  let quantity: number = 1;

  try {
    // Vérifier que la clé Stripe est configurée
    if (!process.env.STRIPE_SECRET_KEY) {
      logger.error('[checkout-boost] STRIPE_SECRET_KEY is not configured');
      return NextResponse.json(
        { error: 'Stripe configuration missing' },
        { status: 500 }
      );
    }

    // Vérifier que l'URL du site est configurée
    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      logger.error('[checkout-boost] NEXT_PUBLIC_SITE_URL is not configured');
      return NextResponse.json(
        { error: 'Site URL configuration missing' },
        { status: 500 }
      );
    }

    // Récupérer l'utilisateur authentifié avec gestion d'erreur robuste
    let supabase;
    try {
      supabase = await createClient();
      if (!supabase) {
        logger.error('[checkout-boost] Supabase client is null or undefined after creation');
        return NextResponse.json(
          { error: 'Erreur de configuration serveur. Veuillez rafraîchir la page et réessayer.' },
          { status: 500 }
        );
      }
    } catch (clientError) {
      logger.error({ err: clientError }, '[checkout-boost] Error creating Supabase client');
      return NextResponse.json(
        { error: 'Erreur de configuration serveur. Veuillez rafraîchir la page et réessayer.' },
        { status: 500 }
      );
    }

    let user;
    let authError;
    try {
      const authResult = await supabase.auth.getUser();
      user = authResult.data?.user || null;
      authError = authResult.error || null;
      
      // Log pour debugging
      if (authError) {
        logger.error({
          message: authError.message,
          status: authError.status,
        }, '[checkout-boost] Auth error from getUser');
      }
      
      if (!user) {
        logger.error({
          hasError: !!authError,
          errorMessage: authError?.message,
        }, '[checkout-boost] User is null after getUser');
      }
    } catch (authException) {
      logger.error({ err: authException }, '[checkout-boost] Exception during getUser');
      return NextResponse.json(
        { error: 'Erreur d\'authentification. Veuillez vous reconnecter.' },
        { status: 401 }
      );
    }

    if (authError || !user) {
      logger.error({
        hasError: !!authError,
        errorMessage: authError?.message,
        errorStatus: authError?.status,
        hasUser: !!user,
      }, '[checkout-boost] Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Session expirée. Veuillez vous reconnecter.' },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur a un ID valide
    if (!user.id || typeof user.id !== 'string') {
      const userIdPreview = user.id.substring(0, 8) + "…";
      logger.error({ userId: userIdPreview }, '[checkout-boost] Invalid user ID');
      return NextResponse.json(
        { error: 'Informations utilisateur invalides. Veuillez vous reconnecter.' },
        { status: 401 }
      );
    }

    // Parser le body de la requête avec gestion d'erreur
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      logger.error({ err: parseError }, '[checkout-boost] Error parsing request body');
      return NextResponse.json(
        { error: 'Format de requête invalide' },
        { status: 400 }
      );
    }

    const parsedBody = checkoutBoostSchema.safeParse(body);
    if (!parsedBody.success) {
      logger.error({ details: parsedBody.error.flatten().fieldErrors }, '[checkout-boost] Invalid payload');
      return NextResponse.json(
        { error: 'Payload invalide', details: parsedBody.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    priceId = parsedBody.data.priceId;
    quantity = parsedBody.data.quantity ?? 1;

    // Debug: Vérifier les valeurs reçues
    logger.info({
      priceId: priceId || 'EMPTY',
      quantity,
      receivedPriceIdType: typeof priceId,
    }, '[checkout-boost] Request body');
    logger.info({ boostPriceIds: BOOST_PRICE_IDS }, '[checkout-boost] BOOST_PRICE_IDS from config');

    // Valider le priceId
    if (!priceId || typeof priceId !== 'string' || priceId.trim() === '') {
      logger.error({
        priceId,
        type: typeof priceId,
        isEmpty: priceId === '',
        isWhitespace: priceId?.trim() === '',
      }, '[checkout-boost] Invalid or missing priceId');
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
      logger.warn({
        receivedPriceId: priceId,
        knownPriceIds: { x1: priceId1, x5: priceId5, x10: priceId10 },
        boostsToCredit,
      }, '[checkout-boost] Price ID non reconnu, utilisation de la quantité fournie');
    }

    // Quantité Stripe est toujours 1 pour les produits fixes
    const stripeQuantity = 1;

    logger.info({
      priceId,
      stripeQuantity,
      boostsToCredit,
      userId: user.id,
    }, '[checkout-boost] Creating session');

    // Créer la session de checkout en mode "payment" (paiement unique, pas abonnement)
    let session;
    try {
      session = await stripe.checkout.sessions.create({
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
    } catch (stripeError) {
      logger.error({ err: stripeError }, '[checkout-boost] Stripe session creation error');
      if (stripeError instanceof Stripe.errors.StripeError) {
        throw stripeError; // Sera géré dans le catch global
      }
      throw new Error(`Erreur lors de la création de la session Stripe: ${stripeError instanceof Error ? stripeError.message : 'Erreur inconnue'}`);
    }

    // Vérifier que la session et l'URL existent
    if (!session) {
      logger.error('[checkout-boost] Session created but is null/undefined');
      return NextResponse.json(
        { error: 'Échec de la création de la session de paiement' },
        { status: 500 }
      );
    }

    if (!session.url || typeof session.url !== 'string') {
      logger.error({ session }, '[checkout-boost] Session URL is missing or invalid');
      return NextResponse.json(
        { error: 'URL de session de paiement manquante' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    // Logger l'erreur complète pour le debugging avec gestion robuste
    let errorMessage = 'Erreur lors de la création de la session de paiement';
    let errorDetails: any = {};
    let statusCode = 500;

    try {
      if (error instanceof Stripe.errors.StripeError) {
        errorMessage = error.message || errorMessage;
        errorDetails = {
          type: error.type,
          code: error.code,
          param: error.param,
          message: error.message,
        };

        // Message plus spécifique selon le type d'erreur
        if (error.type === 'StripeInvalidRequestError') {
          if (error.message?.includes('No such price')) {
            errorMessage = `Price ID invalide : "${priceId || 'non fourni'}". Vérifiez que vous utilisez un Price ID de test Stripe valide.`;
            statusCode = 400;
          } else if (error.message?.includes('Invalid API Key')) {
            errorMessage = 'Clé API Stripe invalide. Vérifiez votre STRIPE_SECRET_KEY.';
            statusCode = 500;
          }
        } else if (error.type === 'StripeAuthenticationError') {
          errorMessage = 'Erreur d\'authentification Stripe. Vérifiez votre configuration.';
          statusCode = 500;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
        errorDetails = {
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        };
        
        // Gérer les erreurs spécifiques
        if (error.message?.includes('Unauthorized') || error.message?.includes('auth')) {
          statusCode = 401;
        } else if (error.message?.includes('invalid') || error.message?.includes('Invalid')) {
          statusCode = 400;
        }
      } else {
        errorDetails = { raw: String(error) };
      }
    } catch (nestedError) {
      logger.error({ err: nestedError }, '[checkout-boost] Error processing error');
      // En cas d'erreur lors du traitement de l'erreur, utiliser un message générique
      errorMessage = 'Erreur serveur lors de la création de la session de paiement';
      statusCode = 500;
    }

    logger.error({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
      priceId: priceId || 'unknown',
      quantity,
    }, '[checkout-boost] Stripe checkout error');

    // Toujours retourner une réponse JSON valide avec gestion d'erreur
    try {
      const responseData: any = {
        error: errorMessage,
      };
      
      if (process.env.NODE_ENV === 'development' && errorDetails && Object.keys(errorDetails).length > 0) {
        responseData.details = errorDetails;
      }

      return NextResponse.json(responseData, { status: statusCode });
    } catch (jsonError) {
      // En dernier recours, retourner une réponse simple
      logger.error({ err: jsonError }, '[checkout-boost] Error creating error response');
      return new NextResponse(
        JSON.stringify({ error: 'Erreur serveur critique' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }
}
