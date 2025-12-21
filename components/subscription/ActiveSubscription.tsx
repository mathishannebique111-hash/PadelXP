'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatPlanName, formatDate, type PlanType, type SubscriptionStatus } from '@/lib/subscription';
import { logger } from '@/lib/logger';

interface ActiveSubscriptionProps {
  clubId: string;
  selectedPlan: PlanType;
  subscriptionStatus: SubscriptionStatus;
  stripeSubscriptionId: string | null;
  subscriptionStartedAt: string | null;
}

export default function ActiveSubscription({
  clubId,
  selectedPlan,
  subscriptionStatus,
  stripeSubscriptionId,
  subscriptionStartedAt,
}: ActiveSubscriptionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const isCanceled = subscriptionStatus === 'canceled';

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      // Créer une session pour le portail client Stripe
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Erreur lors de l\'ouverture du portail client');
      }
    } catch (error) {
      logger.error('Error opening customer portal:', error);
      alert('Erreur lors de l\'ouverture du portail client');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clubId }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Abonnement annulé avec succès. Vous conservez l\'accès jusqu\'à la fin de la période payée.');
        router.refresh();
      } else {
        alert(data.error || 'Erreur lors de l\'annulation');
      }
    } catch (error) {
      logger.error('Error canceling subscription:', error);
      alert('Erreur lors de l\'annulation');
    } finally {
      setLoading(false);
      setShowCancelModal(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/subscription/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clubId }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Abonnement réactivé avec succès !');
        router.refresh();
      } else {
        alert(data.error || 'Erreur lors de la réactivation');
      }
    } catch (error) {
      logger.error('Error reactivating subscription:', error);
      alert('Erreur lors de la réactivation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Carte d'abonnement actif ou annulé */}
      <div className={`rounded-2xl border-2 p-6 ${
        isCanceled
          ? 'bg-gradient-to-br from-orange-500/20 via-amber-600/10 to-orange-500/20 border-orange-400/50'
          : 'bg-gradient-to-br from-emerald-500/20 via-green-600/10 to-emerald-500/20 border-emerald-400/50'
      }`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{isCanceled ? '⏸️' : '✨'}</span>
              <div>
                <h3 className="text-xl font-extrabold text-white">
                  {isCanceled ? 'Abonnement annulé' : 'Abonnement actif'}
                </h3>
                <p className="text-white/70 text-sm">Plan {formatPlanName(selectedPlan)}</p>
              </div>
            </div>
            {subscriptionStartedAt && !isCanceled && (
              <p className="text-white/60 text-sm">
                Actif depuis le {formatDate(subscriptionStartedAt)}
              </p>
            )}
            {isCanceled && (
              <p className="text-white/60 text-sm">
                Vous conservez l'accès jusqu'à la fin de la période payée
              </p>
            )}
          </div>
          <div className="flex gap-3">
            {isCanceled ? (
              <>
                <button
                  onClick={handleReactivateSubscription}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50"
                >
                  {loading ? 'Réactivation...' : 'Réactiver mon abonnement'}
                </button>
                <button
                  onClick={handleManageSubscription}
                  disabled={loading}
                  className="px-6 py-3 bg-white/10 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? 'Chargement...' : 'Gérer'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleManageSubscription}
                  disabled={loading}
                  className="px-6 py-3 bg-white/10 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? 'Chargement...' : 'Gérer mon abonnement'}
                </button>
                <button
                  onClick={() => setShowCancelModal(true)}
                  disabled={loading}
                  className="px-6 py-3 bg-red-500/20 border border-red-400/50 text-red-300 font-semibold rounded-xl hover:bg-red-500/30 transition-all duration-200 disabled:opacity-50"
                >
                  Annuler
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal de confirmation d'annulation */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/20 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Annuler l'abonnement</h3>
            <p className="text-white/70 mb-6">
              Êtes-vous sûr de vouloir annuler votre abonnement ? Vous conservez l'accès jusqu'à la fin de la période payée.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/20 transition-all duration-200"
              >
                Garder mon abonnement
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-all duration-200 disabled:opacity-50"
              >
                {loading ? 'Annulation...' : 'Confirmer l\'annulation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

