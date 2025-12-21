'use client';

import { useState } from 'react';
import { logger } from '@/lib/logger';

interface StripePaymentButtonProps {
  priceId: string;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export default function StripePaymentButton({
  priceId,
  disabled = false,
  className = '',
  children = 'Payer par carte (Stripe)',
}: StripePaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    if (!priceId) {
      setError('Price ID manquant');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          mode: 'subscription',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création de la session de checkout');
      }

      if (!data.url) {
        throw new Error('URL de checkout manquante dans la réponse');
      }

      // Rediriger vers l'URL de checkout Stripe
      window.location.href = data.url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error('Stripe checkout error:', errorMessage);
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}
      <button
        onClick={handlePayment}
        disabled={disabled || loading || !priceId}
        className={className}
      >
        {loading ? 'Chargement...' : children}
      </button>
    </div>
  );
}





