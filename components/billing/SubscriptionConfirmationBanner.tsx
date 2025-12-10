'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function SubscriptionConfirmationBannerContent() {
  const searchParams = useSearchParams();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const subscriptionUpdated = searchParams.get('subscription_updated');
    if (subscriptionUpdated === 'true') {
      setShow(true);
      // Masquer automatiquement après 10 secondes
      const timer = setTimeout(() => {
        setShow(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  if (!show) return null;

  return (
    <div className="mb-6 rounded-xl border border-emerald-400/50 bg-gradient-to-r from-emerald-500/20 via-green-500/10 to-emerald-500/20 p-4 sm:p-5 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
            <svg
              className="h-6 w-6 text-emerald-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-emerald-200 mb-1">
            ✅ Abonnement configuré avec succès !
          </h3>
          <p className="text-sm text-emerald-100/90 leading-relaxed">
            Votre méthode de paiement a été enregistrée. Votre essai gratuit se poursuit jusqu'à la fin de votre période d'essai. 
            Le premier prélèvement aura lieu automatiquement le lendemain de la fin de votre essai gratuit.
          </p>
        </div>
        <button
          onClick={() => setShow(false)}
          className="flex-shrink-0 text-emerald-300/70 hover:text-emerald-200 transition-colors"
          aria-label="Fermer"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function SubscriptionConfirmationBanner() {
  return (
    <Suspense fallback={null}>
      <SubscriptionConfirmationBannerContent />
    </Suspense>
  );
}

