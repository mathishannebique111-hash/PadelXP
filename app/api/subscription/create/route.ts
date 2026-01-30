import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getUserClubInfo } from '@/lib/utils/club-utils';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import type { PlanType } from '@/lib/subscription';
import { calculateFirstPaymentDate, getStripePriceId } from '@/lib/subscription';

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

const createSubscriptionSchema = z.object({
  plan: z.enum(['monthly', 'annual']),
});

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !supabaseAdmin) {
      logger.error({
        hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
        hasSupabaseAdmin: !!supabaseAdmin
      }, '[create-subscription] Missing configuration');
      return NextResponse.json(
        { error: 'Configuration serveur manquante. Veuillez contacter le support.' },
        { status: 500 }
      );
    }

    // Vérifier que les Price IDs sont configurés
    const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY;
    const annualPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL;

    if (!monthlyPriceId || !annualPriceId) {
      logger.error({
        hasMonthly: !!monthlyPriceId,
        hasAnnual: !!annualPriceId
      }, '[create-subscription] Stripe Price IDs not configured');
      return NextResponse.json(
        { error: 'Configuration des prix manquante. Veuillez contacter le support.' },
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

    // Récupérer le club de l'utilisateur
    const { clubId } = await getUserClubInfo();
    if (!clubId) {
      return NextResponse.json(
        { error: 'Club non trouvé' },
        { status: 404 }
      );
    }

    // Valider le body
    const body = await req.json();
    const parsedBody = createSubscriptionSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'Plan invalide', details: parsedBody.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const plan: PlanType = parsedBody.data.plan;

    // Récupérer les informations du club
    const { data: club, error: clubError } = await supabaseAdmin
      .from('clubs')
      .select('id, trial_start_date, trial_end_date, trial_current_end_date, stripe_customer_id, subscription_status, offer_type')
      .eq('id', clubId)
      .single();

    if (clubError || !club) {
      logger.error({ error: clubError, clubId: clubId.substring(0, 8) + "…" }, '[create-subscription] Error fetching club');
      return NextResponse.json(
        { error: 'Erreur lors de la récupération du club' },
        { status: 500 }
      );
    }

    // Vérifier que le club est en période d'essai
    // Utiliser trial_current_end_date si disponible, sinon trial_end_date
    const trialEndDateValue = club.trial_current_end_date || club.trial_end_date;

    if (!trialEndDateValue) {
      logger.error({ clubId: clubId.substring(0, 8) + "…" }, '[create-subscription] No trial end date found');
      return NextResponse.json(
        { error: 'Aucune période d\'essai trouvée' },
        { status: 400 }
      );
    }

    const trialEndDate = new Date(trialEndDateValue);
    const now = new Date();

    // Vérifier que la date de fin d'essai est dans le futur
    if (now >= trialEndDate) {
      logger.warn({
        clubId: clubId.substring(0, 8) + "…",
        trialEndDate: trialEndDate.toISOString(),
        now: now.toISOString()
      }, '[create-subscription] Trial already ended');
      return NextResponse.json(
        { error: 'La période d\'essai est déjà terminée' },
        { status: 400 }
      );
    }

    logger.info({
      clubId: clubId.substring(0, 8) + "…",
      trialEndDate: trialEndDate.toISOString(),
      daysRemaining: Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    }, '[create-subscription] Trial end date calculated');

    // Vérifier qu'il n'y a pas déjà une subscription active
    if (club.subscription_status === 'active' || club.subscription_status === 'trialing_with_plan') {
      return NextResponse.json(
        { error: 'Un abonnement est déjà actif ou en cours de configuration' },
        { status: 400 }
      );
    }

    // Récupérer ou créer le customer Stripe
    let customerId = club.stripe_customer_id;

    if (!customerId) {
      // Récupérer l'email de l'utilisateur
      // Priorité : email de la session > getUserById > club_admins > métadonnées
      let email = user.email;

      if (!email) {
        // Essayer de récupérer via getUserById
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(user.id);
          email = userData?.user?.email || null;
        } catch (error) {
          logger.warn({ error, userId: user.id.substring(0, 8) + "…" }, '[create-subscription] Error fetching user by ID');
        }
      }

      // Si toujours pas d'email, chercher dans club_admins
      if (!email) {
        try {
          const { data: clubAdmin } = await supabaseAdmin
            .from('club_admins')
            .select('email')
            .eq('user_id', user.id)
            .eq('club_id', clubId)
            .maybeSingle();

          if (clubAdmin?.email) {
            email = clubAdmin.email;
          }
        } catch (error) {
          logger.warn({ error, userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…" }, '[create-subscription] Error fetching email from club_admins');
        }
      }

      if (!email) {
        logger.error({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…" }, '[create-subscription] No email found for user');
        return NextResponse.json(
          { error: 'Email utilisateur non trouvé. Veuillez vérifier votre compte.' },
          { status: 400 }
        );
      }

      // Créer le customer Stripe
      const customer = await stripe.customers.create({
        email,
        metadata: {
          club_id: clubId,
        },
      });

      customerId = customer.id;

      // Mettre à jour le club avec le customer ID
      await supabaseAdmin
        .from('clubs')
        .update({ stripe_customer_id: customerId })
        .eq('id', clubId);
    }

    // Récupérer le Price ID avec l'offer_type
    const offerType = (club as any).offer_type || 'standard';
    const priceId = getStripePriceId(plan, offerType);

    if (!priceId) {
      logger.error({ plan, offerType }, '[create-subscription] Price ID not configured');
      return NextResponse.json(
        { error: `Price ID non configuré pour le plan ${plan} (offre ${offerType}). Veuillez contacter le support.` },
        { status: 500 }
      );
    }

    // Calculer trial_end (timestamp Unix)
    // S'assurer que le timestamp est dans le futur (minimum maintenant + 1 heure)
    const trialEndTimestamp = Math.floor(trialEndDate.getTime() / 1000);
    const nowTimestamp = Math.floor(now.getTime() / 1000);
    const minTrialEndTimestamp = nowTimestamp + 3600; // Minimum 1 heure dans le futur

    // Utiliser le maximum entre la date de fin d'essai et maintenant + 1 heure
    const finalTrialEndTimestamp = Math.max(trialEndTimestamp, minTrialEndTimestamp);

    logger.info({
      clubId: clubId.substring(0, 8) + "…",
      trialEndTimestamp,
      nowTimestamp,
      minTrialEndTimestamp,
      finalTrialEndTimestamp,
      trialEndDateISO: trialEndDate.toISOString(),
      finalTrialEndDateISO: new Date(finalTrialEndTimestamp * 1000).toISOString()
    }, '[create-subscription] Trial end timestamp calculated for Stripe');

    // Créer la subscription Stripe avec trial_end
    let subscription: Stripe.Subscription;
    try {
      subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice', 'latest_invoice.payment_intent'],
        metadata: {
          club_id: clubId,
          plan: plan,
        },
        trial_end: finalTrialEndTimestamp,
      });

      logger.info({
        subscriptionId: subscription.id.substring(0, 8) + "…",
        trialEnd: subscription.trial_end,
        trialStart: subscription.trial_start,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end
      }, '[create-subscription] Stripe subscription created with trial');
    } catch (stripeError: any) {
      logger.error({
        error: stripeError?.message || String(stripeError),
        type: stripeError?.type,
        code: stripeError?.code,
        plan,
        customerId: customerId.substring(0, 8) + "…",
        priceId: priceId.substring(0, 8) + "…"
      }, '[create-subscription] Stripe subscription creation failed');

      const errorMessage = stripeError?.message || 'Erreur lors de la création de l\'abonnement Stripe';
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    // Récupérer le client_secret pour la confirmation du paiement
    const invoice = subscription.latest_invoice;

    // Vérifier que l'invoice est bien un objet Invoice
    if (!invoice || typeof invoice !== 'object') {
      logger.error({
        subscriptionId: subscription.id,
        invoiceType: typeof invoice,
        invoice
      }, '[create-subscription] Invalid invoice type');

      try {
        await stripe.subscriptions.cancel(subscription.id);
      } catch (cancelError) {
        logger.error({ error: cancelError, subscriptionId: subscription.id }, '[create-subscription] Error canceling subscription');
      }

      return NextResponse.json(
        { error: 'Erreur lors de la récupération de la facture. Veuillez réessayer.' },
        { status: 500 }
      );
    }

    // L'invoice peut être une string (ID) ou un objet Invoice
    // Si c'est une string, on doit le récupérer
    let invoiceObj: Stripe.Invoice;
    if (typeof invoice === 'string') {
      try {
        invoiceObj = await stripe.invoices.retrieve(invoice, {
          expand: ['payment_intent']
        });
      } catch (invoiceError) {
        logger.error({ error: invoiceError, invoiceId: invoice }, '[create-subscription] Error retrieving invoice');
        try {
          await stripe.subscriptions.cancel(subscription.id);
        } catch (cancelError) {
          logger.error({ error: cancelError, subscriptionId: subscription.id }, '[create-subscription] Error canceling subscription');
        }
        return NextResponse.json(
          { error: 'Erreur lors de la récupération de la facture. Veuillez réessayer.' },
          { status: 500 }
        );
      }
    } else {
      invoiceObj = invoice as Stripe.Invoice;
    }

    // Récupérer le payment_intent
    // Pour une subscription avec trial_end, le payment_intent peut ne pas exister immédiatement
    const paymentIntent = invoiceObj.payment_intent;

    // Le payment_intent peut être une string (ID) ou un objet PaymentIntent, ou null/undefined
    let paymentIntentObj: Stripe.PaymentIntent | null = null;
    if (typeof paymentIntent === 'string') {
      try {
        paymentIntentObj = await stripe.paymentIntents.retrieve(paymentIntent);
      } catch (piError) {
        logger.warn({ error: piError, paymentIntentId: paymentIntent }, '[create-subscription] Error retrieving payment intent (may not exist yet for trial)');
      }
    } else if (paymentIntent && typeof paymentIntent === 'object') {
      paymentIntentObj = paymentIntent as Stripe.PaymentIntent;
    }

    // Si pas de payment_intent, c'est normal pour une subscription en trial
    // On peut créer un setup intent ou retourner la subscription sans client_secret
    // et le récupérer plus tard quand le trial se termine
    const clientSecret = paymentIntentObj?.client_secret;

    // Si pas de client_secret, créer un SetupIntent pour collecter la méthode de paiement
    // C'est nécessaire pour une subscription en trial
    if (!clientSecret || typeof clientSecret !== 'string') {
      logger.info({
        subscriptionId: subscription.id,
        invoiceStatus: invoiceObj.status,
        invoiceId: invoiceObj.id,
        hasPaymentIntent: !!paymentIntent,
        trialEnd: trialEndTimestamp
      }, '[create-subscription] No payment_intent yet, creating SetupIntent for trial subscription');

      try {
        // Créer un SetupIntent pour collecter la méthode de paiement
        const setupIntent = await stripe.setupIntents.create({
          customer: customerId,
          payment_method_types: ['card'],
          metadata: {
            club_id: clubId,
            subscription_id: subscription.id,
            plan: plan,
          },
        });

        if (!setupIntent.client_secret) {
          throw new Error('SetupIntent created but no client_secret returned');
        }

        logger.info({
          subscriptionId: subscription.id,
          setupIntentId: setupIntent.id
        }, '[create-subscription] SetupIntent created successfully');

        // Mettre à jour le club dans Supabase
        const { error: updateError } = await supabaseAdmin
          .from('clubs')
          .update({
            stripe_subscription_id: subscription.id,
            selected_plan: plan,
            plan_selected_at: new Date().toISOString(),
            subscription_status: 'trialing_with_plan',
            // Clear suspension if club was suspended
            is_suspended: false,
            suspended_at: null,
            scheduled_deletion_at: null,
          })
          .eq('id', clubId);

        if (updateError) {
          logger.error({ error: updateError, clubId: clubId.substring(0, 8) + "…" }, '[create-subscription] Error updating club');
          // Annuler la subscription et le setup intent en cas d'erreur
          try {
            await stripe.subscriptions.cancel(subscription.id);
            await stripe.setupIntents.cancel(setupIntent.id);
          } catch (cancelError) {
            logger.error({ error: cancelError }, '[create-subscription] Error canceling subscription/setupIntent');
          }
          return NextResponse.json(
            { error: 'Erreur lors de la mise à jour du club' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          subscriptionId: subscription.id,
          clientSecret: setupIntent.client_secret,
          isSetupIntent: true, // Indique que c'est un SetupIntent, pas un PaymentIntent
          trialEndDate: trialEndDate.toISOString(),
          firstPaymentDate: calculateFirstPaymentDate(club.trial_end_date)?.toISOString(),
        });
      } catch (setupError: any) {
        logger.error({
          error: setupError?.message || String(setupError),
          subscriptionId: subscription.id
        }, '[create-subscription] Error creating SetupIntent');

        // Annuler la subscription en cas d'erreur
        try {
          await stripe.subscriptions.cancel(subscription.id);
        } catch (cancelError) {
          logger.error({ error: cancelError, subscriptionId: subscription.id }, '[create-subscription] Error canceling subscription');
        }

        return NextResponse.json(
          { error: 'Erreur lors de la configuration du paiement. Veuillez réessayer.' },
          { status: 500 }
        );
      }
    }

    if (!clientSecret || typeof clientSecret !== 'string') {
      logger.error({
        subscriptionId: subscription.id,
        hasInvoice: !!invoiceObj,
        invoiceId: typeof invoice === 'string' ? invoice : invoiceObj.id,
        hasPaymentIntent: !!paymentIntent,
        paymentIntentId: typeof paymentIntent === 'string' ? paymentIntent : paymentIntentObj?.id,
        paymentIntentStatus: paymentIntentObj?.status,
        invoiceStatus: invoiceObj.status
      }, '[create-subscription] No client_secret found');

      // Annuler la subscription si on ne peut pas obtenir le client_secret
      try {
        await stripe.subscriptions.cancel(subscription.id);
      } catch (cancelError) {
        logger.error({ error: cancelError, subscriptionId: subscription.id }, '[create-subscription] Error canceling subscription');
      }

      return NextResponse.json(
        { error: 'Impossible de récupérer les informations de paiement. Veuillez réessayer ou contacter le support.' },
        { status: 500 }
      );
    }

    // Mettre à jour le club dans Supabase
    const { error: updateError } = await supabaseAdmin
      .from('clubs')
      .update({
        stripe_subscription_id: subscription.id,
        selected_plan: plan,
        plan_selected_at: new Date().toISOString(),
        subscription_status: 'trialing_with_plan',
        // Clear suspension if club was suspended
        is_suspended: false,
        suspended_at: null,
        scheduled_deletion_at: null,
      })
      .eq('id', clubId);

    if (updateError) {
      logger.error({ error: updateError, clubId: clubId.substring(0, 8) + "…" }, '[create-subscription] Error updating club');
      // Annuler la subscription Stripe en cas d'erreur
      await stripe.subscriptions.cancel(subscription.id);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du club' },
        { status: 500 }
      );
    }

    logger.info({
      clubId: clubId.substring(0, 8) + "…",
      subscriptionId: subscription.id.substring(0, 8) + "…",
      plan,
      trialEndTimestamp,
    }, '[create-subscription] Subscription created successfully');

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      clientSecret,
      trialEndDate: trialEndDate.toISOString(),
      firstPaymentDate: calculateFirstPaymentDate(club.trial_end_date)?.toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error({
      error: errorMessage,
      stack: errorStack,
    }, '[create-subscription] Unexpected error');

    // Si c'est une erreur Stripe, retourner le message spécifique
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as any;
      return NextResponse.json(
        { error: stripeError.message || 'Erreur Stripe lors de la création de l\'abonnement' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: errorMessage || 'Erreur lors de la création de l\'abonnement' },
      { status: 500 }
    );
  }
}

