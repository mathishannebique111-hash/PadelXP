"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanCycle } from "@/lib/utils/subscription-utils";

interface BillingActionsProps {
  subscriptionId: string;
  currentStatus: string;
  hasPaymentMethod: boolean;
  currentPlan: PlanCycle | null;
}

export default function BillingActions({
  subscriptionId,
  currentStatus,
  hasPaymentMethod,
  currentPlan,
}: BillingActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleActivate = async (planCycle: PlanCycle, activateNow: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/subscriptions/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCycle, activateNow }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'activation");
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/subscriptions/pause", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la mise en pause");
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/subscriptions/resume", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la reprise");
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (cancelAtPeriodEnd: boolean = true) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelAtPeriodEnd }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'annulation");
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConsent = async (consent: boolean) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/subscriptions/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la mise à jour du consentement");
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="rounded-xl border border-red-400/50 bg-red-500/10 p-4 text-sm text-red-300">
        {error}
      </div>
    );
  }

  // Rendu conditionnel selon le statut
  if (currentStatus === "trialing") {
    return (
      <div className="space-y-3">
        {!hasPaymentMethod && (
          <div className="rounded-lg border border-orange-400/40 bg-orange-500/10 p-3 text-xs text-orange-200">
            ⚠️ Ajoutez un moyen de paiement pour activer votre abonnement
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleActivate("monthly", true)}
            disabled={loading || !hasPaymentMethod}
            className="group relative inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 border border-blue-400/50 shadow-[0_6px_20px_rgba(59,130,246,0.3)] hover:shadow-[0_8px_24px_rgba(59,130,246,0.4)] hover:scale-105 active:scale-100 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Chargement..." : "✅ Activer l'abonnement maintenant (Mensuel)"}
          </button>
          <button
            onClick={() => handleActivate("monthly", false)}
            disabled={loading || !hasPaymentMethod}
            className="group relative inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white bg-white/10 border border-white/20 hover:bg-white/20 hover:border-white/30 hover:scale-105 active:scale-100 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Programmer l'activation à la fin de l'essai
          </button>
        </div>
      </div>
    );
  }

  if (currentStatus === "active") {
    return (
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => handlePause()}
          disabled={loading}
          className="group relative inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white bg-white/10 border border-white/20 hover:bg-white/20 hover:border-white/30 hover:scale-105 active:scale-100 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Chargement..." : "Mettre en pause"}
        </button>
        <button
          onClick={() => handleCancel(true)}
          disabled={loading}
          className="group relative inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-red-600 border border-rose-400/50 shadow-[0_6px_20px_rgba(239,68,68,0.3)] hover:shadow-[0_8px_24px_rgba(239,68,68,0.4)] hover:scale-105 active:scale-100 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Chargement..." : "Annuler à fin de période"}
        </button>
      </div>
    );
  }

  if (currentStatus === "paused") {
    return (
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => handleResume()}
          disabled={loading || !hasPaymentMethod}
          className="group relative inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-600 border border-emerald-400/50 shadow-[0_6px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_24px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-100 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Chargement..." : "✅ Reprendre l'abonnement"}
        </button>
      </div>
    );
  }

  return null;
}

