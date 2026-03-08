'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import NewSubscriptionCheckoutButton from './NewSubscriptionCheckoutButton';
import StripeCheckoutButton from './StripeCheckoutButton';

interface PlanSelectionProps {
  isTrialActive: boolean;
  hasChosenPlan: boolean;
  currentPlan: 'monthly' | 'annual' | 'quarterly' | null;
  isSubscriptionCanceled: boolean;
  monthlyPrice: number;
  priceMonthly: string;
}

export default function PlanSelection({
  isTrialActive,
  hasChosenPlan,
  currentPlan,
  isSubscriptionCanceled,
  monthlyPrice,
  priceMonthly,
}: PlanSelectionProps) {
  const [withReservations, setWithReservations] = useState(false);

  // Le prix de l'option réservation est de 39€ (mensuel)
  const totalMonthly = withReservations ? monthlyPrice + 39 : monthlyPrice;

  const isCurrentPlanSelected = currentPlan === "monthly" && hasChosenPlan && !isSubscriptionCanceled;

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Option Reservations Toggle */}
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <div className="flex items-center justify-between gap-4 relative z-10">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Option Réservations
              <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30 font-medium uppercase tracking-wider">Optionnel</span>
            </h3>
            <p className="text-xs text-white/60 mt-1 leading-relaxed">
              Ajoutez la gestion des réservations de terrains en ligne pour vos membres.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={withReservations}
                onChange={() => setWithReservations(!withReservations)}
              />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 transition-colors"></div>
            </label>
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-white">+39€<span className="text-[10px] text-white/50 font-normal">/mois</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Card */}
      <div className="w-full max-w-md">
        <div
          className={`group relative flex flex-col rounded-lg sm:rounded-xl md:rounded-2xl border-2 p-5 sm:p-6 md:p-7 transition-all duration-300 hover:scale-[1.02] ${isCurrentPlanSelected
            ? "border-white/70 bg-gradient-to-br from-white/20 via-slate-100/10 to-white/20 shadow-[0_10px_35px_rgba(255,255,255,0.25)]"
            : "border-blue-400/60 bg-gradient-to-br from-blue-500/15 via-indigo-600/10 to-blue-500/15 shadow-[0_12px_40px_rgba(59,130,246,0.3)]"
            }`}
        >
          {isCurrentPlanSelected && (
            <div className="absolute -top-3 right-4">
              <span className="rounded-full border-2 border-white/80 bg-gradient-to-r from-white to-slate-200 px-3 py-1 text-xs font-bold text-slate-800 shadow-lg">
                <Check className="w-3 h-3 inline mr-1" /> Plan actuel
              </span>
            </div>
          )}
          <div className="mb-4">
            <h3 className="text-xl font-extrabold text-white">Mensuel</h3>
          </div>
          <div className="mb-5">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-white">{totalMonthly}€</span>
              <span className="text-sm font-normal text-white/70">/mois</span>
            </div>
            {withReservations && (
              <p className="text-[11px] text-blue-300 mt-1 font-medium bg-blue-500/10 inline-block px-2 py-0.5 rounded border border-blue-500/20">
                ({monthlyPrice}€ abonnement + 39€ option réservations)
              </p>
            )}
          </div>
          <div className="mb-6 space-y-3">
            <div className="flex items-center">
              <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center mr-2">
                <Check className="w-3 h-3 text-blue-400" />
              </div>
              <div className="text-xs text-white/80 italic">Toutes les fonctionnalités incluses</div>
            </div>
            {withReservations && (
              <div className="flex items-center">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center mr-2">
                  <Check className="w-3 h-3 text-emerald-400" />
                </div>
                <div className="text-xs text-white/80 font-bold">Inclus : Gestion des réservations</div>
              </div>
            )}
          </div>
          
          {isTrialActive && !hasChosenPlan ? (
            <NewSubscriptionCheckoutButton
              plan="monthly"
              withReservations={withReservations}
              disabled={isCurrentPlanSelected || !priceMonthly}
              className={`w-full rounded-xl px-5 py-3 text-sm font-bold transition-all duration-300 mt-auto ${isCurrentPlanSelected || !priceMonthly
                ? "bg-white/10 border-2 border-white/20 text-white/50 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-2 border-blue-400/50 shadow-[0_6px_20px_rgba(59,130,246,0.4)] hover:shadow-[0_8px_28px_rgba(59,130,246,0.5)] hover:scale-105 active:scale-100"
                }`}
            >
              {isCurrentPlanSelected ? "Plan actuel" : "Sélectionner ce plan"}
            </NewSubscriptionCheckoutButton>
          ) : (
            <StripeCheckoutButton
              priceId={priceMonthly}
              mode="subscription"
              withReservations={withReservations}
              disabled={isCurrentPlanSelected || !priceMonthly}
              className={`w-full rounded-xl px-5 py-3 text-sm font-bold transition-all duration-300 mt-auto ${isCurrentPlanSelected || !priceMonthly
                ? "bg-white/10 border-2 border-white/20 text-white/50 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-2 border-blue-400/50 shadow-[0_6px_20px_rgba(59,130,246,0.4)] hover:shadow-[0_8px_28px_rgba(59,130,246,0.5)] hover:scale-105 active:scale-100"
                }`}
            >
              {isCurrentPlanSelected ? "Plan actuel" : "Sélectionner ce plan"}
            </StripeCheckoutButton>
          )}
        </div>
      </div>
    </div>
  );
}
