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

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const subscriptionId = searchParams.get('subscription_id');

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'subscription_id requis' },
        { status: 400 }
      );
    }

    // Récupérer la subscription Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice.payment_intent'],
    });

    // Vérifier que la subscription appartient au club
    if (subscription.metadata?.club_id !== clubId) {
      return NextResponse.json(
        { error: 'Subscription non trouvée' },
        { status: 404 }
      );
    }

    // Récupérer le client_secret
    // Pour une subscription en trial, il peut ne pas y avoir de payment_intent immédiatement
    // On doit créer un SetupIntent pour collecter la méthode de paiement
    const invoice = subscription.latest_invoice;
    
    let invoiceObj: Stripe.Invoice | null = null;
    if (invoice && typeof invoice === 'object') {
      invoiceObj = invoice as Stripe.Invoice;
    } else if (typeof invoice === 'string') {
      try {
        invoiceObj = await stripe.invoices.retrieve(invoice, {
          expand: ['payment_intent']
        });
      } catch (invoiceError) {
        logger.warn({ error: invoiceError, invoiceId: invoice }, '[get-subscription] Error retrieving invoice');
      }
    }

    let clientSecret: string | null = null;
    let isSetupIntent = false;

    // Essayer de récupérer le payment_intent depuis l'invoice
    if (invoiceObj?.payment_intent) {
      const paymentIntent = invoiceObj.payment_intent;
      
      if (typeof paymentIntent === 'string') {
        try {
          const paymentIntentObj = await stripe.paymentIntents.retrieve(paymentIntent);
          clientSecret = paymentIntentObj.client_secret || null;
        } catch (piError) {
          logger.warn({ error: piError, paymentIntentId: paymentIntent }, '[get-subscription] Error retrieving payment intent');
        }
      } else if (paymentIntent && typeof paymentIntent === 'object') {
        clientSecret = (paymentIntent as Stripe.PaymentIntent).client_secret || null;
      }
    }

    // Si pas de payment_intent, créer un SetupIntent pour collecter la méthode de paiement
    if (!clientSecret) {
      logger.info({ 
        subscriptionId: subscription.id,
        invoiceStatus: invoiceObj?.status,
        trialEnd: subscription.trial_end
      }, '[get-subscription] No payment_intent found, creating SetupIntent');

      try {
        const customerId = typeof subscription.customer === 'string' 
          ? subscription.customer 
          : subscription.customer.id;

        const setupIntent = await stripe.setupIntents.create({
          customer: customerId,
          payment_method_types: ['card'],
          metadata: {
            club_id: clubId,
            subscription_id: subscription.id,
          },
        });

        if (setupIntent.client_secret) {
          clientSecret = setupIntent.client_secret;
          isSetupIntent = true;
          
          logger.info({ 
            subscriptionId: subscription.id,
            setupIntentId: setupIntent.id
          }, '[get-subscription] SetupIntent created successfully');
        }
      } catch (setupError) {
        logger.error({ 
          error: setupError,
          subscriptionId: subscription.id
        }, '[get-subscription] Error creating SetupIntent');
        
        return NextResponse.json(
          { error: 'Erreur lors de la configuration du paiement. Veuillez réessayer.' },
          { status: 500 }
        );
      }
    }

    if (!clientSecret) {
      logger.error({ 
        subscriptionId: subscription.id,
        hasInvoice: !!invoiceObj,
        invoiceStatus: invoiceObj?.status
      }, '[get-subscription] No client_secret found after all attempts');
      
      return NextResponse.json(
        { error: 'Impossible de récupérer les informations de paiement. Veuillez réessayer.' },
        { status: 500 }
      );
    }

    // Récupérer la date de fin d'essai
    const trialEndDate = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null;

    if (!trialEndDate) {
      return NextResponse.json(
        { error: 'Date de fin d\'essai non trouvée' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      clientSecret,
      trialEndDate,
      isSetupIntent, // Indique si c'est un SetupIntent ou un PaymentIntent
    });
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, '[get-subscription] Unexpected error');

    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la subscription' },
      { status: 500 }
    );
  }
}

