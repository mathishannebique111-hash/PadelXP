/**
 * Types pour le système d'abonnement des clubs
 */

export type PlanType = 'monthly' | 'annual';

export type SubscriptionStatus =
  | 'trialing'
  | 'trialing_with_plan'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'trial_expired';

export interface ClubSubscription {
  id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trial_start_date: string | null;
  trial_end_date: string | null;
  selected_plan: PlanType | null;
  plan_selected_at: string | null;
  subscription_status: SubscriptionStatus;
  subscription_started_at: string | null;
}

/**
 * Calcule le nombre de jours restants avant la fin de l'essai
 */
export function calculateTrialDaysRemaining(trialEndDate: string | null): number | null {
  if (!trialEndDate) return null;

  const endDate = new Date(trialEndDate);
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
export function isTrialActive(trialEndDate: string | null): boolean {
  if (!trialEndDate) return false;
  const daysRemaining = calculateTrialDaysRemaining(trialEndDate);
  return daysRemaining !== null && daysRemaining > 0;
}

/**
 * Vérifie si l'essai est expiré
 */
export function isTrialExpired(trialEndDate: string | null): boolean {
  if (!trialEndDate) return false;
  const trialEnd = new Date(trialEndDate);
  const now = new Date();
  return now >= trialEnd;
}

/**
 * Formate le nom du plan en français
 */
export function formatPlanName(plan: PlanType): string {
  switch (plan) {
    case 'monthly':
      return 'Mensuel';
    case 'annual':
      return 'Annuel';
  }
}

/**
 * Calcule le prix mensuel d'un plan
 */
export function getMonthlyPrice(plan: PlanType): number {
  switch (plan) {
    case 'monthly':
      return 99;
    case 'annual':
      return 82; // 99 * 0.83
  }
}

/**
 * Calcule le prix total d'un plan
 */
export function getTotalPrice(plan: PlanType): number {
  switch (plan) {
    case 'monthly':
      return 99;
    case 'annual':
      return 982; // 82 * 12 (arrondi)
  }
}

/**
 * Calcule l'économie par rapport au plan mensuel
 */
export function calculateSavings(plan: PlanType): { percentage: number; amount: number } {
  const monthlyPrice = 99;
  const planMonthlyPrice = getMonthlyPrice(plan);
  const percentage = Math.round(((monthlyPrice - planMonthlyPrice) / monthlyPrice) * 100);
  const amount = monthlyPrice - planMonthlyPrice;

  return { percentage, amount };
}

/**
 * Calcule la date du premier paiement (lendemain de la fin de l'essai)
 */
export function calculateFirstPaymentDate(trialEndDate: string | null): Date | null {
  if (!trialEndDate) return null;

  const trialEnd = new Date(trialEndDate);
  const firstPayment = new Date(trialEnd);
  firstPayment.setDate(firstPayment.getDate() + 1);
  firstPayment.setHours(0, 0, 0, 0);

  return firstPayment;
}

/**
 * Formate une date en français
 */
export function formatDate(date: Date | string | null): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Formate une date avec l'heure
 */
export function formatDateTime(date: Date | string | null): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Calcule la date de fin d'un cycle d'abonnement
 */
export function calculateCycleEndDate(startDate: Date, plan: PlanType): Date {
  const endDate = new Date(startDate);

  switch (plan) {
    case 'monthly':
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case 'annual':
      endDate.setFullYear(endDate.getFullYear() + 1);
      break;
  }

  return endDate;
}

/**
 * Récupère le Price ID Stripe selon le plan
 */
export function getStripePriceId(plan: PlanType): string {
  switch (plan) {
    case 'monthly':
      return process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY || '';
    case 'annual':
      return process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL || '';
  }
}
