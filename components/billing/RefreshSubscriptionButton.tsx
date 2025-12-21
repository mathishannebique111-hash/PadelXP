'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { logger } from '@/lib/logger';

interface RefreshSubscriptionButtonProps {
  sessionId?: string | null;
  variant?: 'success' | 'billing';
}

function RefreshSubscriptionButtonContent({ sessionId, variant = 'success' }: RefreshSubscriptionButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdFromUrl = searchParams?.get('session_id');

  const finalSessionId = sessionId || sessionIdFromUrl;

  const handleRefresh = async () => {
    setLoading(true);

    try {
      // Si on a un sessionId, utiliser la route verify-session
      // Sinon, utiliser la route sync-subscription qui vérifie les abonnements Stripe récents du club
      const endpoint = finalSessionId ? '/api/stripe/verify-session' : '/api/stripe/sync-subscription';
      const body = finalSessionId ? { sessionId: finalSessionId } : {};

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        const message = finalSessionId 
          ? 'Abonnement vérifié et mis à jour avec succès !'
          : 'Abonnement synchronisé avec succès ! Les modifications depuis le portail Stripe ont été prises en compte.';
        alert(message);
        // Rafraîchir la page pour voir les changements
        setTimeout(() => {
          router.refresh();
        }, 1000);
      } else {
        alert('Erreur lors de la synchronisation : ' + (data.error || 'Erreur inconnue'));
        setLoading(false);
      }
    } catch (error) {
      logger.error('Refresh error:', error);
      alert('Erreur lors de la synchronisation de l\'abonnement');
      setLoading(false);
    }
  };

  const className = variant === 'billing'
    ? "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-blue-500/20 border border-blue-400/50 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
    : "mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-blue-500/20 border border-blue-400/50 hover:bg-blue-500/30 transition-colors disabled:opacity-50";

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      className={className}
    >
      {loading 
        ? 'Synchronisation...' 
        : variant === 'billing' && !finalSessionId 
          ? '🔄 Synchroniser l\'abonnement' 
          : '🔄 Vérifier l\'abonnement'
      }
    </button>
  );
}

export default function RefreshSubscriptionButton({ sessionId, variant = 'success' }: RefreshSubscriptionButtonProps) {
  // Pour le variant 'billing', on a besoin de Suspense car on utilise useSearchParams
  if (variant === 'billing') {
    return (
      <Suspense fallback={
        <button
          disabled
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-blue-500/20 border border-blue-400/50 opacity-50"
        >
          Chargement...
        </button>
      }>
        <RefreshSubscriptionButtonContent sessionId={sessionId} variant={variant} />
      </Suspense>
    );
  }

  return <RefreshSubscriptionButtonContent sessionId={sessionId} variant={variant} />;
}
