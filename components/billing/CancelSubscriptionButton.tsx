'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CancelSubscriptionButtonProps {
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  className?: string;
  children?: React.ReactNode;
}

export default function CancelSubscriptionButton({
  cancelAtPeriodEnd,
  currentPeriodEnd,
  className = '',
  children = 'Annuler mon abonnement',
}: CancelSubscriptionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const router = useRouter();

  const handleCancel = async () => {
    // Demander confirmation
    if (!confirmed) {
      setConfirmed(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'annulation de l\'abonnement');
      }

      // Recharger la page pour mettre à jour l'état
      router.refresh();
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('Cancel subscription error:', errorMessage);
      setError(errorMessage);
      setLoading(false);
      setConfirmed(false);
    }
  };

  // Si l'abonnement est déjà programmé pour être annulé
  if (cancelAtPeriodEnd && currentPeriodEnd) {
    const endDate = new Date(currentPeriodEnd);
    const formattedDate = new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(endDate);

    return (
      <div className="rounded-lg border border-orange-400/40 bg-orange-500/10 p-3">
        <p className="text-sm text-orange-200">
          <span className="font-semibold">⚠️ Annulation programmée</span>
          <br />
          Votre abonnement sera annulé le {formattedDate}. Vous conserverez l'accès jusqu'à cette date.
        </p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {confirmed && !error && (
        <div className="mb-3 rounded-lg border border-yellow-400/40 bg-yellow-500/10 p-3 text-sm text-yellow-200">
          <p className="mb-2">
            ⚠️ Êtes-vous sûr de vouloir annuler votre abonnement ?
          </p>
          <p className="mb-2">
            Vous conserverez l'accès jusqu'à la fin de la période déjà payée. 
            L'abonnement ne sera pas renouvelé automatiquement.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="rounded-lg px-4 py-2 text-sm font-semibold bg-white/5 border border-white/20 text-white/70 hover:bg-white/10 hover:text-white/80 transition-colors disabled:opacity-50"
            >
              {loading ? 'Annulation...' : 'Confirmer l\'annulation'}
            </button>
            <button
              onClick={() => {
                setConfirmed(false);
                setError(null);
              }}
              disabled={loading}
              className="rounded-lg px-4 py-2 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white border border-red-400/50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
      {!confirmed && (
        <button
          onClick={handleCancel}
          disabled={loading}
          className={className}
        >
          {loading ? 'Chargement...' : children}
        </button>
      )}
    </div>
  );
}

