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
export function getMonthlyPrice(plan: PlanType, offerType: 'standard' | 'founder' = 'standard'): number {
  switch (plan) {
    case 'monthly':
      return offerType === 'founder' ? 39 : 49;
    case 'annual':
      // Prix annuel : Founder 390€ (2 mois offerts) / Standard 490€ ?
      // Pour l'instant on déduit un prix annuel basé sur l'ancien ratio ou on met un placeholder
      // Ancien : 99 -> 82 (~17%).
      // 49 -> ~40? 39 -> ~32?
      // On va dire 17% de réduction environ.
      return offerType === 'founder' ? 32 : 40;
  }
}

/**
 * Calcule le prix total d'un plan
 */
export function getTotalPrice(plan: PlanType, offerType: 'standard' | 'founder' = 'standard'): number {
  switch (plan) {
    case 'monthly':
      return getMonthlyPrice('monthly', offerType);
    case 'annual':
      return getMonthlyPrice('annual', offerType) * 12;
  }
}

/**
 * Calcule l'économie par rapport au plan mensuel
 */
export function calculateSavings(plan: PlanType, offerType: 'standard' | 'founder' = 'standard'): { percentage: number; amount: number } {
  const monthlyPrice = getMonthlyPrice('monthly', offerType);
  const planMonthlyPrice = getMonthlyPrice(plan, offerType);

  if (plan === 'monthly') return { percentage: 0, amount: 0 };

  const percentage = Math.round(((monthlyPrice - planMonthlyPrice) / monthlyPrice) * 100);
  const amount = (monthlyPrice - planMonthlyPrice) * 12; // Économie annuelle totale

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
export function getStripePriceId(plan: PlanType, offerType: 'standard' | 'founder' = 'standard'): string {
  switch (plan) {
    case 'monthly':
      return offerType === 'founder'
        ? process.env.NEXT_PUBLIC_STRIPE_PRICE_FOUNDER_39 || process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY || ''
        : process.env.NEXT_PUBLIC_STRIPE_PRICE_STANDARD_49 || process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY || '';
    case 'annual':
      // Pour l'instant on garde le prix annuel standard pour tout le monde
      // ou on peut ajouter une logique similaire si un prix annuel fondateur existe
      return process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL || '';
  }
}
