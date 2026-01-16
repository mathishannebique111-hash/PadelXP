'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatPlanName, getMonthlyPrice, getTotalPrice, calculateSavings, type PlanType } from '@/lib/subscription';
import { logger } from '@/lib/logger';

interface PlanSelectionProps {
  clubId: string;
  trialActive: boolean;
  daysRemaining: number | null;
  selectedPlan: PlanType | null;
  subscriptionStatus: string;
}

export default function PlanSelection({
  clubId,
  trialActive,
  daysRemaining,
  selectedPlan,
  subscriptionStatus,
}: PlanSelectionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<PlanType | null>(null);

  const handleSelectPlan = async (plan: PlanType) => {
    setLoading(plan);

    try {
      const response = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Erreur lors de la sélection du plan');
        setLoading(null);
        return;
      }

      // Rediriger vers la page de checkout
      router.push(`/dashboard/subscription/checkout?subscription_id=${data.subscriptionId}&plan=${plan}`);
    } catch (error) {
      logger.error('Error selecting plan:', error);
      alert('Erreur lors de la sélection du plan');
      setLoading(null);
    }
  };

  const plans: PlanType[] = ['annual', 'monthly'];

  return (
    <div className="space-y-6">
      {/* Message d'encouragement si en essai */}
      {trialActive && daysRemaining !== null && daysRemaining > 0 && (
        <div className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-400/50 rounded-xl p-4">
          <p className="text-white text-center font-semibold">
            Choisissez maintenant et économisez jusqu'à 17% sur le premier paiement
          </p>
        </div>
      )}

      {/* Grille des plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => {
          const monthlyPrice = getMonthlyPrice(plan);
          const totalPrice = getTotalPrice(plan);
          const savings = calculateSavings(plan);
          const isSelected = selectedPlan === plan && subscriptionStatus === 'trialing_with_plan';
          const isPopular = plan === 'annual';

          return (
            <div
              key={plan}
              className={`relative flex flex-col rounded-2xl border-2 p-6 transition-all duration-300 hover:scale-105 ${isSelected
                  ? 'border-emerald-400/80 bg-gradient-to-br from-emerald-500/20 via-emerald-600/10 to-emerald-500/20 shadow-[0_8px_32px_rgba(16,185,129,0.25)]'
                  : isPopular
                    ? 'border-yellow-400/60 bg-gradient-to-br from-yellow-500/15 via-amber-600/10 to-yellow-500/15 shadow-[0_12px_40px_rgba(234,179,8,0.3)]'
                    : 'border-blue-400/60 bg-gradient-to-br from-blue-500/15 via-indigo-600/10 to-blue-500/15 shadow-[0_12px_40px_rgba(59,130,246,0.3)]'
                }`}
            >
              {/* Badge "PLUS POPULAIRE" pour l'annuel */}
              {isPopular && !isSelected && (
                <div className="absolute -top-3 right-4">
                  <span className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-xs font-bold rounded-full shadow-lg">
                    PLUS POPULAIRE
                  </span>
                </div>
              )}

              {/* Badge "2 MOIS OFFERTS" pour l'annuel */}
              {isPopular && !isSelected && (
                <div className="absolute -top-3 left-4">
                  <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full shadow-lg">
                    2 MOIS OFFERTS
                  </span>
                </div>
              )}

              {/* Badge "Plan sélectionné" */}
              {isSelected && (
                <div className="absolute -top-3 right-4">
                  <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full shadow-lg">
                    ✓ Plan sélectionné
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-2xl font-extrabold text-white mb-2">{formatPlanName(plan)}</h3>
                {savings.percentage > 0 && (
                  <div className="text-emerald-300 text-sm font-semibold">
                    Économisez {savings.percentage}% par rapport au plan mensuel
                  </div>
                )}
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-white">{monthlyPrice}€</span>
                  <span className="text-white/70">/mois</span>
                </div>
                {plan !== 'monthly' && (
                  <div className="text-white/60 text-sm mt-1">
                    {totalPrice}€ par an
                  </div>
                )}
              </div>

              <div className="mb-6 space-y-2 text-sm text-white/80">
                <div className="flex items-center gap-2">
                  <span>✓</span>
                  <span>Toutes les fonctionnalités incluses</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>✓</span>
                  <span>Support prioritaire</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>✓</span>
                  <span>Annulation à tout moment</span>
                </div>
              </div>

              <button
                onClick={() => handleSelectPlan(plan)}
                disabled={isSelected || loading !== null}
                className={`w-full rounded-xl px-6 py-3 text-sm font-bold transition-all duration-300 mt-auto ${isSelected
                    ? 'bg-white/10 border-2 border-white/20 text-white/50 cursor-not-allowed'
                    : loading === plan
                      ? 'bg-white/10 border-2 border-white/20 text-white/50 cursor-wait'
                      : isPopular
                        ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white border-2 border-yellow-400/50 shadow-[0_6px_20px_rgba(234,179,8,0.4)] hover:shadow-[0_8px_28px_rgba(234,179,8,0.5)] hover:scale-105 active:scale-100'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-2 border-blue-400/50 shadow-[0_6px_20px_rgba(59,130,246,0.4)] hover:shadow-[0_8px_28px_rgba(59,130,246,0.5)] hover:scale-105 active:scale-100'
                  }`}
              >
                {loading === plan ? (
                  'Chargement...'
                ) : isSelected ? (
                  'Plan sélectionné'
                ) : (
                  'Choisir ce plan'
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

