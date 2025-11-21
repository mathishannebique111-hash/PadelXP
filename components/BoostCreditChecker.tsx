"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface BoostCreditCheckerProps {
  currentStats: {
    creditsAvailable: number;
    usedThisMonth: number;
    remainingThisMonth: number;
    canUse: boolean;
  };
}

export default function BoostCreditChecker({ currentStats }: BoostCreditCheckerProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [autoChecked, setAutoChecked] = useState(false);

  const checkAndCreditBoosts = async (isAuto = false) => {
    if (!isAuto) {
      setChecking(true);
      setError(null);
      setSuccess(null);
    }

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        if (!isAuto) {
          setError("Vous devez être connecté pour vérifier vos boosts");
          setChecking(false);
        }
        return;
      }

      // Vérifier toutes les sessions Stripe du joueur et créditer les boosts manquants
      const response = await fetch("/api/admin/credit-boosts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkAll: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (!isAuto) {
          setError(data.error || "Erreur lors de la vérification des boosts");
          setChecking(false);
        }
        return;
      }

      if (data.alreadyCredited || data.credited === 0) {
        if (!isAuto) {
          setSuccess("Tous vos boosts sont déjà crédités.");
        }
      } else {
        const message = `${data.credited} boost(s) ont été crédité(s) avec succès !`;
        if (!isAuto) {
          setSuccess(message);
        }
        // Recharger les stats après un court délai
        setTimeout(() => {
          router.refresh();
        }, isAuto ? 500 : 1000);
      }
    } catch (err) {
      console.error("Error checking boosts:", err);
      if (!isAuto) {
        setError("Une erreur est survenue lors de la vérification");
      }
    } finally {
      if (!isAuto) {
        setChecking(false);
        // Effacer le message de succès après 5 secondes
        if (success) {
          setTimeout(() => setSuccess(null), 5000);
        }
      }
    }
  };

  // Vérifier automatiquement au chargement si l'utilisateur n'a pas de boosts disponibles
  useEffect(() => {
    const autoCheck = async () => {
      // Attendre 1 seconde après le chargement de la page pour vérifier automatiquement
      const timer = setTimeout(async () => {
        if (currentStats.creditsAvailable === 0 && !autoChecked) {
          setAutoChecked(true);
          await checkAndCreditBoosts(true); // true = vérification automatique
        }
      }, 1000);

      return () => clearTimeout(timer);
    };

    autoCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStats.creditsAvailable]);

  return (
    <div className="mb-6 rounded-2xl border border-blue-500/40 bg-blue-600/20 p-4 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="mb-1 text-sm font-semibold text-white">Vérifier mes boosts</h3>
          <p className="text-xs text-white/70">
            Si vous avez acheté des boosts mais qu'ils n'apparaissent pas, cliquez ici pour vérifier et créditer automatiquement vos boosts manquants.
          </p>
        </div>
        <button
          onClick={checkAndCreditBoosts}
          disabled={checking}
          className="rounded-lg border border-blue-500/50 bg-gradient-to-r from-blue-600/30 to-purple-600/30 px-4 py-2 text-sm font-semibold text-white transition-all hover:from-blue-600/40 hover:to-purple-600/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {checking ? "Vérification..." : "Vérifier"}
        </button>
      </div>
      {error && (
        <div className="mt-3 rounded-lg border border-red-500/40 bg-red-600/20 p-3 text-xs text-red-100">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-3 rounded-lg border border-green-500/40 bg-green-600/20 p-3 text-xs text-green-100">
          {success}
        </div>
      )}
    </div>
  );
}

