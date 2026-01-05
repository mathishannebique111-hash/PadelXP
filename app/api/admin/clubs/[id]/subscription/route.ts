import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { isAdmin } from '@/lib/admin-auth';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { getClubSubscription } from '@/lib/utils/subscription-utils';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

// Price IDs Stripe - À configurer dans les variables d'environnement
// Pour trouver vos Price IDs de test dans Stripe :
// 1. Allez sur https://dashboard.stripe.com/test/products
// 2. Cliquez sur un produit (ou créez-en un)
// 3. Dans la section "Pricing", vous verrez les Price IDs (commencent par price_)
// 4. Copiez les Price IDs de test (pas ceux en mode live)
const STRIPE_PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_MONTHLY || process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY || '',
  quarterly: process.env.STRIPE_PRICE_QUARTERLY || process.env.NEXT_PUBLIC_STRIPE_PRICE_QUARTERLY || '',
  annual: process.env.STRIPE_PRICE_ANNUAL || process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL || '',
};

// Vérifier que les Price IDs sont configurés
if (!STRIPE_PRICE_IDS.monthly || !STRIPE_PRICE_IDS.quarterly || !STRIPE_PRICE_IDS.annual) {
  console.warn('⚠️ STRIPE_PRICE_IDS non configurés. Ajoutez-les dans .env.local :');
  console.warn('STRIPE_PRICE_MONTHLY=price_xxxxx');
  console.warn('STRIPE_PRICE_QUARTERLY=price_xxxxx');
  console.warn('STRIPE_PRICE_ANNUAL=price_xxxxx');
}

export const dynamic = 'force-dynamic';

/**
 * Crée ou récupère un customer Stripe pour un club
 * Pas besoin de méthode de paiement - l'abonnement sera marqué comme payé par l'admin
 */
async function getOrCreateStripeCustomer(club: any): Promise<string> {
  let customerId = club.stripe_customer_id;
  
  if (customerId) {
    // Vérifier que le customer existe toujours sur Stripe
    try {
      await stripe.customers.retrieve(customerId);
      return customerId;
    } catch (error) {
      console.warn('Stripe customer not found, creating new one:', error);
      customerId = null;
    }
  }

  // Créer un nouveau customer Stripe (sans méthode de paiement)
  const customer = await stripe.customers.create({
    email: club.email,
    name: club.name,
    metadata: {
      club_id: club.id,
    },
  });

  customerId = customer.id;

  // Mettre à jour le club avec le customer ID
  await supabaseAdmin
    .from('clubs')
    .update({ stripe_customer_id: customerId })
    .eq('id', club.id);

  return customerId;
}

/**
 * Crée ou met à jour un abonnement Stripe
 */
async function createOrUpdateStripeSubscription(
  customerId: string,
  planCycle: 'monthly' | 'quarterly' | 'annual',
  existingSubscriptionId?: string | null
): Promise<Stripe.Subscription> {
  const priceId = STRIPE_PRICE_IDS[planCycle];
  
  if (!priceId) {
    throw new Error(
      `Price ID not configured for ${planCycle} plan. ` +
      `Please add STRIPE_PRICE_${planCycle.toUpperCase()} to your .env.local file. ` +
      `Find your test Price IDs in Stripe Dashboard: https://dashboard.stripe.com/test/products`
    );
  }

  // Si un abonnement existe déjà, le mettre à jour
  if (existingSubscriptionId) {
    try {
      // Récupérer l'abonnement existant
      const existingSub = await stripe.subscriptions.retrieve(existingSubscriptionId);
      
      // Mettre à jour l'item d'abonnement pour prolonger la période
      const subscriptionItemId = existingSub.items.data[0]?.id;
      
      if (subscriptionItemId) {
        // Calculer la nouvelle date de fin en prolongeant depuis current_period_end
        const currentPeriodEnd = existingSub.current_period_end;
        const now = Math.floor(Date.now() / 1000);
        
        // Si l'abonnement est encore actif, prolonger depuis current_period_end
        // Sinon, commencer maintenant
        const billingCycleAnchor = existingSub.status === 'active' 
          ? currentPeriodEnd 
          : now;

        // Mettre à jour le price et prolonger la période
        // Si l'abonnement est en 'incomplete' ou 'past_due', on le réactive d'abord
        const updateParams: any = {
          items: [{
            id: subscriptionItemId,
            price: priceId,
          }],
          billing_cycle_anchor: billingCycleAnchor,
          proration_behavior: 'none', // Pas de prorata, juste prolonger
        };

        // Pas besoin de modifier collection_method lors de la mise à jour

        const updatedSubscription = await stripe.subscriptions.update(existingSubscriptionId, updateParams);

        return updatedSubscription;
      }
    } catch (error) {
      console.error('Error updating existing Stripe subscription:', error);
      // Si l'update échoue, créer un nouvel abonnement
    }
  }

  // Créer un nouvel abonnement
  // Solution finale : utiliser trial_period_days: 0 qui permet de créer l'abonnement sans méthode de paiement
  // Puis marquer l'invoice comme payée avec paid_out_of_band: true si nécessaire
  // Cela fonctionne en mode test ET en mode live
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      metadata: {
        plan_cycle: planCycle,
        admin_created: 'true', // Marquer comme créé par admin (offert)
      },
      // Utiliser trial_period_days: 0 pour créer l'abonnement sans méthode de paiement
      // L'abonnement sera immédiatement actif
      trial_period_days: 0,
    });

    console.log('Subscription created (admin gift):', {
      id: subscription.id,
      status: subscription.status,
      customer: subscription.customer,
    });

    return subscription;
  } catch (error: any) {
    // Si trial_period_days ne fonctionne pas, essayer avec payment_behavior: 'default_incomplete'
    if (error?.code === 'resource_missing' || error?.message?.includes('payment method')) {
      console.log('Trial method failed, trying with payment_behavior: default_incomplete');
      
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        metadata: {
          plan_cycle: planCycle,
          admin_created: 'true',
        },
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      // Marquer l'invoice comme payée "hors bande" (offert par l'admin)
      if (subscription.latest_invoice) {
        const invoiceId = typeof subscription.latest_invoice === 'string' 
          ? subscription.latest_invoice 
          : subscription.latest_invoice.id;
        
        try {
          await stripe.invoices.pay(invoiceId, {
            paid_out_of_band: true,
          });
          
          console.log('Invoice marked as paid (admin gift)');
          const updatedSub = await stripe.subscriptions.retrieve(subscription.id);
          return updatedSub;
        } catch (invoiceError: any) {
          console.error('Error marking invoice as paid:', invoiceError);
          return subscription;
        }
      }

      return subscription;
    }
    
    throw error;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Vérifier que les Price IDs sont configurés
    if (!STRIPE_PRICE_IDS.monthly || !STRIPE_PRICE_IDS.quarterly || !STRIPE_PRICE_IDS.annual) {
      console.error('❌ STRIPE_PRICE_IDS non configurés:', {
        monthly: STRIPE_PRICE_IDS.monthly || 'MANQUANT',
        quarterly: STRIPE_PRICE_IDS.quarterly || 'MANQUANT',
        annual: STRIPE_PRICE_IDS.annual || 'MANQUANT',
      });
      return NextResponse.json({ 
        error: 'Configuration Stripe incomplète',
        details: 'Les Price IDs Stripe ne sont pas configurés. Vérifiez votre fichier .env.local et redémarrez le serveur.',
        missing: {
          monthly: !STRIPE_PRICE_IDS.monthly,
          quarterly: !STRIPE_PRICE_IDS.quarterly,
          annual: !STRIPE_PRICE_IDS.annual,
        }
      }, { status: 500 });
    }

    // Verify admin status
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const clubId = params.id;
    const { action } = await request.json();

    // Fetch current club data
    const { data: club, error: clubError } = await supabaseAdmin
      .from('clubs')
      .select('*')
      .eq('id', clubId)
      .single();

    if (clubError || !club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    // Récupérer l'abonnement existant depuis la table subscriptions
    const existingSubscription = await getClubSubscription(clubId);

    const now = new Date();
    let previousValue: any = {};
    let newValue: any = {};
    let actionDescription = '';
    let stripeSubscription: Stripe.Subscription | null = null;

    console.log('Subscription API - Action:', action, 'Club ID:', clubId);
    console.log('Stripe Price IDs configured:', {
      monthly: !!STRIPE_PRICE_IDS.monthly,
      quarterly: !!STRIPE_PRICE_IDS.quarterly,
      annual: !!STRIPE_PRICE_IDS.annual,
    });

    // Handle different actions
    switch (action) {
      case 'extend_trial_14d': {
        // Prolonger l'essai de 14 jours
        const currentTrialEnd = existingSubscription?.trial_end_at 
          ? new Date(existingSubscription.trial_end_at)
          : (club.trial_end_date ? new Date(club.trial_end_date) : now);
        
        const newTrialEnd = new Date(currentTrialEnd);
        newTrialEnd.setDate(newTrialEnd.getDate() + 14);

        previousValue = {
          trial_end_at: existingSubscription?.trial_end_at || club.trial_end_date,
        };

        // Mettre à jour la table subscriptions
        if (existingSubscription) {
          await supabaseAdmin
            .from('subscriptions')
            .update({ trial_end_at: newTrialEnd.toISOString() })
            .eq('id', existingSubscription.id);
        } else {
          // Créer un abonnement en essai si il n'existe pas
          await supabaseAdmin.from('subscriptions').insert({
            club_id: clubId,
            status: 'trialing',
            trial_start_at: now.toISOString(),
            trial_end_at: newTrialEnd.toISOString(),
          });
        }

        // Mettre à jour aussi clubs.trial_end_date pour compatibilité
        await supabaseAdmin
          .from('clubs')
          .update({ trial_end_date: newTrialEnd.toISOString() })
          .eq('id', clubId);

        newValue = { trial_end_at: newTrialEnd.toISOString() };
        actionDescription = 'Prolongation de l\'essai gratuit de 14 jours';
        break;
      }

      case 'add_1_month':
      case 'add_3_months':
      case 'add_1_year': {
        try {
          const planCycle = action === 'add_1_month' ? 'monthly' 
            : action === 'add_3_months' ? 'quarterly' 
            : 'annual';
          
          const periodMonths = action === 'add_1_month' ? 1 
            : action === 'add_3_months' ? 3 
            : 12;

          console.log('Processing subscription:', { planCycle, periodMonths, existingSubscription: !!existingSubscription });

          // Calculer la nouvelle date de fin
          let newPeriodEnd: Date;
          
          if (existingSubscription?.current_period_end) {
            // Prolonger depuis la fin de la période actuelle
            newPeriodEnd = new Date(existingSubscription.current_period_end);
            newPeriodEnd.setMonth(newPeriodEnd.getMonth() + periodMonths);
            console.log('Extending from existing period end:', existingSubscription.current_period_end, 'to:', newPeriodEnd.toISOString());
          } else {
            // Commencer maintenant
            newPeriodEnd = new Date(now);
            newPeriodEnd.setMonth(newPeriodEnd.getMonth() + periodMonths);
            console.log('Starting new subscription from now to:', newPeriodEnd.toISOString());
          }

          previousValue = {
            status: existingSubscription?.status || null,
            plan_cycle: existingSubscription?.plan_cycle || null,
            current_period_end: existingSubscription?.current_period_end || null,
          };

          // Créer ou récupérer le customer Stripe
          console.log('Getting or creating Stripe customer...');
          const customerId = await getOrCreateStripeCustomer(club);
          console.log('Stripe customer ID:', customerId);

          // Créer ou mettre à jour l'abonnement Stripe
          console.log('Creating/updating Stripe subscription...', {
            customerId,
            planCycle,
            existingSubscriptionId: existingSubscription?.stripe_subscription_id || club.stripe_subscription_id,
          });
          
          stripeSubscription = await createOrUpdateStripeSubscription(
            customerId,
            planCycle,
            existingSubscription?.stripe_subscription_id || club.stripe_subscription_id
          );
          
          console.log('Stripe subscription created/updated:', stripeSubscription.id);

        // Mettre à jour ou créer l'abonnement dans la table subscriptions
        const subscriptionData: any = {
          status: 'active',
          plan_cycle: planCycle,
          current_period_start: existingSubscription?.current_period_start || now.toISOString(),
          current_period_end: newPeriodEnd.toISOString(),
          next_renewal_at: newPeriodEnd.toISOString(),
          stripe_customer_id: customerId,
          stripe_subscription_id: stripeSubscription.id,
        };

        console.log('Updating subscriptions table with:', subscriptionData);

        if (existingSubscription) {
          const { error: updateSubError } = await supabaseAdmin
            .from('subscriptions')
            .update(subscriptionData)
            .eq('id', existingSubscription.id);
          
          if (updateSubError) {
            console.error('Error updating subscription:', updateSubError);
            throw new Error(`Failed to update subscription: ${updateSubError.message}`);
          }
          console.log('Subscription updated successfully');
        } else {
          const { error: insertSubError } = await supabaseAdmin.from('subscriptions').insert({
            club_id: clubId,
            ...subscriptionData,
          });
          
          if (insertSubError) {
            console.error('Error inserting subscription:', insertSubError);
            throw new Error(`Failed to create subscription: ${insertSubError.message}`);
          }
          console.log('Subscription created successfully');
        }

        // Mettre à jour clubs pour compatibilité
        console.log('Updating clubs table...');
        const { error: updateClubError } = await supabaseAdmin
          .from('clubs')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: stripeSubscription.id,
            subscription_status: 'active',
            selected_plan: planCycle,
            subscription_started_at: now.toISOString(),
          })
          .eq('id', clubId);
        
        if (updateClubError) {
          console.error('Error updating club:', updateClubError);
          throw new Error(`Failed to update club: ${updateClubError.message}`);
        }
        console.log('Club updated successfully');

        newValue = {
          status: 'active',
          plan_cycle: planCycle,
          current_period_end: newPeriodEnd.toISOString(),
          stripe_subscription_id: stripeSubscription.id,
        };

          actionDescription = action === 'add_1_month' 
            ? 'Ajout de 1 mois d\'abonnement'
            : action === 'add_3_months'
            ? 'Ajout de 3 mois d\'abonnement'
            : 'Ajout de 1 an d\'abonnement';
        } catch (subscriptionError) {
          console.error('Error in subscription action:', subscriptionError);
          throw subscriptionError;
        }
        break;
      }

      case 'cancel': {
        previousValue = {
          status: existingSubscription?.status || null,
          cancel_at_period_end: existingSubscription?.cancel_at_period_end || false,
        };

        // Annuler l'abonnement Stripe si il existe
        if (existingSubscription?.stripe_subscription_id || club.stripe_subscription_id) {
          const subscriptionId = existingSubscription?.stripe_subscription_id || club.stripe_subscription_id;
          try {
            await stripe.subscriptions.cancel(subscriptionId);
          } catch (stripeError) {
            console.error('Error cancelling Stripe subscription:', stripeError);
          }
        }

        // Mettre à jour la table subscriptions
        if (existingSubscription) {
          await supabaseAdmin
            .from('subscriptions')
            .update({
              status: 'canceled',
              cancel_at_period_end: false,
            })
            .eq('id', existingSubscription.id);
        }

        // Mettre à jour clubs
        await supabaseAdmin
          .from('clubs')
          .update({ subscription_status: 'canceled' })
          .eq('id', clubId);

        newValue = {
          status: 'canceled',
          cancel_at_period_end: false,
        };

        actionDescription = 'Résiliation de l\'abonnement';
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Log action in admin_club_actions table
    await supabaseAdmin.from('admin_club_actions').insert({
      club_id: clubId,
      admin_user_id: user.id,
      action_type: action,
      action_description: actionDescription,
      previous_value: previousValue,
      new_value: newValue,
    });

    return NextResponse.json({ 
      success: true, 
      subscription: newValue,
      stripe_subscription_id: stripeSubscription?.id,
    });
  } catch (error) {
    console.error('Unexpected error in subscription API:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : undefined,
    });
    
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? errorMessage : 'Une erreur est survenue lors de la mise à jour de l\'abonnement',
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
    }, { status: 500 });
  }
}
