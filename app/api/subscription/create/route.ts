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
  apiVersion: '2025-10-29.clover',
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
  withReservations: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !supabaseAdmin) {
      logger.error('[create-subscription] Missing configuration', {
        hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
        hasSupabaseAdmin: !!supabaseAdmin
      });
      return NextResponse.json(
        { error: 'Configuration serveur manquante. Veuillez contacter le support.' },
        { status: 500 }
      );
    }

    // Vérifier que les Price IDs sont configurés
    const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY;
    const annualPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL;

    if (!monthlyPriceId || !annualPriceId) {
      logger.error('[create-subscription] Stripe Price IDs not configured', {
        hasMonthly: !!monthlyPriceId,
        hasAnnual: !!annualPriceId
      });
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
    const withReservations = parsedBody.data.withReservations || false;

    // Récupérer les informations du club
    const { data: club, error: clubError } = await supabaseAdmin
      .from('clubs')
      .select('id, trial_start_date, trial_end_date, trial_current_end_date, stripe_customer_id, subscription_status, offer_type')
      .eq('id', clubId)
      .single();

    if (clubError || !club) {
      logger.error('[create-subscription] Error fetching club', { error: clubError, clubId: clubId.substring(0, 8) + "…" });
      return NextResponse.json(
        { error: 'Erreur lors de la récupération du club' },
        { status: 500 }
      );
    }

    // Vérifier que le club est en période d'essai
    // Utiliser trial_current_end_date si disponible, sinon trial_end_date
    const trialEndDateValue = club.trial_current_end_date || club.trial_end_date;

    if (!trialEndDateValue) {
      logger.error('[create-subscription] No trial end date found', { clubId: clubId.substring(0, 8) + "…" });
      return NextResponse.json(
        { error: 'Aucune période d\'essai trouvée' },
        { status: 400 }
      );
    }

    const trialEndDate = new Date(trialEndDateValue);
    const now = new Date();

    // Vérifier que la date de fin d'essai est dans le futur
    if (now >= trialEndDate) {
      logger.warn('[create-subscription] Trial already ended', {
        clubId: clubId.substring(0, 8) + "…",
        trialEndDate: trialEndDate.toISOString(),
        now: now.toISOString()
      });
      return NextResponse.json(
        { error: 'La période d\'essai est déjà terminée' },
        { status: 400 }
      );
    }

    logger.info('[create-subscription] Trial end date calculated', {
      clubId: clubId.substring(0, 8) + "…",
      trialEndDate: trialEndDate.toISOString(),
      daysRemaining: Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    });

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
        // Essayer de récupérer via getUserById (though user.email should be present from initial getUser)
        try {
          const { data: userData } = await supabase.auth.getUser(); // Changed from admin.getUserById
          email = userData?.user?.email || null;
        } catch (error) {
          logger.warn('[create-subscription] Error fetching user', { error, userId: user.id.substring(0, 8) + "…" });
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
          logger.warn('[create-subscription] Error fetching email from club_admins', { error, userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…" });
        }
      }

      if (!email) {
        logger.error('[create-subscription] No email found for user', { userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…" });
        return NextResponse.json(
          { error: 'Email utilisateur non trouvé. Veuillez vérifier votre compte.' },
          { status: 400 }
        );
      }

      // Créer le customer Stripe
      const customer = await stripe.customers.create({
        email,
        metadata: { club_id: clubId },
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
      logger.error('[create-subscription] Price ID not configured', { plan, offerType });
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

    // Préparer les items Stripe
    const items: Stripe.SubscriptionCreateParams.Item[] = [{ price: priceId }];
    
    // Ajouter l'option réservations si demandée
    if (withReservations) {
      const reservationsPriceId = plan === 'annual' 
        ? process.env.NEXT_PUBLIC_STRIPE_PRICE_RESERVATIONS_ANNUAL
        : process.env.NEXT_PUBLIC_STRIPE_PRICE_RESERVATIONS_MONTHLY;

      if (!reservationsPriceId) {
        logger.error('[create-subscription] Reservations Price ID not configured', { plan });
        return NextResponse.json(
          { error: `Price ID pour les réservations non configuré pour le plan ${plan}. Veuillez contacter le support.` },
          { status: 500 }
        );
      }
      items.push({ price: reservationsPriceId });
    }

    logger.info('[create-subscription] Trial end timestamp calculated for Stripe', {
      clubId: clubId.substring(0, 8) + "…",
      trialEndTimestamp,
      finalTrialEndTimestamp,
      withReservations
    });

    // Créer la subscription Stripe avec trial_end
    let subscription: Stripe.Subscription;
    try {
      subscription = await stripe.subscriptions.create({
        customer: customerId,
        items,
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice', 'latest_invoice.payment_intent'],
        metadata: {
          club_id: clubId,
          plan: plan,
          withReservations: String(withReservations),
        },
        trial_end: finalTrialEndTimestamp,
      });

      logger.info('[create-subscription] Stripe subscription created with trial', {
        subscriptionId: subscription.id.substring(0, 8) + "…",
        trialEnd: subscription.trial_end,
        trialStart: subscription.trial_start,
        status: subscription.status,
        currentPeriodEnd: (subscription as any).current_period_end
      });
    } catch (stripeError: any) {
      logger.error('[create-subscription] Stripe subscription creation failed', {
        error: stripeError?.message || String(stripeError),
        type: stripeError?.type,
        code: stripeError?.code,
        plan,
        customerId: customerId.substring(0, 8) + "…",
        priceId: priceId.substring(0, 8) + "…"
      });

      const errorMessage = stripeError?.message || 'Erreur lors de la création de l\'abonnement Stripe';
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    // Récupérer le client_secret pour la confirmation du paiement
    const invoice = subscription.latest_invoice as Stripe.Invoice | null;

    if (!invoice) {
      logger.error('[create-subscription] Invalid invoice type or missing invoice', {
        subscriptionId: subscription.id,
        invoiceType: typeof subscription.latest_invoice,
        invoice: subscription.latest_invoice
      });

      try {
        await stripe.subscriptions.cancel(subscription.id);
      } catch (cancelError) {
        logger.error('[create-subscription] Error canceling subscription after missing invoice', { error: cancelError, subscriptionId: subscription.id });
      }

      return NextResponse.json(
        { error: 'Erreur lors de la récupération de la facture. Veuillez réessayer.' },
        { status: 500 }
      );
    }

    const paymentIntent = (invoice as any).payment_intent as Stripe.PaymentIntent | null;
    const clientSecret = paymentIntent?.client_secret;

    // Si pas de client_secret, créer un SetupIntent pour collecter la méthode de paiement
    // C'est nécessaire pour une subscription en trial
    if (!clientSecret || typeof clientSecret !== 'string') {
      logger.info('[create-subscription] No payment_intent yet, creating SetupIntent for trial subscription', {
        subscriptionId: subscription.id,
        invoiceStatus: invoice.status,
        invoiceId: invoice.id,
        hasPaymentIntent: !!paymentIntent,
        trialEnd: trialEndTimestamp
      });

      try {
        // Créer un SetupIntent pour collecter la méthode de paiement
        const setupIntent = await stripe.setupIntents.create({
          customer: customerId,
          payment_method_types: ['card'],
          metadata: {
            club_id: clubId,
            subscription_id: subscription.id,
            plan: plan,
            withReservations: String(withReservations), // Added withReservations to SetupIntent metadata
          },
        });

        if (!setupIntent.client_secret) {
          throw new Error('SetupIntent created but no client_secret returned');
        }

        logger.info('[create-subscription] SetupIntent created successfully', {
          subscriptionId: subscription.id,
          setupIntentId: setupIntent.id
        });

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
          logger.error('[create-subscription] Error updating club after SetupIntent creation', { error: updateError, clubId: clubId.substring(0, 8) + "…" });
          // Annuler la subscription et le setup intent en cas d'erreur
          try {
            await stripe.subscriptions.cancel(subscription.id);
            await stripe.setupIntents.cancel(setupIntent.id);
          } catch (cancelError) {
            logger.error('[create-subscription] Error canceling subscription/setupIntent after club update failure', { error: cancelError });
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
        });
      } catch (setupError: any) {
        logger.error('[create-subscription] Error creating SetupIntent', {
          error: setupError?.message || String(setupError),
          subscriptionId: subscription.id
        });

        // Annuler la subscription en cas d'erreur
        try {
          await stripe.subscriptions.cancel(subscription.id);
        } catch (cancelError) {
          logger.error('[create-subscription] Error canceling subscription after SetupIntent failure', { error: cancelError, subscriptionId: subscription.id });
        }

        return NextResponse.json(
          { error: 'Erreur lors de la configuration du paiement. Veuillez réessayer.' },
          { status: 500 }
        );
      }
    }

    // This block should ideally not be reached if clientSecret is null/undefined
    // as the SetupIntent logic above handles that.
    // However, keeping it for robustness in case clientSecret is not a string.
    if (!clientSecret || typeof clientSecret !== 'string') {
      logger.error('[create-subscription] No client_secret found (unexpected path)', {
        subscriptionId: subscription.id,
        hasInvoice: !!invoice,
        invoiceId: invoice?.id,
        hasPaymentIntent: !!paymentIntent,
        paymentIntentId: paymentIntent?.id,
        paymentIntentStatus: paymentIntent?.status,
        invoiceStatus: invoice?.status
      });

      // Annuler la subscription si on ne peut pas obtenir le client_secret
      try {
        await stripe.subscriptions.cancel(subscription.id);
      } catch (cancelError) {
        logger.error('[create-subscription] Error canceling subscription after unexpected client_secret issue', { error: cancelError, subscriptionId: subscription.id });
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
      logger.error('[create-subscription] Error updating club after subscription creation', { error: updateError, clubId: clubId.substring(0, 8) + "…" });
      // Annuler la subscription Stripe en cas d'erreur
      try {
        await stripe.subscriptions.cancel(subscription.id);
      } catch (cancelError) {
        logger.error('[create-subscription] Error canceling subscription after club update failure', { error: cancelError, subscriptionId: subscription.id });
      }
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du club' },
        { status: 500 }
      );
    }

    logger.info('[create-subscription] Subscription created successfully', {
      clubId: clubId.substring(0, 8) + "…",
      subscriptionId: subscription.id.substring(0, 8) + "…",
      plan,
      trialEndTimestamp,
    });

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      clientSecret,
      trialEndDate: trialEndDate.toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error('[create-subscription] Unexpected error', {
      error: errorMessage,
      stack: errorStack,
    });

    // If it's a Stripe error, return the specific message
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
