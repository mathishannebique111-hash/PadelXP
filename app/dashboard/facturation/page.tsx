import { createClient } from "@/lib/supabase/server";
import { getUserClubInfo } from "@/lib/utils/club-utils";
import { getClubSubscription, Subscription, getCycleDays } from "@/lib/utils/subscription-utils";
import BillingInfoSection from "@/components/billing/BillingInfoSection";
import StripeCheckoutButton from "@/components/billing/StripeCheckoutButton";
import NewSubscriptionCheckoutButton from "@/components/billing/NewSubscriptionCheckoutButton";
import SyncOnReturn from "@/components/billing/SyncOnReturn";
import SubscriptionStatusAutoRefresh from "@/components/billing/SubscriptionStatusAutoRefresh";
import ParallaxHalos from "@/components/ParallaxHalos";
import PageTitle from "../PageTitle";
import Image from "next/image";
import { redirect } from "next/navigation";
import CancelSubscriptionButton from "@/components/billing/CancelSubscriptionButton";
import ReactivateSubscriptionButton from "@/components/billing/ReactivateSubscriptionButton";
import SubscriptionConfirmationBanner from "@/components/billing/SubscriptionConfirmationBanner";
import GracePeriodTimer from "@/components/billing/GracePeriodTimer";
import { logger } from '@/lib/logger';
import { AlertTriangle, Clock, CreditCard, ClipboardList, Info, Check } from 'lucide-react';

type SubscriptionStatus = "none" | "trial_active" | "trial_expired" | "active" | "cancelled" | "payment_pending" | "payment_failed";
type PlanType = "monthly" | "annual" | null;

// Forcer le rechargement dynamique pour éviter le cache
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/clubs/login?next=/dashboard/facturation");
  }

  const { clubId } = await getUserClubInfo();

  if (!clubId) {
    return (
      <div className="relative">
        {/* Background accent layers */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          {/* Subtle white radial glow (stronger) */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(255,255,255,0.14),transparent_65%)]" />
          {/* Parallax halos */}
          <ParallaxHalos />
        </div>
        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Abonnement & essai</h1>
            <p className="text-sm text-white/60 mt-1">Gérez votre abonnement et votre période d'essai</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            Aucun club n'est relié à ce compte.
          </div>
        </div>
      </div>
    );
  }

  // Forcer le rechargement en ajoutant un timestamp pour éviter le cache
  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("trial_start, trial_start_date, trial_end_date, trial_current_end_date, trial_base_end_date, trial_status, name, selected_plan, plan_selected_at, subscription_status, subscription_started_at, stripe_subscription_id, auto_extension_unlocked, total_players_count, total_matches_count, total_challenges_count")
    .eq("id", clubId)
    .maybeSingle()
    .then(result => {
      // Forcer le rechargement en désactivant le cache
      if (result.data) {
        // Log pour déboguer
        if (process.env.NODE_ENV === 'development') {
          logger.info('[BillingPage] Club data fetched:', {
            trial_start_date: result.data.trial_start_date,
            trial_end_date: result.data.trial_end_date,
            trial_current_end_date: result.data.trial_current_end_date,
            auto_extension_unlocked: result.data.auto_extension_unlocked,
            total_days: result.data.trial_current_end_date && result.data.trial_start_date
              ? Math.ceil((new Date(result.data.trial_current_end_date).getTime() - new Date(result.data.trial_start_date).getTime()) / (1000 * 60 * 60 * 24))
              : null
          });
        }
      }
      return result;
    });

  // Log pour déboguer (à retirer en production)
  if (process.env.NODE_ENV === 'development' && club) {
    logger.info('[BillingPage] Club data:', {
      trial_start_date: club.trial_start_date,
      trial_end_date: club.trial_end_date,
      trial_current_end_date: club.trial_current_end_date,
      auto_extension_unlocked: club.auto_extension_unlocked,
      total_days: club.trial_current_end_date && club.trial_start_date
        ? Math.ceil((new Date(club.trial_current_end_date).getTime() - new Date(club.trial_start_date).getTime()) / (1000 * 60 * 60 * 24))
        : null
    });
  }

  // Récupérer l'abonnement du club pour connaître l'état et le plan choisi
  const subscription: Subscription | null = await getClubSubscription(clubId);

  // Utiliser les nouveaux champs si disponibles, sinon fallback sur l'ancien système
  const trialStartDate = club?.trial_start_date || club?.trial_start || null;
  // PRIORITÉ : trial_current_end_date (nouveau système) > trial_end_date (ancien) > calcul depuis trial_start
  const trialEndDateFromDb = club?.trial_current_end_date || club?.trial_end_date || null;

  // Calculer le nombre de jours restants de l'essai
  function calculateDaysRemaining(trialEnd: string | null): number | null {
    if (!trialEnd) return null;

    const endDate = new Date(trialEnd);
    const now = new Date();

    const endMidnight = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const diffTime = endMidnight.getTime() - nowMidnight.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, daysRemaining);
  }

  // Calculer la date de fin de l'essai
  // NOUVEAU SYSTÈME : 14 jours de base (peut être étendu)
  const trialEndDate = trialEndDateFromDb
    ? new Date(trialEndDateFromDb)
    : trialStartDate
      ? (() => {
        const startDate = new Date(trialStartDate);
        startDate.setDate(startDate.getDate() + 14); // 14 jours au lieu de 30
        return startDate;
      })()
      : null;

  const daysRemaining = calculateDaysRemaining(trialEndDate?.toISOString() || null);
  const isTrialActive = daysRemaining !== null && daysRemaining > 0;
  /*
   * PÉRIODE DE GRÂCE (48h après la fin de l'essai)
   * On considère que l'essai est "fini mais en grâce" si daysRemaining == 0 (ou < 0)
   * et que moins de 48h se sont écoulées depuis le trialEndDate.
   */
  const msSinceTrialEnd = trialEndDate ? Date.now() - trialEndDate.getTime() : 0;
  // 48h en ms = 48 * 60 * 60 * 1000 = 172800000
  const isGracePeriod =
    !isTrialActive &&
    trialEndDate &&
    msSinceTrialEnd >= 0 &&
    msSinceTrialEnd < 172800000;

  const isTrialFullyExpired = !isTrialActive && !isGracePeriod;

  const showWarning = isTrialActive && daysRemaining <= 10;

  // Calculer le nombre total de jours d'essai (14 ou 30 selon l'extension)
  // IMPORTANT: Utiliser directement trial_current_end_date de la base de données
  const calculateTotalTrialDays = (): number => {
    if (!trialStartDate) return 14; // Par défaut 14 jours si pas de date de début

    // PRIORITÉ ABSOLUE : trial_current_end_date de la base (prend en compte les extensions)
    // Ne pas utiliser trialEndDate qui peut être calculé avec fallback
    let effectiveEndDate: Date | null = null;

    if (club?.trial_current_end_date) {
      effectiveEndDate = new Date(club.trial_current_end_date);
    } else if (club?.trial_end_date) {
      effectiveEndDate = new Date(club.trial_end_date);
    }

    // Si aucune date de fin n'est trouvée, calculer depuis trial_start_date + 14 jours
    if (!effectiveEndDate) {
      const start = new Date(trialStartDate);
      start.setDate(start.getDate() + 14);
      effectiveEndDate = start;
    }

    // Vérifier que la date est valide
    if (isNaN(effectiveEndDate.getTime())) {
      logger.error('[BillingPage] Invalid effectiveEndDate:', effectiveEndDate);
      return 14; // Par défaut 14 jours si date invalide
    }

    const start = new Date(trialStartDate);
    const end = new Date(effectiveEndDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Log pour déboguer
    if (process.env.NODE_ENV === 'development') {
      logger.info('[BillingPage] calculateTotalTrialDays:', {
        trialStartDate: trialStartDate,
        effectiveEndDate: effectiveEndDate.toISOString(),
        diffDays,
        trial_current_end_date: club?.trial_current_end_date,
        trial_end_date: club?.trial_end_date,
        auto_extension_unlocked: club?.auto_extension_unlocked,
        raw_trial_current_end_date: club?.trial_current_end_date,
        raw_trial_end_date: club?.trial_end_date
      });
    }

    return diffDays;
  };
  const totalTrialDays = calculateTotalTrialDays();

  // Déterminer le statut de l'abonnement
  // Priorité : nouveaux champs de la table clubs, puis ancienne table subscriptions
  const newSubscriptionStatus = club?.subscription_status as string | null;

  // Vérifier si l'abonnement est annulé
  // IMPORTANT: Si le nouveau statut est "active", l'abonnement n'est PAS annulé, même si l'ancien système dit le contraire
  // Cela permet de gérer le cas où l'admin a réactivé un abonnement annulé
  const isCanceledNewSystem = newSubscriptionStatus === "canceled";
  const isCanceledOldSystem = subscription?.status === "canceled" || subscription?.cancel_at_period_end === true;
  // Si le nouveau statut est "active", l'abonnement n'est pas annulé (priorité au nouveau système)
  const isCanceled = newSubscriptionStatus === "active" ? false : (isCanceledNewSystem || isCanceledOldSystem);

  let subscriptionStatus: SubscriptionStatus = "none";

  // Utiliser le nouveau statut si disponible
  if (newSubscriptionStatus) {
    if (newSubscriptionStatus === "trialing" || newSubscriptionStatus === "trialing_with_plan") {
      // Si annulé mais essai actif, on garde trial_active pour l'affichage de l'essai
      subscriptionStatus = isTrialActive ? "trial_active" : "trial_expired";
    } else if (newSubscriptionStatus === "active") {
      subscriptionStatus = "active";
    } else if (newSubscriptionStatus === "canceled") {
      subscriptionStatus = "cancelled";
    } else if (newSubscriptionStatus === "past_due") {
      subscriptionStatus = "payment_failed";
    } else if (newSubscriptionStatus === "trial_expired") {
      subscriptionStatus = isGracePeriod ? "trial_active" : "trial_expired";
    }
  } else if (isTrialActive) {
    // Fallback sur l'ancien système
    subscriptionStatus = "trial_active";
  } else if ((isTrialFullyExpired || isGracePeriod) && !subscription) {
    subscriptionStatus = isGracePeriod ? "trial_active" : "trial_expired";
  } else if (subscription) {
    if (subscription.status === "scheduled_activation") {
      subscriptionStatus = "payment_pending";
    } else if (subscription.status === "active") {
      subscriptionStatus = "active";
    } else if (subscription.status === "canceled") {
      subscriptionStatus = "cancelled";
    } else if (subscription.status === "trialing" && (isTrialFullyExpired || isGracePeriod)) {
      subscriptionStatus = isGracePeriod ? "trial_active" : "trial_expired";
    }
  }

  // Utiliser le nouveau champ selected_plan si disponible, sinon fallback sur subscription.plan_cycle
  const currentPlan: PlanType = (club?.selected_plan as PlanType) ?? (subscription?.plan_cycle as PlanType) ?? null;
  const autoRenewal = subscription?.cancel_at_period_end === false;
  // Vérifier si l'abonnement est annulé sur Stripe
  const isSubscriptionCanceled = subscription?.status === "canceled";

  // Vérifier si le club a choisi un plan (même pendant l'essai)
  // Utiliser le nouveau système si disponible
  const hasChosenPlan = (newSubscriptionStatus === "trialing_with_plan" || newSubscriptionStatus === "active") && !!club?.selected_plan
    ? true
    : !!subscription &&
    subscription.status !== "canceled" &&
    !!subscription.plan_cycle &&
    (subscription.status === "active" ||
      subscription.status === "trialing" ||
      subscription.status === "scheduled_activation" ||
      subscriptionStatus === "payment_pending");

  // Date de fin d'essai (référence pour premier prélèvement si un plan est choisi pendant l’essai)
  const effectiveTrialEnd = trialEndDate;

  // Si le club est encore en essai et a déjà choisi un plan, le premier prélèvement doit être
  // le lendemain de la fin de l'essai. Ensuite seulement, Stripe enchaîne les cycles.
  // Prendre en compte le nouveau système (club?.selected_plan) et l'ancien (subscription.plan_cycle)
  // Même si annulé, on garde hasChosenPlanDuringTrial pour afficher les infos
  const hasChosenPlanDuringTrial =
    isTrialActive &&
    (
      // Nouveau système : club a selected_plan (même si annulé, on garde l'info)
      ((newSubscriptionStatus === "trialing_with_plan" || newSubscriptionStatus === "canceled") && !!club?.selected_plan) ||
      // Ancien système : subscription existe avec plan_cycle (même si annulé)
      (!!subscription &&
        (subscription.status === "trialing" || subscription.status === "scheduled_activation" || subscription.status === "active" || subscription.status === "canceled" || subscription.cancel_at_period_end === true) &&
        !!subscription.plan_cycle)
    );

  const firstBillingDateDuringTrial =
    hasChosenPlanDuringTrial && effectiveTrialEnd
      ? new Date(
        effectiveTrialEnd.getFullYear(),
        effectiveTrialEnd.getMonth(),
        effectiveTrialEnd.getDate() + 1
      )
      : null;

  // Date de fin logique du premier cycle payé lorsque le club est encore en essai :
  // on part du lendemain de la fin de l'essai, puis on applique la durée du cycle choisi.
  // Utiliser currentPlan qui prend en compte le nouveau système (club?.selected_plan) et l'ancien (subscription?.plan_cycle)
  const logicalCycleEndAfterTrial =
    hasChosenPlanDuringTrial && firstBillingDateDuringTrial && currentPlan
      ? (() => {
        const days = getCycleDays(currentPlan);
        const end = new Date(firstBillingDateDuringTrial);
        end.setDate(end.getDate() + days);
        return end;
      })()
      : null;

  // Prochaine date de facturation affichée quand l’abonnement est déjà en cours
  const nextBillingDate =
    !isTrialActive && subscription?.current_period_end
      ? new Date(subscription.current_period_end)
      : subscription?.next_renewal_at
        ? new Date(subscription.next_renewal_at)
        : null;

  const cancelledUntil =
    subscription?.cancel_at_period_end && subscription?.current_period_end
      ? new Date(subscription.current_period_end)
      : null;

  // Date de fin d'abonnement à afficher quand il est annulé :
  // - si annulation à fin de période pendant l'essai : on privilégie logicalCycleEndAfterTrial
  // - sinon, on tombe sur current_period_end (fin du dernier cycle payé)
  // Pour le nouveau système, si pas de subscription dans l'ancienne table, on calcule depuis firstBillingDateDuringTrial
  // Si le club a annulé pendant l'essai, on utilise subscription_started_at qui contient la date de fin calculée
  const effectiveCancellationEndDate =
    logicalCycleEndAfterTrial ||
    (subscription?.current_period_end ? new Date(subscription.current_period_end) : null) ||
    (isCanceled && club?.subscription_started_at ? new Date(club.subscription_started_at) : null) ||
    (isCanceled && hasChosenPlanDuringTrial && firstBillingDateDuringTrial && currentPlan
      ? (() => {
        const days = getCycleDays(currentPlan);
        const end = new Date(firstBillingDateDuringTrial);
        end.setDate(end.getDate() + days);
        return end;
      })()
      : null);
  const paymentMethod = subscription?.has_payment_method && subscription?.payment_method_last4
    ? {
      type: subscription.payment_method_brand || subscription.payment_method_type || "Carte",
      last4: subscription.payment_method_last4,
      brand: subscription.payment_method_brand || "",
      expiry: subscription.payment_method_expiry || "",
    }
    : null;
  const billingEmail = user.email;
  const legalName = club?.name || "";
  const billingAddress = null;
  const vatNumber = null;
  const adminContact = user.email;

  // Calculer les prix automatiquement
  const MONTHLY_PRICE = 39;


  // Informations sur une activation programmée après l'essai
  const hasScheduledActivation =
    subscription?.status === "scheduled_activation" ||
    (subscription?.status === "trialing" &&
      subscription.auto_activate_at_trial_end &&
      !!subscription.plan_cycle);
  const scheduledStartDate =
    (subscription?.current_period_start && new Date(subscription.current_period_start)) ||
    trialEndDate;
  const scheduledPlanLabel: string | null = subscription?.plan_cycle
    ? "abonnement mensuel"
    : null;

  const formatDate = (date: Date | null): string => {
    if (!date) return "—";
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  // Price IDs (Stripe) depuis variables d'environnement publiques
  const PRICE_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY || "";


  return (
    <div className="relative">
      {/* Background accent layers */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {/* Subtle white radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.08),transparent_60%)]" />
        {/* Blue accents */}
        <div className="absolute -top-24 -right-24 h-[420px] w-[420px] rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-28 -left-28 h-[360px] w-[360px] rounded-full bg-indigo-500/20 blur-3xl" />
      </div>
      <div className="relative z-10 space-y-4 sm:space-y-5 md:space-y-6">
        {/* Sync Stripe → App au retour du portail */}
        <SyncOnReturn />
        {/* Auto-refresh du statut de l'abonnement quand l'admin fait des actions */}
        {clubId && <SubscriptionStatusAutoRefresh clubId={clubId} refreshInterval={3000} />}
        <PageTitle title="Abonnement & essai" subtitle="Gérez votre abonnement et votre période d'essai" />

        {/* Bannière de confirmation */}
        <SubscriptionConfirmationBanner />


        {/* Bloc Statut d'Abonnement */}
        <section className="rounded-lg sm:rounded-xl md:rounded-2xl border border-white/80 ring-1 ring-white/10 bg-white/5 p-4 sm:p-5 md:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Statut de l'abonnement</h2>

          <div className="space-y-4">
            {/* Statut + action principale (réactivation) */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="text-xs text-white/60 mb-1">Statut</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Si annulé pendant l'essai : afficher "Abonnement annulé" mais garder les infos d'essai */}
                  {isCanceled && isTrialActive && (
                    <span className="rounded-full border border-orange-400/50 bg-orange-500/20 px-3 py-1 text-sm font-semibold text-orange-300">
                      Abonnement annulé
                    </span>
                  )}
                  {/* Si annulé après l'essai : afficher avec date de fin */}
                  {isCanceled && !isTrialActive && effectiveCancellationEndDate && (
                    <span className="rounded-full border border-orange-400/50 bg-orange-500/20 px-3 py-1 text-sm font-semibold text-orange-300">
                      Abonnement annulé — fin de l'abonnement le {formatDate(effectiveCancellationEndDate)}
                    </span>
                  )}
                  {/* Si annulé après l'essai mais pas de date : afficher juste "annulé" */}
                  {isCanceled && !isTrialActive && !effectiveCancellationEndDate && (
                    <span className="rounded-full border border-orange-400/50 bg-orange-500/20 px-3 py-1 text-sm font-semibold text-orange-300">
                      Abonnement annulé
                    </span>
                  )}
                  {/* Si pas annulé : afficher le statut normal */}
                  {!isCanceled && subscriptionStatus === "trial_active" && (
                    <span className="rounded-full border border-emerald-400/50 bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-300">
                      Essai actif
                    </span>
                  )}
                  {!isCanceled && subscriptionStatus === "trial_expired" && (
                    <span className="rounded-full border border-rose-400/50 bg-rose-500/20 px-3 py-1 text-sm font-semibold text-rose-300">
                      Essai expiré
                    </span>
                  )}
                  {/* Cas spécial : Période de grâce (48h) */}
                  {!isCanceled && isGracePeriod && !hasChosenPlan && !hasChosenPlanDuringTrial && (
                    <span className="rounded-full border border-red-500 bg-red-500/20 px-3 py-1 text-sm font-bold text-red-400 animate-pulse">
                      Action requise
                    </span>
                  )}
                  {!isCanceled && subscriptionStatus === "active" && (
                    <span className="rounded-full border border-emerald-400/50 bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-300">
                      Abonnement actif
                      <span className="ml-2 text-xs">
                        (Mensuel)
                      </span>
                    </span>
                  )}
                  {!isCanceled && subscriptionStatus === "payment_pending" && (
                    <span className="rounded-full border border-yellow-400/50 bg-yellow-500/20 px-3 py-1 text-sm font-semibold text-yellow-300">
                      Paiement en attente
                    </span>
                  )}
                  {!isCanceled && subscriptionStatus === "none" && (
                    <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-sm font-semibold text-white/60">
                      Aucun abonnement
                    </span>
                  )}
                </div>
              </div>

              {/* Boutons d'action dans la section Statut */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Bouton d'annulation : affiché si abonnement actif (pas encore annulé) */}
                {!isCanceled && ((hasChosenPlan || hasChosenPlanDuringTrial) || (subscription && subscription.cancel_at_period_end !== true)) && (
                  <CancelSubscriptionButton
                    cancelAtPeriodEnd={!!subscription?.cancel_at_period_end}
                    currentPeriodEnd={subscription?.current_period_end || null}
                    className="inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white/80 bg-white/10 border border-white/20 hover:bg-white/15 hover:text-white transition-all"
                  >
                    Annuler mon abonnement
                  </CancelSubscriptionButton>
                )}

                {/* Bouton de réactivation : affiché si abonnement annulé (nouveau ou ancien système) */}
                {clubId && isCanceled && (
                  <ReactivateSubscriptionButton
                    className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-extrabold text-white bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 border border-emerald-300/70 shadow-[0_6px_20px_rgba(16,185,129,0.4)] hover:shadow-[0_8px_26px_rgba(16,185,129,0.55)] hover:scale-105 active:scale-100 transition-all duration-300"
                  >
                    Réactiver mon abonnement
                  </ReactivateSubscriptionButton>
                )}
              </div>
            </div>

            {/* Échéance / Expiration */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-white/60 mb-1">
                {/* Si annulé pendant l'essai : afficher "Votre abonnement expire dans" */}
                {/* Si période de grâce : Message urgent */}
                {/* Si essai actif avec plan choisi : Message spécifique transition */}
                {/* Sinon, si essai actif : afficher "Votre essai expire dans" */}
                {/* Si annulé après l'essai : afficher "Votre abonnement expire dans" */}
                {isCanceled && isTrialActive
                  ? "Votre abonnement expire dans"
                  : isGracePeriod && !hasChosenPlan && !hasChosenPlanDuringTrial
                    ? "Choisir un abonnement avant la coupure de vos accès"
                    : isTrialActive && (hasChosenPlan || hasChosenPlanDuringTrial)
                      ? "Temps restant avant le début de votre abonnement"
                      : isTrialActive
                        ? "Votre essai expire dans"
                        : "Votre abonnement expire dans"}
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  {/* Si annulé pendant l'essai : afficher les jours jusqu'à la fin de l'abonnement (essai + cycle) */}
                  {isCanceled && isTrialActive && effectiveCancellationEndDate ? (
                    (() => {
                      const msPerDay = 1000 * 60 * 60 * 24;
                      const toMidnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
                      const today = toMidnight(new Date());
                      const target = toMidnight(effectiveCancellationEndDate);
                      const remaining = Math.max(0, Math.ceil((target.getTime() - today.getTime()) / msPerDay));
                      return (
                        <div className="space-y-2">
                          <div className="text-sm text-white">
                            <span className="rounded-full border border-orange-400/50 bg-orange-500/20 text-orange-300 px-2 py-0.5">
                              {remaining} jour{remaining > 1 ? "s" : ""}
                            </span>
                          </div>
                          <p className="text-xs text-white/60">
                            Votre abonnement a été annulé. Le <span className="font-semibold">premier paiement sera effectué le {formatDate(firstBillingDateDuringTrial || trialEndDate)}</span>
                            (à la fin de votre essai gratuit). Vous conservez l'accès jusqu'au <span className="font-semibold">{formatDate(effectiveCancellationEndDate)}</span>
                            (fin de la première période de l'abonnement choisi).
                            <span className="font-semibold text-orange-200"> Aucun remboursement ne sera effectué</span> pour cette première période.
                          </p>
                        </div>
                      );
                    })()
                  ) : isGracePeriod && !hasChosenPlan && !hasChosenPlanDuringTrial && trialEndDate ? (
                    // Affichage Période de Grâce 48h
                    <div className="space-y-2">
                      <div className="text-xl sm:text-2xl text-white">
                        <GracePeriodTimer trialEndDate={trialEndDate} />
                      </div>
                      <p className="text-xs text-red-300 font-semibold">
                        Attention : Veuillez choisir une offre maintenant pour éviter toute interruption de service.
                      </p>
                    </div>
                  ) : isTrialActive && daysRemaining !== null ? (
                    <div className="space-y-2">
                      <div className="text-sm text-white">
                        <span className="rounded-full border border-emerald-400/50 bg-emerald-500/20 text-emerald-300 px-2 py-0.5">
                          {daysRemaining} jour{daysRemaining > 1 ? "s" : ""}
                        </span>
                      </div>
                      <p className="text-xs text-white/60">
                        {isCanceled
                          ? "Vous êtes en période d'essai. À l'issue de l'essai, l'accès sera interrompu car votre abonnement a été annulé."
                          : (hasChosenPlan || hasChosenPlanDuringTrial)
                            ? "Votre essai est toujours actif. Votre abonnement prendra le relais automatiquement à la fin de cette période."
                            : "Vous êtes en période d'essai. À l'issue de l'essai, l'accès sera interrompu sauf activation d'un abonnement."
                        }
                      </p>
                      {/* Afficher les infos d'abonnement seulement si pas annulé */}
                      {!isCanceled && hasChosenPlanDuringTrial && firstBillingDateDuringTrial && (
                        <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-400/30 space-y-2">
                          <p className="text-xs text-emerald-200 font-semibold">
                            Informations importantes sur votre abonnement :
                          </p>
                          <ul className="text-xs text-emerald-100/90 space-y-1.5 ml-4 list-disc">
                            <li>
                              Votre <span className="font-semibold">essai gratuit se poursuit jusqu'au {formatDate(trialEndDate)}</span>.
                            </li>
                            <li>
                              Votre <span className="font-semibold">abonnement commencera le {formatDate(firstBillingDateDuringTrial)}</span>,
                              c'est-à-dire le lendemain de la fin de votre période d'essai.
                            </li>
                            <li>
                              Le <span className="font-semibold">premier paiement sera effectué le {formatDate(firstBillingDateDuringTrial)}</span>,
                              au début de votre abonnement, et non maintenant.
                            </li>
                            <li>
                              Vous pouvez <span className="font-semibold">annuler votre abonnement à tout moment</span>,
                              mais vous ne serez pas remboursé du premier paiement. Vous conserverez l'accès à votre abonnement
                              jusqu'à la fin de la période choisie ({currentPlan === "monthly" ? "1 mois" : currentPlan === "quarterly" ? "3 mois" : "1 an"}).
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : !isTrialActive ? (
                    // Après l'essai : afficher les jours restants de l'abonnement
                    (() => {
                      const msPerDay = 1000 * 60 * 60 * 24;
                      const toMidnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
                      const today = toMidnight(new Date());
                      const target =
                        isCanceled && effectiveCancellationEndDate
                          ? toMidnight(effectiveCancellationEndDate)
                          : cancelledUntil
                            ? toMidnight(cancelledUntil)
                            : nextBillingDate
                              ? toMidnight(nextBillingDate)
                              : null;
                      const remaining =
                        target ? Math.max(0, Math.ceil((target.getTime() - today.getTime()) / msPerDay)) : null;
                      return (
                        <div className="space-y-2">
                          <div className="text-sm text-white">
                            {remaining !== null ? (
                              <span
                                className={`rounded-full border px-2 py-0.5 ${isCanceled
                                  ? "border-orange-400/50 bg-orange-500/20 text-orange-300"
                                  : "border-blue-400/50 bg-blue-500/20 text-blue-300"
                                  }`}
                              >
                                {remaining} jour{remaining > 1 ? "s" : ""}
                              </span>
                            ) : (
                              <span className="text-white/60">—</span>
                            )}
                          </div>
                          {isCanceled && effectiveCancellationEndDate ? (
                            <p className="text-xs text-white/60">
                              L'abonnement a été annulé et restera actif jusqu'à la fin du cycle choisi, c'est-à-dire jusqu&apos;au{" "}
                              <span className="font-semibold">{formatDate(effectiveCancellationEndDate)}</span>. Aucun nouveau cycle
                              ne sera démarré après cette date.
                            </p>
                          ) : cancelledUntil ? (
                            <p className="text-xs text-white/60">
                              L'abonnement a été annulé et restera actif jusqu'à la fin du cycle choisi, c'est-à-dire après la
                              fin de la période en cours puis l'intégralité du cycle déjà payé. Aucun nouveau cycle ne sera
                              démarré après cette date.
                            </p>
                          ) : nextBillingDate ? (
                            <>
                              <p className="text-xs text-white/80">
                                Prochain prélèvement le {formatDate(nextBillingDate)}.
                              </p>
                              <p className="text-xs text-white/60">
                                Chaque cycle d'abonnement commence à la fin de la période en cours (essai ou cycle actuel) puis
                                dure la totalité du nombre de jours du cycle choisi. L'abonnement se renouvellera automatiquement,
                                en démarrant un nouveau cycle uniquement après la fin du précédent.
                              </p>
                            </>
                          ) : (
                            <p className="text-xs text-white/60">Information d'échéance indisponible pour le moment.</p>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <p className="text-sm text-white/70">—</p>
                  )}
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Cartes Offres */}
        <section className="rounded-lg sm:rounded-xl md:rounded-2xl border border-white/80 ring-1 ring-white/10 bg-white/5 p-4 sm:p-5 md:p-6">
          <div className="mb-4 sm:mb-5 md:mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-white mb-1">Choisissez l'offre qui vous convient</h2>
            <p className="text-xs sm:text-sm text-white/60">Les réductions s'appliquent automatiquement.</p>
          </div>

          <div className="flex justify-center">
            <div className="w-full max-w-md">
              {/* Mensuel */}
              {/*
            Plan actuel n'apparaît que si l'abonnement est réellement actif (ou paiement en attente).
          */}
              <div
                className={`group relative flex flex-col rounded-lg sm:rounded-xl md:rounded-2xl border-2 p-5 sm:p-6 md:p-7 transition-all duration-300 hover:scale-105 ${currentPlan === "monthly" && hasChosenPlan && !isSubscriptionCanceled
                  ? "border-white/70 bg-gradient-to-br from-white/20 via-slate-100/10 to-white/20 shadow-[0_10px_35px_rgba(255,255,255,0.25)]"
                  : "border-blue-400/60 bg-gradient-to-br from-blue-500/15 via-indigo-600/10 to-blue-500/15 shadow-[0_12px_40px_rgba(59,130,246,0.3)]"
                  }`}
              >
                {currentPlan === "monthly" && hasChosenPlan && !isSubscriptionCanceled && (
                  <div className="absolute -top-2 sm:-top-3 right-2 sm:right-4">
                    <span className="rounded-full border-2 border-white/80 bg-gradient-to-r from-white to-slate-200 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold text-slate-800 shadow-lg">
                      <Check className="w-3 h-3 inline mr-1" /> Plan actuel
                    </span>
                  </div>
                )}
                <div className="mb-3 sm:mb-4">
                  <h3 className="text-lg sm:text-xl font-extrabold text-white">Mensuel</h3>
                </div>
                <div className="mb-4 sm:mb-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-white">{MONTHLY_PRICE}€</span>
                    <span className="text-xs sm:text-sm font-normal text-white/70">/mois</span>
                  </div>
                </div>
                <div className="mb-5 sm:mb-6 space-y-2 sm:space-y-2.5">
                  <div className="flex items-center">
                    <div className="text-[10px] sm:text-xs text-white/60">Cycle :</div>
                    <div className="text-[10px] sm:text-xs text-white/80 ml-1">Facturation mensuelle</div>
                  </div>
                </div>
                {isTrialActive && !hasChosenPlan ? (
                  <NewSubscriptionCheckoutButton
                    plan="monthly"
                    disabled={((currentPlan === "monthly" && hasChosenPlan && !isSubscriptionCanceled)) || !PRICE_MONTHLY}
                    className={`w-full rounded-lg sm:rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold transition-all duration-300 mt-auto ${((currentPlan === "monthly" && hasChosenPlan && !isSubscriptionCanceled)) || !PRICE_MONTHLY
                      ? "bg-white/10 border-2 border-white/20 text-white/50 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-2 border-blue-400/50 shadow-[0_6px_20px_rgba(59,130,246,0.4)] hover:shadow-[0_8px_28px_rgba(59,130,246,0.5)] hover:scale-105 active:scale-100"
                      }`}
                  >
                    {currentPlan === "monthly" && hasChosenPlan && !isSubscriptionCanceled ? "Plan actuel" : "Sélectionner ce plan"}
                  </NewSubscriptionCheckoutButton>
                ) : (
                  <StripeCheckoutButton
                    priceId={PRICE_MONTHLY}
                    mode="subscription"
                    disabled={((currentPlan === "monthly" && hasChosenPlan && !isSubscriptionCanceled)) || !PRICE_MONTHLY}
                    className={`w-full rounded-lg sm:rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold transition-all duration-300 mt-auto ${((currentPlan === "monthly" && hasChosenPlan && !isSubscriptionCanceled)) || !PRICE_MONTHLY
                      ? "bg-white/10 border-2 border-white/20 text-white/50 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-2 border-blue-400/50 shadow-[0_6px_20px_rgba(59,130,246,0.4)] hover:shadow-[0_8px_28px_rgba(59,130,246,0.5)] hover:scale-105 active:scale-100"
                      }`}
                  >
                    {currentPlan === "monthly" && hasChosenPlan && !isSubscriptionCanceled ? "Plan actuel" : "Sélectionner ce plan"}
                  </StripeCheckoutButton>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Infos de Facturation */}
        <section className="rounded-lg sm:rounded-xl md:rounded-2xl border border-white/80 ring-1 ring-white/10 bg-white/5 p-4 sm:p-5 md:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Informations de facturation</h2>

          <div className="space-y-4">
            <BillingInfoSection
              legalName={legalName}
              billingAddress={billingAddress}
              vatNumber={vatNumber}
              billingEmail={billingEmail}
              adminContact={adminContact}
              paymentMethod={paymentMethod}
              hasInvoicePreference={true}
            />
          </div>
        </section>

        {/* Prochaine Échéance & Historique */}
        <section className="rounded-lg sm:rounded-xl md:rounded-2xl border border-white/80 ring-1 ring-white/10 bg-white/5 p-4 sm:p-5 md:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Historique des factures</h2>

          <div className="space-y-4">
            {/* Prochaine échéance */}
            {subscriptionStatus === "active" && nextBillingDate && (
              <div className="rounded-xl border border-white/10 bg-blue-500/10 p-4">
                <div className="text-xs text-white/60 mb-1">Prochaine échéance</div>
                <div className="text-sm text-white">
                  {formatDate(nextBillingDate)} — Mensuel
                </div>
                <div className="text-xs text-white/60 mt-1">Taxes applicables selon votre pays</div>
              </div>
            )}

            {/* Historique */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-center py-8">
                <div className="flex justify-center mb-3 opacity-50">
                  <Image src="/images/Facturation et essai club.png" alt="Facturation" width={48} height={48} className="w-12 h-12 object-contain" />
                </div>
                <p className="text-sm text-white/70">Aucune facture disponible pour le moment</p>
                <p className="text-xs text-white/50 mt-1">
                  Vos factures apparaîtront ici après l'activation de votre abonnement
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Annulation & Renouvellement */}
        <section className="rounded-lg sm:rounded-xl md:rounded-2xl border border-white/80 ring-1 ring-white/10 bg-white/5 p-4 sm:p-5 md:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Annulation & Renouvellement</h2>

          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold text-white mb-2">Politique d'annulation</h3>
              <p className="text-xs text-white/70 leading-relaxed mb-1">
                Vous pouvez annuler votre abonnement à tout moment. L'annulation prendra effet à la fin du cycle en cours et
                vous conserverez l'accès jusqu'à cette date.
              </p>
              <p className="text-[11px] text-white/50">
                Le prochain prélèvement automatique est annulé, mais le cycle déjà payé reste entièrement disponible.
              </p>
            </div>

            {subscriptionStatus === "active" && (
              <div className="rounded-xl border border-blue-400/40 bg-blue-500/10 p-4">
                <div className="text-xs text-blue-200 mb-1 flex items-center gap-1"><Info className="w-3 h-3" /> Renouvellement automatique</div>
                <p className="text-xs text-blue-200/80 leading-relaxed">
                  {autoRenewal
                    ? "Votre abonnement sera reconduit automatiquement à chaque échéance tant que vous ne l’annulez pas."
                    : "La reconduction automatique est désactivée. Votre abonnement prendra fin à la prochaine échéance."}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
