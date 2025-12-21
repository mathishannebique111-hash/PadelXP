'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { calculateTrialDaysRemaining, formatDate, calculateFirstPaymentDate, formatPlanName } from '@/lib/subscription';
import type { SubscriptionStatus, PlanType } from '@/lib/subscription';
import { logger } from '@/lib/logger';

interface TrialStatusBannerProps {
  trialEndDate: string | null;
  subscriptionStatus: SubscriptionStatus;
  selectedPlan: PlanType | null;
  planSelectedAt: string | null;
  subscriptionStartedAt: string | null;
  nextRenewalAt?: string | null;
  clubId?: string;
}

export default function TrialStatusBanner({
  trialEndDate,
  subscriptionStatus,
  selectedPlan,
  planSelectedAt,
  subscriptionStartedAt,
  nextRenewalAt,
  clubId,
}: TrialStatusBannerProps) {
  const router = useRouter();
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [reactivating, setReactivating] = useState(false);

  useEffect(() => {
    if (trialEndDate) {
      const days = calculateTrialDaysRemaining(trialEndDate);
      setDaysRemaining(days);

      // Mettre à jour toutes les heures
      const interval = setInterval(() => {
        const updated = calculateTrialDaysRemaining(trialEndDate);
        setDaysRemaining(updated);
      }, 3600000); // 1 heure

      return () => clearInterval(interval);
    }
  }, [trialEndDate]);

  // Statut: trialing (essai sans plan choisi)
  if (subscriptionStatus === 'trialing' && daysRemaining !== null && daysRemaining > 0) {
    return (
      <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/50 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/30 flex items-center justify-center">
              <span className="text-2xl">⏱️</span>
            </div>
            <div>
              <div className="text-white font-semibold">
                Essai gratuit en cours
              </div>
              <div className="text-white/70 text-sm">
                {daysRemaining} jour{daysRemaining > 1 ? 's' : ''} restant{daysRemaining > 1 ? 's' : ''}
              </div>
            </div>
          </div>
          <Link
            href="/dashboard/subscription"
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105"
          >
            Choisir mon plan
          </Link>
        </div>
      </div>
    );
  }

  // Statut: trialing_with_plan (plan choisi pendant l'essai)
  if (subscriptionStatus === 'trialing_with_plan' && selectedPlan && daysRemaining !== null) {
    const firstPaymentDate = calculateFirstPaymentDate(trialEndDate);

    return (
      <div className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-400/50 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/30 flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">
                  Plan {formatPlanName(selectedPlan)} sélectionné
                </span>
                <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-200 text-xs font-semibold rounded-full">
                  Actif après l'essai
                </span>
              </div>
              <div className="text-white/70 text-sm mt-1">
                {daysRemaining > 0 ? (
                  <>
                    {daysRemaining} jour{daysRemaining > 1 ? 's' : ''} d'essai restant{daysRemaining > 1 ? 's' : ''} • 
                    Premier paiement le {firstPaymentDate ? formatDate(firstPaymentDate) : '—'}
                  </>
                ) : (
                  <>Premier paiement le {firstPaymentDate ? formatDate(firstPaymentDate) : '—'}</>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Statut: active (abonnement actif)
  if (subscriptionStatus === 'active' && selectedPlan) {
    return (
      <div className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-400/50 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/30 flex items-center justify-center">
              <span className="text-2xl">✨</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">
                  Abonnement actif
                </span>
                <span className="px-2 py-0.5 bg-blue-500/30 text-blue-200 text-xs font-semibold rounded-full">
                  {formatPlanName(selectedPlan)}
                </span>
              </div>
              <div className="text-white/70 text-sm mt-1">
                {nextRenewalAt ? (
                  <>Prochain renouvellement le {formatDate(nextRenewalAt)}</>
                ) : subscriptionStartedAt ? (
                  <>Actif depuis le {formatDate(subscriptionStartedAt)}</>
                ) : (
                  <>Abonnement en cours</>
                )}
              </div>
            </div>
          </div>
          <Link
            href="/dashboard/subscription"
            className="px-4 py-2 bg-white/10 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/20 transition-all duration-200"
          >
            Gérer
          </Link>
        </div>
      </div>
    );
  }

  // Statut: past_due (paiement en échec)
  if (subscriptionStatus === 'past_due') {
    return (
      <div className="bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-400/50 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/30 flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <div>
              <div className="text-white font-semibold">
                Problème de paiement
              </div>
              <div className="text-white/70 text-sm">
                Votre dernier paiement a échoué. Veuillez mettre à jour votre méthode de paiement.
              </div>
            </div>
          </div>
          <Link
            href="/dashboard/subscription"
            className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-all duration-200"
          >
            Mettre à jour
          </Link>
        </div>
      </div>
    );
  }

  // Statut: canceled (abonnement annulé)
  if (subscriptionStatus === 'canceled' && selectedPlan) {
    const handleReactivate = async () => {
      if (!clubId) {
        router.push('/dashboard/subscription');
        return;
      }

      setReactivating(true);
      try {
        const response = await fetch('/api/subscription/reactivate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clubId }),
        });

        const data = await response.json();

        if (response.ok) {
          router.refresh();
        } else {
          alert(data.error || 'Erreur lors de la réactivation');
        }
      } catch (error) {
        logger.error('Error reactivating subscription:', error);
        alert('Erreur lors de la réactivation');
      } finally {
        setReactivating(false);
      }
    };

    return (
      <div className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-400/50 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/30 flex items-center justify-center">
              <span className="text-2xl">⏸️</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">
                  Abonnement annulé
                </span>
                <span className="px-2 py-0.5 bg-orange-500/30 text-orange-200 text-xs font-semibold rounded-full">
                  {formatPlanName(selectedPlan)}
                </span>
              </div>
              <div className="text-white/70 text-sm mt-1">
                Vous conservez l'accès jusqu'à la fin de la période payée
              </div>
            </div>
          </div>
          <button
            onClick={handleReactivate}
            disabled={reactivating}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50"
          >
            {reactivating ? 'Réactivation...' : 'Réactiver mon abonnement'}
          </button>
        </div>
      </div>
    );
  }

  // Statut: trial_expired (essai terminé sans plan)
  if (subscriptionStatus === 'trial_expired') {
    return (
      <div className="bg-gradient-to-r from-gray-500/20 to-slate-500/20 border border-gray-400/50 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-500/30 flex items-center justify-center">
              <span className="text-2xl">⏸️</span>
            </div>
            <div>
              <div className="text-white font-semibold">
                Essai terminé
              </div>
              <div className="text-white/70 text-sm">
                Choisissez un plan pour continuer à utiliser PadelXP
              </div>
            </div>
          </div>
          <Link
            href="/dashboard/subscription"
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105"
          >
            Choisir un plan
          </Link>
        </div>
      </div>
    );
  }

  return null;
}

