'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

interface NewSubscriptionCheckoutButtonProps {
  plan: 'monthly' | 'annual';
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  onError?: (error: string) => void;
}

export default function NewSubscriptionCheckoutButton({
  plan,
  disabled = false,
  className = '',
  children,
  onError,
}: NewSubscriptionCheckoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || 'Erreur lors de la création de l\'abonnement';
        throw new Error(errorMsg);
      }

      // Rediriger vers la page de checkout avec Stripe Elements
      router.push(`/dashboard/facturation/checkout?subscription_id=${data.subscriptionId}&plan=${plan}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error('Subscription creation error:', errorMessage);
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

