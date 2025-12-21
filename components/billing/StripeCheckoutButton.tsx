'use client';

import { useState } from 'react';
import { logger } from '@/lib/logger';

interface StripeCheckoutButtonProps {
  priceId: string;
  mode?: 'subscription' | 'payment';
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  onError?: (error: string) => void;
}

export default function StripeCheckoutButton({
  priceId,
  mode = 'subscription',
  disabled = false,
  className = '',
  children,
  onError,
}: StripeCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (!priceId) {
      onError?.('Price ID manquant');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          mode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Afficher l'erreur détaillée si disponible
        const errorMsg = data.error || 'Erreur lors de la création de la session de checkout';
        const details = data.details ? ` (${JSON.stringify(data.details)})` : '';
        throw new Error(errorMsg + details);
      }

      if (!data.url) {
        throw new Error('URL de checkout manquante');
      }

      // Rediriger vers Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error('Stripe checkout error:', errorMessage);
      onError?.(errorMessage);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={disabled || loading}
      className={className}
    >
      {loading ? 'Chargement...' : children}
    </button>
  );
}


