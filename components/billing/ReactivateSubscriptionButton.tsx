'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ReactivateSubscriptionButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export default function ReactivateSubscriptionButton({
  className = '',
  children = 'Réactiver mon abonnement',
}: ReactivateSubscriptionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const router = useRouter();

  const handleReactivate = async () => {
    // Demander confirmation
    if (!confirmed) {
      setConfirmed(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/reactivate-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la réactivation de l\'abonnement');
      }

      // Recharger la page pour mettre à jour l'état
      router.refresh();
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('Reactivate subscription error:', errorMessage);
      setError(errorMessage);
      setLoading(false);
      setConfirmed(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {confirmed && !error && (
        <div className="mb-3 rounded-lg border border-blue-400/40 bg-blue-500/10 p-3 text-sm text-blue-200">
          <p className="mb-2">
            ✅ Êtes-vous sûr de vouloir réactiver votre abonnement ?
          </p>
          <p className="mb-2">
            Votre abonnement sera reconduit automatiquement à chaque échéance. 
            Vous continuerez à être facturé selon le cycle choisi.
          </p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleReactivate}
              disabled={loading}
              className="flex-1 rounded-xl px-5 py-2.5 text-sm font-extrabold text-white bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 border-2 border-emerald-400/60 shadow-[0_4px_16px_rgba(16,185,129,0.4)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.5)] hover:scale-105 active:scale-100 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? 'Réactivation...' : '✨ Confirmer la réactivation'}
            </button>
            <button
              onClick={() => {
                setConfirmed(false);
                setError(null);
              }}
              disabled={loading}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
      {!confirmed && (
        <button
          onClick={handleReactivate}
          disabled={loading}
          className={className}
        >
          {loading ? 'Chargement...' : children}
        </button>
      )}
    </div>
  );
}

