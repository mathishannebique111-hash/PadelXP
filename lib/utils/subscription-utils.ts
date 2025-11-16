import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types_db";

/**
 * Types d'états d'abonnement
 */
export type SubscriptionStatus =
  | "trialing"
  | "scheduled_activation"
  | "active"
  | "paused"
  | "canceled"
  | "past_due";

export type PlanCycle = "monthly" | "quarterly" | "annual";

/**
 * Structure d'un abonnement
 */
export interface Subscription {
  id: string;
  club_id: string;
  status: SubscriptionStatus;
  trial_start_at: string | null;
  trial_end_at: string | null;
  plan_cycle: PlanCycle | null;
  current_period_start: string | null;
  current_period_end: string | null;
  next_renewal_at: string | null;
  has_payment_method: boolean;
  payment_method_id: string | null;
  payment_method_last4: string | null;
  payment_method_type: string | null;
  payment_method_brand: string | null;
  payment_method_expiry: string | null;
  auto_activate_at_trial_end: boolean;
  cancel_at_period_end: boolean;
  grace_until: string | null;
  billing_email: string | null;
  billing_address: any;
  legal_name: string | null;
  vat_number: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

/**
 * Calcule le nombre de jours restants avant la fin de l'essai
 */
export function calculateTrialDaysRemaining(trialEndAt: string | null): number | null {
  if (!trialEndAt) return null;

  const endDate = new Date(trialEndAt);
  const now = new Date();

  const endMidnight = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = endMidnight.getTime() - nowMidnight.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, daysRemaining);
}

/**
 * Vérifie si l'essai est actif
 */
export function isTrialActive(subscription: Subscription | null): boolean {
  if (!subscription || subscription.status !== "trialing") return false;
  if (!subscription.trial_end_at) return false;

  const daysRemaining = calculateTrialDaysRemaining(subscription.trial_end_at);
  return daysRemaining !== null && daysRemaining > 0;
}

/**
 * Vérifie si l'essai est expiré
 */
export function isTrialExpired(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  if (!subscription.trial_end_at) return false;

  const trialEnd = new Date(subscription.trial_end_at);
  const now = new Date();

  return now >= trialEnd && subscription.status === "trialing";
}

/**
 * Vérifie si un rappel doit être envoyé
 */
export function shouldSendTrialReminder(subscription: Subscription | null, daysBefore: number): boolean {
  if (!subscription || !subscription.trial_end_at) return false;
  if (subscription.status !== "trialing") return false;

  const daysRemaining = calculateTrialDaysRemaining(subscription.trial_end_at);
  return daysRemaining === daysBefore;
}

/**
 * Calcule la date de renouvellement suivante selon le cycle
 */
export function calculateNextRenewalAt(startDate: Date, cycle: PlanCycle): Date {
  const next = new Date(startDate);

  switch (cycle) {
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    case "annual":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next;
}

/**
 * Calcule la durée du cycle en jours
 */
export function getCycleDays(cycle: PlanCycle): number {
  switch (cycle) {
    case "monthly":
      return 30;
    case "quarterly":
      return 90;
    case "annual":
      return 365;
  }
}

/**
 * Récupère l'abonnement d'un club
 */
export async function getClubSubscription(clubId: string): Promise<Subscription | null> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("club_id", clubId)
      .maybeSingle();

    if (error) {
      // Log l'erreur complète, y compris les propriétés non-énumérables
      const errorDetails: any = {
        message: error?.message || 'No message',
        details: error?.details || 'No details',
        hint: error?.hint || 'No hint',
        code: error?.code || 'No code',
        clubId,
      };
      
      // Essayer de stringify l'erreur complète pour voir toutes les propriétés
      try {
        errorDetails.fullError = JSON.stringify(error, Object.getOwnPropertyNames(error));
      } catch (e) {
        errorDetails.fullError = String(error);
      }
      
      console.error("[getClubSubscription] Error details:", errorDetails);
      
      // Si c'est juste qu'aucun abonnement n'existe, ce n'est pas une vraie erreur
      if (error?.code === 'PGRST116' || error?.message?.includes('No rows found') || error?.code === '42P01') {
        // PGRST116 = No rows returned, 42P01 = relation does not exist (table doesn't exist)
        if (error?.code === '42P01') {
          console.error("[getClubSubscription] Table 'subscriptions' does not exist. Please run the migration SQL.");
        }
        return null;
      }
      
      // Si la table n'existe pas (code 42P01)
      if (error?.code === '42P01') {
        console.error("[getClubSubscription] Table 'subscriptions' does not exist. Please run the migration SQL in Supabase.");
      }
      
      return null;
    }

    return data as Subscription | null;
  } catch (err) {
    // Gérer les erreurs inattendues
    console.error("[getClubSubscription] Unexpected error:", {
      error: err instanceof Error ? err.message : String(err),
      clubId,
      stack: err instanceof Error ? err.stack : undefined,
    });
    return null;
  }
}

/**
 * Initialise un abonnement pour un club (essai gratuit)
 */
export async function initializeSubscription(clubId: string): Promise<Subscription | null> {
  try {
    const supabase = createServiceClient();

    // Vérifier si un abonnement existe déjà
    const existing = await getClubSubscription(clubId);
    if (existing) {
      return existing;
    }

    // Appeler la fonction SQL pour initialiser
    const { data, error } = await supabase.rpc("initialize_club_subscription", {
      p_club_id: clubId,
    });

    if (error) {
      // Logger l'erreur complète, y compris les propriétés non-énumérables
      console.error("[initializeSubscription] Error details:", {
        message: error?.message || 'No message',
        details: error?.details || 'No details',
        hint: error?.hint || 'No hint',
        code: error?.code || 'No code',
        error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        clubId,
      });
      
      // Si la fonction RPC n'existe pas, c'est probablement que la migration n'a pas été exécutée
      if (error?.code === '42883' || error?.message?.includes('function') || error?.message?.includes('does not exist')) {
        console.error("[initializeSubscription] Function 'initialize_club_subscription' may not exist. Please run the migration SQL.");
      }
      
      return null;
    }

    // Récupérer l'abonnement créé
    return await getClubSubscription(clubId);
  } catch (err) {
    // Gérer les erreurs inattendues
    console.error("[initializeSubscription] Unexpected error:", {
      error: err instanceof Error ? err.message : String(err),
      clubId,
      stack: err instanceof Error ? err.stack : undefined,
      fullError: JSON.stringify(err, Object.getOwnPropertyNames(err)),
    });
    return null;
  }
}

/**
 * Met à jour les informations de paiement
 */
export async function updatePaymentMethod(
  subscriptionId: string,
  paymentMethodData: {
    payment_method_id: string;
    last4: string;
    type: string;
    brand?: string;
    expiry?: string;
  }
): Promise<boolean> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("subscriptions")
    .update({
      has_payment_method: true,
      payment_method_id: paymentMethodData.payment_method_id,
      payment_method_last4: paymentMethodData.last4,
      payment_method_type: paymentMethodData.type,
      payment_method_brand: paymentMethodData.brand || null,
      payment_method_expiry: paymentMethodData.expiry || null,
    })
    .eq("id", subscriptionId);

  if (error) {
    console.error("[updatePaymentMethod] Error:", error);
    return false;
  }

  return true;
}

/**
 * Active le consentement d'activation automatique
 */
export async function setAutoActivateConsent(subscriptionId: string, consent: boolean): Promise<boolean> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("subscriptions")
    .update({
      auto_activate_at_trial_end: consent,
    })
    .eq("id", subscriptionId);

  if (error) {
    console.error("[setAutoActivateConsent] Error:", error);
    return false;
  }

  return true;
}

/**
 * Programme l'activation de l'abonnement
 */
export async function scheduleActivation(
  subscriptionId: string,
  planCycle: PlanCycle,
  userId?: string
): Promise<boolean> {
  const supabase = createServiceClient();

  // Récupérer l'abonnement
  const subscription = await getClubSubscriptionById(subscriptionId);
  if (!subscription || !subscription.trial_end_at) {
    return false;
  }

  // Calculer les dates
  const trialEndDate = new Date(subscription.trial_end_at);
  const nextRenewalAt = calculateNextRenewalAt(trialEndDate, planCycle);

  // Mettre à jour l'abonnement
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "scheduled_activation",
      plan_cycle: planCycle,
      current_period_start: trialEndDate.toISOString(),
      current_period_end: nextRenewalAt.toISOString(),
      next_renewal_at: nextRenewalAt.toISOString(),
    })
    .eq("id", subscriptionId);

  if (error) {
    console.error("[scheduleActivation] Error:", error);
    return false;
  }

  // Logger la transition
  await transitionSubscriptionStatus(
    subscriptionId,
    "scheduled_activation",
    "user",
    userId || null,
    { plan_cycle: planCycle }
  );

  return true;
}

/**
 * Active immédiatement l'abonnement
 */
export async function activateSubscription(
  subscriptionId: string,
  planCycle: PlanCycle,
  userId?: string
): Promise<boolean> {
  const supabase = createServiceClient();

  // Récupérer l'abonnement
  const subscription = await getClubSubscriptionById(subscriptionId);
  if (!subscription) {
    return false;
  }

  // Calculer les dates
  const now = new Date();
  const nextRenewalAt = calculateNextRenewalAt(now, planCycle);

  // Mettre à jour l'abonnement
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      plan_cycle: planCycle,
      current_period_start: now.toISOString(),
      current_period_end: nextRenewalAt.toISOString(),
      next_renewal_at: nextRenewalAt.toISOString(),
      trial_end_at: subscription.trial_end_at || now.toISOString(),
    })
    .eq("id", subscriptionId);

  if (error) {
    console.error("[activateSubscription] Error:", error);
    return false;
  }

  // Logger la transition
  await transitionSubscriptionStatus(subscriptionId, "active", "user", userId || null, {
    plan_cycle: planCycle,
    activated_at: now.toISOString(),
  });

  return true;
}

/**
 * Met en pause l'abonnement
 */
export async function pauseSubscription(subscriptionId: string, userId?: string): Promise<boolean> {
  return await transitionSubscriptionStatus(subscriptionId, "paused", "user", userId || null);
}

/**
 * Annule l'abonnement
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = false,
  userId?: string
): Promise<boolean> {
  const supabase = createServiceClient();

  if (cancelAtPeriodEnd) {
    // Annulation à la fin de la période en cours
    const { error } = await supabase
      .from("subscriptions")
      .update({
        cancel_at_period_end: true,
      })
      .eq("id", subscriptionId);

    if (error) {
      console.error("[cancelSubscription] Error:", error);
      return false;
    }

    await logSubscriptionEvent(subscriptionId, "subscription_cancel_scheduled", {
      cancel_at_period_end: true,
    });
  } else {
    // Annulation immédiate
    await transitionSubscriptionStatus(subscriptionId, "canceled", "user", userId || null);
  }

  return true;
}

/**
 * Reprend l'abonnement (depuis paused)
 */
export async function resumeSubscription(subscriptionId: string, userId?: string): Promise<boolean> {
  return await transitionSubscriptionStatus(subscriptionId, "active", "user", userId || null);
}

/**
 * Transitionne le statut d'un abonnement
 */
export async function transitionSubscriptionStatus(
  subscriptionId: string,
  newStatus: SubscriptionStatus,
  triggeredBy: "system" | "user" | "webhook" = "user",
  userId: string | null = null,
  metadata: any = {}
): Promise<boolean> {
  const supabase = createServiceClient();

  const { error } = await supabase.rpc("transition_subscription_status", {
    p_subscription_id: subscriptionId,
    p_new_status: newStatus,
    p_triggered_by: triggeredBy,
    p_triggered_by_user_id: userId,
    p_metadata: metadata,
  });

  if (error) {
    console.error("[transitionSubscriptionStatus] Error:", error);
    return false;
  }

  return true;
}

/**
 * Récupère un abonnement par son ID
 */
export async function getClubSubscriptionById(subscriptionId: string): Promise<Subscription | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("id", subscriptionId)
    .maybeSingle();

  if (error) {
    console.error("[getClubSubscriptionById] Error:", error);
    return null;
  }

  return data as Subscription | null;
}

/**
 * Log un événement d'abonnement
 */
export async function logSubscriptionEvent(
  subscriptionId: string,
  eventType: string,
  metadata: any = {},
  triggeredBy: "system" | "user" | "webhook" = "system",
  userId: string | null = null
): Promise<boolean> {
  const supabase = createServiceClient();

  const { error } = await supabase.from("subscription_events").insert({
    subscription_id: subscriptionId,
    event_type: eventType,
    triggered_by: triggeredBy,
    triggered_by_user_id: userId,
    metadata,
  });

  if (error) {
    console.error("[logSubscriptionEvent] Error:", error);
    return false;
  }

  return true;
}

/**
 * Vérifie les règles d'accès selon l'état de l'abonnement
 */
export function canAccessFeature(subscription: Subscription | null, feature: "matches" | "dashboard" | "public_page"): boolean {
  if (!subscription) return false;

  switch (subscription.status) {
    case "trialing":
    case "scheduled_activation":
    case "active":
      return true; // Accès complet

    case "paused":
      // En pause: dashboard en lecture seule, pas de soumission de matchs, page publique accessible
      if (feature === "public_page") return true;
      if (feature === "dashboard") return true; // Lecture seule via UI
      if (feature === "matches") return false;
      return false;

    case "canceled":
    case "past_due":
      // Annulé ou en retard: aucun accès opérationnel, données conservées
      if (feature === "public_page") return true; // Page publique accessible
      return false;

    default:
      return false;
  }
}

/**
 * Gère la fin d'essai automatique
 */
export async function handleTrialEnd(subscriptionId: string): Promise<boolean> {
  const supabase = createServiceClient();

  const subscription = await getClubSubscriptionById(subscriptionId);
  if (!subscription) return false;

  // Si l'essai n'est pas encore terminé, ne rien faire
  if (subscription.status !== "trialing" || !subscription.trial_end_at) {
    return false;
  }

  const trialEnd = new Date(subscription.trial_end_at);
  const now = new Date();

  if (now < trialEnd) {
    return false; // L'essai n'est pas encore terminé
  }

  // Vérifier si carte + consentement présents
  if (subscription.has_payment_method && subscription.auto_activate_at_trial_end) {
    // Tenter l'activation automatique
    // TODO: Intégrer avec Stripe pour facturer
    // Pour l'instant, on active directement
    if (subscription.plan_cycle) {
      await activateSubscription(subscriptionId, subscription.plan_cycle);
      await logSubscriptionEvent(subscriptionId, "trial_ended_auto_activated", {
        plan_cycle: subscription.plan_cycle,
      });
      return true;
    }
  }

  // Pas de carte ou pas de consentement: mettre en pause
  // Politique: pause au lieu de canceled pour permettre la reprise facile
  await transitionSubscriptionStatus(subscriptionId, "paused", "system", null, {
    reason: "trial_ended_no_payment_method",
  });

  await logSubscriptionEvent(subscriptionId, "trial_ended_paused", {
    has_payment_method: subscription.has_payment_method,
    auto_activate_at_trial_end: subscription.auto_activate_at_trial_end,
  });

  return true;
}

