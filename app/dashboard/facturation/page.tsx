import { createClient } from "@/lib/supabase/server";
import { getUserClubInfo } from "@/lib/utils/club-utils";
import { redirect } from "next/navigation";

type SubscriptionStatus = "none" | "trial_active" | "trial_expired" | "active" | "cancelled" | "payment_pending" | "payment_failed";
type PlanType = "monthly" | "quarterly" | "annual" | null;

export default async function BillingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/clubs/login?next=/dashboard/facturation");
  }

  const { clubId } = await getUserClubInfo();

  if (!clubId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Facturation & essai</h1>
          <p className="text-sm text-white/60 mt-1">Gérez votre abonnement et votre période d'essai</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
          Aucun club n'est relié à ce compte.
        </div>
      </div>
    );
  }

  const { data: club } = await supabase
    .from("clubs")
    .select("trial_start, name")
    .eq("id", clubId)
    .maybeSingle();

  // Calculer le nombre de jours restants de l'essai
  function calculateDaysRemaining(trialStart: string | null): number | null {
    if (!trialStart) return null;

    const startDate = new Date(trialStart);
    const now = new Date();

    const startMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const diffTime = nowMidnight.getTime() - startMidnight.getTime();
    const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const daysRemaining = 30 - daysPassed;

    return Math.max(0, daysRemaining);
  }

  const daysRemaining = calculateDaysRemaining(club?.trial_start ?? null);
  const isTrialActive = daysRemaining !== null && daysRemaining > 0;
  const isTrialExpired = daysRemaining !== null && daysRemaining === 0;
  const showWarning = isTrialActive && daysRemaining <= 10;

  // Calculer la date de fin de l'essai
  const trialEndDate = club?.trial_start
    ? (() => {
        const startDate = new Date(club.trial_start);
        startDate.setDate(startDate.getDate() + 30);
        return startDate;
      })()
    : null;

  // Déterminer le statut de l'abonnement (simplifié pour l'instant)
  const subscriptionStatus: SubscriptionStatus = isTrialActive
    ? "trial_active"
    : isTrialExpired
    ? "trial_expired"
    : "none";

  // TODO: Récupérer depuis la base de données
  const currentPlan: PlanType = null;
  const autoRenewal = true;
  const nextBillingDate = null;
  const cancelledUntil = null;
  const paymentMethod = null;
  const billingEmail = user.email;
  const legalName = club?.name || "";
  const billingAddress = null;
  const vatNumber = null;
  const adminContact = user.email;

  // Calculer les prix automatiquement
  const MONTHLY_PRICE = 99;
  const QUARTERLY_DISCOUNT = 0.10; // 10%
  const ANNUAL_DISCOUNT = 0.17; // 17%

  const quarterlyMonthlyPrice = MONTHLY_PRICE * (1 - QUARTERLY_DISCOUNT); // 89.10€
  const quarterlyTotalPrice = quarterlyMonthlyPrice * 3; // 267.30€

  const annualMonthlyPrice = MONTHLY_PRICE * (1 - ANNUAL_DISCOUNT); // 82.17€
  const annualTotalPrice = annualMonthlyPrice * 12; // 986.04€

  const formatDate = (date: Date | null): string => {
    if (!date) return "—";
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Facturation & essai</h1>
        <p className="text-sm text-white/60 mt-1">Gérez votre abonnement et votre période d'essai</p>
      </div>

      {/* Bandeau Essai */}
      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 via-indigo-600/5 to-purple-600/10 p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-extrabold text-white mb-1">Essai gratuit — 30 jours</h2>
            {isTrialActive && daysRemaining !== null && (
              <div className="flex items-center gap-3 mt-2">
                <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                  showWarning
                    ? "border-orange-400/50 bg-orange-500/20 text-orange-300"
                    : "border-emerald-400/50 bg-emerald-500/20 text-emerald-300"
                }`}>
                  {daysRemaining} jour{daysRemaining > 1 ? "s" : ""} restant{daysRemaining > 1 ? "s" : ""}
                </span>
                {trialEndDate && (
                  <span className="text-sm text-white/70">
                    Se termine le {formatDate(trialEndDate)}
                  </span>
                )}
              </div>
            )}
          </div>
          {isTrialActive && (
            <div className="text-5xl flex-shrink-0">🎁</div>
          )}
        </div>

        {isTrialActive && (
          <div className="space-y-3">
            <p className="text-sm text-white/80">
              {showWarning
                ? `Votre essai se termine dans ${daysRemaining} jour${daysRemaining > 1 ? "s" : ""}. Choisissez une offre pour continuer à utiliser la plateforme après le ${formatDate(trialEndDate)}.`
                : `Votre essai gratuit se termine le ${formatDate(trialEndDate)}. Vous pouvez activer votre abonnement maintenant ou choisir une offre ci-dessous.`}
            </p>
            {showWarning && (
              <div className="rounded-lg border border-orange-400/40 bg-orange-500/10 p-3">
                <p className="text-xs text-orange-200 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Votre essai se termine bientôt. Sélectionnez une offre pour continuer sans interruption.</span>
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-3 pt-2">
              <button className="group relative inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-600 border border-emerald-400/50 shadow-[0_6px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_24px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-100 transition-all duration-300">
                <span className="relative z-10">✅ Activer l'abonnement maintenant</span>
              </button>
              <button className="group relative inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 border border-blue-400/50 shadow-[0_6px_20px_rgba(59,130,246,0.3)] hover:shadow-[0_8px_24px_rgba(59,130,246,0.4)] hover:scale-105 active:scale-100 transition-all duration-300">
                <span className="relative z-10">📋 Choisir une offre</span>
              </button>
            </div>
          </div>
        )}

        {isTrialExpired && (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="text-4xl flex-shrink-0">⏰</div>
              <div className="flex-1">
                <p className="text-sm text-rose-200/90 mb-3">
                  Votre période d'essai est terminée. Sélectionnez une offre ci-dessous pour continuer à utiliser la plateforme.
                </p>
                <button className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-600 border border-emerald-400/50 shadow-[0_6px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_24px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-100 transition-all duration-300">
                  <span>📋 Choisir une offre pour continuer</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {!isTrialActive && !isTrialExpired && (
          <div className="flex items-center gap-4">
            <div className="text-4xl flex-shrink-0">💳</div>
            <div className="flex-1">
              <p className="text-sm text-white/80">
                Profitez de 30 jours d'essai gratuit pour découvrir toutes les fonctionnalités.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Cartes Offres */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-1">Choisissez l'offre qui vous convient</h2>
          <p className="text-sm text-white/60">Les réductions s'appliquent automatiquement.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Mensuel */}
          <div className={`group relative flex flex-col rounded-2xl border-2 p-6 transition-all duration-300 ${
            currentPlan === "monthly"
              ? "border-emerald-400/80 bg-gradient-to-br from-emerald-500/20 via-emerald-600/10 to-emerald-500/20 shadow-[0_8px_32px_rgba(16,185,129,0.25)]"
              : "border-white/20 bg-gradient-to-br from-white/5 via-white/5 to-white/5 hover:border-blue-400/60 hover:bg-gradient-to-br hover:from-blue-500/15 hover:via-indigo-600/10 hover:to-blue-500/15 hover:shadow-[0_12px_40px_rgba(59,130,246,0.3)] hover:scale-105 cursor-pointer"
          }`}>
            {currentPlan === "monthly" && (
              <div className="absolute -top-3 right-4">
                <span className="rounded-full border-2 border-emerald-400 bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                  ✓ Plan actuel
                </span>
              </div>
            )}
            <div className="mb-4">
              <h3 className="text-xl font-extrabold text-white mb-1">Mensuel</h3>
              <div className="text-xs text-white/60">Tarif de référence</div>
            </div>
            <div className="mb-5">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">{MONTHLY_PRICE}€</span>
                <span className="text-sm font-normal text-white/70">/mois</span>
              </div>
            </div>
            <div className="mb-5 space-y-2">
              <div className="flex items-center">
                <div className="text-xs text-white/60">Cycle :</div>
                <div className="text-xs text-white/80 ml-1">Facturation mensuelle</div>
              </div>
            </div>
            <button
              disabled={currentPlan === "monthly"}
              className={`w-full rounded-xl px-5 py-3 text-sm font-bold transition-all duration-300 mt-auto ${
                currentPlan === "monthly"
                  ? "bg-white/10 border-2 border-white/20 text-white/50 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-2 border-blue-400/50 shadow-[0_6px_20px_rgba(59,130,246,0.4)] hover:shadow-[0_8px_28px_rgba(59,130,246,0.5)] hover:scale-105 active:scale-100"
              }`}
            >
              {currentPlan === "monthly" ? "Plan actuel" : "Sélectionner ce plan"}
            </button>
          </div>

          {/* Trimestriel */}
          <div className={`group relative flex flex-col rounded-2xl border-2 p-6 transition-all duration-300 ${
            currentPlan === "quarterly"
              ? "border-emerald-400/80 bg-gradient-to-br from-emerald-500/20 via-emerald-600/10 to-emerald-500/20 shadow-[0_8px_32px_rgba(16,185,129,0.25)]"
              : "border-white/20 bg-gradient-to-br from-white/5 via-white/5 to-white/5 hover:border-emerald-400/60 hover:bg-gradient-to-br hover:from-emerald-500/15 hover:via-green-600/10 hover:to-emerald-500/15 hover:shadow-[0_12px_40px_rgba(16,185,129,0.3)] hover:scale-105 cursor-pointer"
          }`}>
            {currentPlan === "quarterly" && (
              <div className="absolute -top-3 right-4">
                <span className="rounded-full border-2 border-emerald-400 bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                  ✓ Plan actuel
                </span>
              </div>
            )}
            {currentPlan !== "quarterly" && (
              <div className="absolute -top-3 right-4">
                <span className="rounded-full border-2 border-emerald-400/80 bg-gradient-to-r from-emerald-500 to-green-600 px-3 py-1 text-xs font-bold text-white shadow-lg">
                  -10%
                </span>
              </div>
            )}
            <div className="mb-4">
              <h3 className="text-xl font-extrabold text-white mb-1">Trimestriel</h3>
              <div className="text-xs text-emerald-300 font-semibold">Économisez 10%</div>
            </div>
            <div className="mb-5">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">{Math.round(quarterlyMonthlyPrice)}€</span>
                <span className="text-sm font-normal text-white/70">/mois</span>
              </div>
              <div className="text-xs text-white/60 mt-1">
                {Math.round(quarterlyTotalPrice)}€ tous les 3 mois
              </div>
            </div>
            <div className="mb-5 space-y-2">
              <div className="text-xs font-semibold text-emerald-300 bg-emerald-500/20 px-2 py-1 rounded w-fit -ml-1">Réduction de 10% par rapport au mensuel</div>
              <div className="flex items-center">
                <div className="text-xs text-white/60">Cycle :</div>
                <div className="text-xs text-white/80 ml-1">Facturation tous les 3 mois</div>
              </div>
            </div>
            <button
              disabled={currentPlan === "quarterly"}
              className={`w-full rounded-xl px-5 py-3 text-sm font-bold transition-all duration-300 mt-auto ${
                currentPlan === "quarterly"
                  ? "bg-white/10 border-2 border-white/20 text-white/50 cursor-not-allowed"
                  : "bg-gradient-to-r from-emerald-500 to-green-600 text-white border-2 border-emerald-400/50 shadow-[0_6px_20px_rgba(16,185,129,0.4)] hover:shadow-[0_8px_28px_rgba(16,185,129,0.5)] hover:scale-105 active:scale-100"
              }`}
            >
              {currentPlan === "quarterly" ? "Plan actuel" : "Sélectionner ce plan"}
            </button>
          </div>

          {/* Annuel */}
          <div className={`group relative flex flex-col rounded-2xl border-2 p-6 transition-all duration-300 ${
            currentPlan === "annual"
              ? "border-emerald-400/80 bg-gradient-to-br from-emerald-500/20 via-emerald-600/10 to-emerald-500/20 shadow-[0_8px_32px_rgba(16,185,129,0.25)]"
              : "border-white/20 bg-gradient-to-br from-white/5 via-white/5 to-white/5 hover:border-yellow-400/60 hover:bg-gradient-to-br hover:from-yellow-500/15 hover:via-amber-600/10 hover:to-yellow-500/15 hover:shadow-[0_12px_40px_rgba(234,179,8,0.3)] hover:scale-105 cursor-pointer"
          }`}>
            {currentPlan === "annual" && (
              <div className="absolute -top-3 right-4">
                <span className="rounded-full border-2 border-emerald-400 bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                  ✓ Plan actuel
                </span>
              </div>
            )}
            {currentPlan !== "annual" && (
              <div className="absolute -top-3 right-4">
                <span className="rounded-full border-2 border-yellow-400/80 bg-gradient-to-r from-yellow-500 to-amber-600 px-3 py-1 text-xs font-bold text-white shadow-lg">
                  MEILLEUR
                </span>
              </div>
            )}
            <div className="mb-4">
              <h3 className="text-xl font-extrabold text-white mb-1">Annuel</h3>
              <div className="text-xs text-yellow-300 font-semibold">Économisez 17%</div>
            </div>
            <div className="mb-5">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">{Math.round(annualMonthlyPrice)}€</span>
                <span className="text-sm font-normal text-white/70">/mois</span>
              </div>
              <div className="text-xs text-white/60 mt-1">
                {Math.round(annualTotalPrice)}€ par an
              </div>
            </div>
            <div className="mb-5 space-y-2">
              <div className="flex items-baseline gap-2 flex-wrap -ml-1">
                <span className="text-xs font-semibold text-yellow-300 bg-yellow-500/20 px-2 py-0.5 rounded">Réduction de 17% par rapport au mensuel</span>
                <span className="text-xs text-white/60 ml-1">(≈ 2 mois offerts)</span>
              </div>
              <div className="flex items-center">
                <div className="text-xs text-white/60">Cycle :</div>
                <div className="text-xs text-white/80 ml-1">Facturation annuelle</div>
              </div>
            </div>
            <button
              disabled={currentPlan === "annual"}
              className={`w-full rounded-xl px-5 py-3 text-sm font-bold transition-all duration-300 mt-auto ${
                currentPlan === "annual"
                  ? "bg-white/10 border-2 border-white/20 text-white/50 cursor-not-allowed"
                  : "bg-gradient-to-r from-yellow-500 to-amber-600 text-white border-2 border-yellow-400/50 shadow-[0_6px_20px_rgba(234,179,8,0.4)] hover:shadow-[0_8px_28px_rgba(234,179,8,0.5)] hover:scale-105 active:scale-100"
              }`}
            >
              {currentPlan === "annual" ? "Plan actuel" : "Sélectionner ce plan"}
            </button>
          </div>
        </div>
      </section>

      {/* Bloc Statut d'Abonnement */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Statut de l'abonnement</h2>

        <div className="space-y-4">
          {/* Statut */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-white/60 mb-1">Statut</div>
            <div className="flex items-center gap-2">
              {subscriptionStatus === "trial_active" && (
                <>
                  <span className="rounded-full border border-emerald-400/50 bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-300">
                    Essai actif
                  </span>
                </>
              )}
              {subscriptionStatus === "trial_expired" && (
                <span className="rounded-full border border-rose-400/50 bg-rose-500/20 px-3 py-1 text-sm font-semibold text-rose-300">
                  Essai expiré
                </span>
              )}
              {subscriptionStatus === "active" && (
                <span className="rounded-full border border-emerald-400/50 bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-300">
                  Abonnement actif
                </span>
              )}
              {subscriptionStatus === "cancelled" && cancelledUntil && (
                <span className="rounded-full border border-orange-400/50 bg-orange-500/20 px-3 py-1 text-sm font-semibold text-orange-300">
                  Annulé (jusqu'au {formatDate(cancelledUntil)})
                </span>
              )}
              {subscriptionStatus === "payment_pending" && (
                <span className="rounded-full border border-yellow-400/50 bg-yellow-500/20 px-3 py-1 text-sm font-semibold text-yellow-300">
                  Paiement en attente
                </span>
              )}
              {subscriptionStatus === "payment_failed" && (
                <span className="rounded-full border border-rose-400/50 bg-rose-500/20 px-3 py-1 text-sm font-semibold text-rose-300">
                  Échec de paiement
                </span>
              )}
              {subscriptionStatus === "none" && (
                <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-sm font-semibold text-white/60">
                  Aucun abonnement
                </span>
              )}
            </div>
          </div>

          {/* Renouvellement automatique */}
          {subscriptionStatus === "active" && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-white/60 mb-1">Renouvellement automatique</div>
                  <div className="text-sm text-white/80">
                    {autoRenewal
                      ? "Activé — Votre abonnement sera reconduit automatiquement"
                      : "Désactivé — Votre abonnement ne sera pas reconduit"}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked={autoRenewal} />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>
          )}

          {/* Prochaine échéance */}
          {subscriptionStatus === "active" && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-white/60 mb-1">Prochaine échéance</div>
              {nextBillingDate ? (
                <div className="text-sm text-white">
                  {formatDate(nextBillingDate)} — {currentPlan === "monthly" ? "Mensuel" : currentPlan === "quarterly" ? "Trimestriel" : "Annuel"}
                </div>
              ) : (
                <div className="text-sm text-white/60">—</div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {subscriptionStatus === "active" && (
              <>
                <button className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-white/10 border border-white/10 hover:bg-white/15 transition-colors">
                  Gérer l'offre
                </button>
                <button className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-white/10 border border-white/10 hover:bg-white/15 transition-colors">
                  Annuler à fin de période
                </button>
              </>
            )}
            {subscriptionStatus === "payment_failed" && (
              <button className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-red-600 border border-rose-400/50 hover:shadow-[0_6px_20px_rgba(239,68,68,0.3)] transition-all">
                Relancer le paiement
              </button>
            )}
            {subscriptionStatus === "cancelled" && cancelledUntil && (
              <button className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-600 border border-emerald-400/50 hover:shadow-[0_6px_20px_rgba(16,185,129,0.3)] transition-all">
                Réactiver avant l'échéance
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Infos de Facturation */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Informations de facturation</h2>

        <div className="space-y-4">
          {/* Dénomination légale */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-white/60 mb-1">Dénomination légale</div>
            <div className="text-sm text-white">{legalName || "—"}</div>
          </div>

          {/* Adresse de facturation */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-white/60 mb-1">Adresse de facturation</div>
            <div className="text-sm text-white">{billingAddress || "—"}</div>
            <button className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline">
              Modifier
            </button>
          </div>

          {/* TVA */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-white/60 mb-1">TVA (optionnel)</div>
            <div className="text-sm text-white">{vatNumber || "—"}</div>
            <button className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline">
              {vatNumber ? "Modifier" : "Ajouter"}
            </button>
          </div>

          {/* Email de facturation */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-white/60 mb-1">Email de facturation</div>
            <div className="text-sm text-white">{billingEmail || "—"}</div>
            <button className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline">
              Modifier
            </button>
          </div>

          {/* Contact administratif */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-white/60 mb-1">Contact administratif</div>
            <div className="text-sm text-white">{adminContact || "—"}</div>
          </div>

          {/* Moyen de paiement */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-white/60 mb-1">Moyen de paiement</div>
            {paymentMethod ? (
              <div className="space-y-2">
                <div className="text-sm text-white">
                  {paymentMethod.type} — •••• {paymentMethod.last4} — {paymentMethod.expiry}
                </div>
                <div className="flex gap-2">
                  <button className="text-xs text-blue-400 hover:text-blue-300 underline">
                    Mettre à jour
                  </button>
                  <button className="text-xs text-rose-400 hover:text-rose-300 underline">
                    Retirer
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm text-white/60">Aucun moyen de paiement enregistré</div>
                <button className="text-xs text-blue-400 hover:text-blue-300 underline">
                  Ajouter un moyen de paiement
                </button>
              </div>
            )}
          </div>

          {/* Préférences */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-white/60 mb-3">Préférences</div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white">Factures PDF par email</div>
                  <div className="text-xs text-white/60">Recevoir automatiquement vos factures par email</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Prochaine Échéance & Historique */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Historique des factures</h2>

        <div className="space-y-4">
          {/* Prochaine échéance */}
          {subscriptionStatus === "active" && nextBillingDate && (
            <div className="rounded-xl border border-white/10 bg-blue-500/10 p-4">
              <div className="text-xs text-white/60 mb-1">Prochaine échéance</div>
              <div className="text-sm text-white">
                {formatDate(nextBillingDate)} — {currentPlan === "monthly" ? "Mensuel" : currentPlan === "quarterly" ? "Trimestriel" : "Annuel"}
              </div>
              <div className="text-xs text-white/60 mt-1">Taxes applicables selon votre pays</div>
            </div>
          )}

          {/* Historique */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-center py-8">
              <div className="text-4xl mb-3 opacity-50">📄</div>
              <p className="text-sm text-white/70">Aucune facture disponible pour le moment</p>
              <p className="text-xs text-white/50 mt-1">
                Vos factures apparaîtront ici après l'activation de votre abonnement
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Annulation & Renouvellement */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Annulation & Renouvellement</h2>

        <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-white mb-2">Politique d'annulation</h3>
            <p className="text-xs text-white/70 leading-relaxed mb-3">
              Annulation possible à tout moment, avec prise d'effet à la fin de la période en cours. 
              Votre accès est conservé jusqu'à la date d'échéance. Aucune reconduction au-delà de cette date si l'annulation est effective.
            </p>
            {subscriptionStatus === "active" && (
              <button className="text-xs text-rose-400 hover:text-rose-300 underline">
                Annuler l'abonnement
              </button>
            )}
          </div>

          {subscriptionStatus === "active" && (
            <div className="rounded-xl border border-blue-400/40 bg-blue-500/10 p-4">
              <div className="text-xs text-blue-200 mb-1">ℹ️ Renouvellement automatique</div>
              <p className="text-xs text-blue-200/80 leading-relaxed">
                {autoRenewal
                  ? "Votre abonnement sera reconduit automatiquement à chaque échéance. Vous pouvez désactiver cette option ci-dessus à tout moment."
                  : "La reconduction automatique est désactivée. Votre abonnement prendra fin à la prochaine échéance."}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Légal & Conformité */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Légal & Conformité</h2>

        <div className="space-y-3">
          <a href="#" className="block text-sm text-blue-400 hover:text-blue-300 underline">
            Conditions d'abonnement
          </a>
          <a href="#" className="block text-sm text-blue-400 hover:text-blue-300 underline">
            Politique de confidentialité
          </a>
          <a href="#" className="block text-sm text-blue-400 hover:text-blue-300 underline">
            DPA / RGPD
          </a>
      </div>
      </section>
    </div>
  );
}
