'use client';

import { useEffect, useState, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { formatPlanName, formatDate, calculateFirstPaymentDate, getMonthlyPrice, getTotalPrice, type PlanType } from '@/lib/subscription';
import PageTitle from '../../PageTitle';

// Récupérer la clé publique Stripe (supporte les deux noms de variables)
const stripePublishableKey = 
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 
  process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || 
  '';

if (!stripePublishableKey) {
  console.error('[Checkout] Stripe publishable key is missing. Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY or NEXT_PUBLIC_STRIPE_PUBLIC_KEY in your .env.local file.');
}

const stripePromise = loadStripe(stripePublishableKey);

function CheckoutForm({ subscriptionId, plan, trialEndDate, clientSecret, isSetupIntent = false }: {
  subscriptionId: string;
  plan: PlanType;
  trialEndDate: string;
  clientSecret: string;
  isSetupIntent?: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'Erreur lors de la soumission du formulaire');
        setLoading(false);
        return;
      }

      // Si c'est un SetupIntent, utiliser confirmSetup au lieu de confirmPayment
      if (isSetupIntent) {
        const { error: confirmError } = await stripe.confirmSetup({
          elements,
          clientSecret,
          confirmParams: {
            return_url: `${window.location.origin}/dashboard/facturation?subscription_updated=true`,
          },
          redirect: 'if_required',
        });

        if (confirmError) {
          setError(confirmError.message || 'Erreur lors de la configuration du paiement');
          setLoading(false);
        } else {
          // Setup confirmé avec succès
          router.push('/dashboard/facturation?subscription_updated=true');
        }
      } else {
        const { error: confirmError } = await stripe.confirmPayment({
          elements,
          clientSecret,
          confirmParams: {
            return_url: `${window.location.origin}/dashboard/facturation?subscription_updated=true`,
          },
          redirect: 'if_required',
        });

        if (confirmError) {
          setError(confirmError.message || 'Erreur lors de la confirmation du paiement');
          setLoading(false);
        } else {
          // Paiement confirmé avec succès
          router.push('/dashboard/facturation?subscription_updated=true');
        }
      }
    } catch (err) {
      console.error('Error confirming payment/setup:', err);
      setError('Une erreur inattendue s\'est produite');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      {error && (
        <div className="bg-red-500/20 border border-red-400/50 rounded-lg p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Traitement...' : 'Confirmer et continuer l\'essai gratuit'}
      </button>

      <p className="text-white/60 text-sm text-center">
        Votre carte ne sera débitée qu'à la fin de votre essai gratuit
      </p>
    </form>
  );
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<{
    subscriptionId: string;
    plan: PlanType;
    trialEndDate: string;
    clientSecret: string;
    isSetupIntent?: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const subscriptionId = searchParams.get('subscription_id');
    const plan = searchParams.get('plan') as PlanType;

    if (!subscriptionId || !plan) {
      setError('Paramètres manquants');
      setLoading(false);
      return;
    }

    // Récupérer les informations de la subscription depuis l'API
    const fetchSubscriptionData = async () => {
      try {
        const response = await fetch(`/api/subscription/get?subscription_id=${subscriptionId}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Erreur lors de la récupération des informations');
          setLoading(false);
          return;
        }

        setSubscriptionData({
          subscriptionId,
          plan,
          trialEndDate: data.trialEndDate,
          clientSecret: data.clientSecret,
          isSetupIntent: data.isSetupIntent || false,
        });
        setLoading(false);
      } catch (err) {
        console.error('Error fetching subscription data:', err);
        setError('Erreur lors de la récupération des informations');
        setLoading(false);
      }
    };

    fetchSubscriptionData();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }

  if (error || !subscriptionData) {
    return (
      <div className="bg-red-500/20 border border-red-400/50 rounded-xl p-6">
        <p className="text-red-300">{error || 'Erreur lors du chargement'}</p>
        <button
          onClick={() => router.push('/dashboard/facturation')}
          className="mt-4 px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all duration-200"
        >
          Retour
        </button>
      </div>
    );
  }

  const { subscriptionId, plan, trialEndDate, clientSecret, isSetupIntent } = subscriptionData;
  const firstPaymentDate = calculateFirstPaymentDate(trialEndDate);
  const daysRemaining = Math.ceil((new Date(trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const appearance = {
    theme: 'night' as const,
    variables: {
      colorPrimary: '#10b981',
      colorBackground: '#111827',
      colorText: '#ffffff',
      colorTextSecondary: '#ffffff',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
    rules: {
      '.InputLabel, .Label, .Label *': { color: '#ffffff' },
      '.InputLabel--optional, .InputLabel.InputLabel--optional': { color: '#ffffff' },
      '.Optional, .InputLabel .Optional, .Label .Optional, .Input .Optional, .Input * .Optional, .Badge, .Badge *': {
        color: '#111827',
        backgroundColor: '#ffffff',
        borderColor: '#ffffff',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderRadius: '10px',
        padding: '4px 12px',
        fontSize: '14px',
        fontWeight: '700',
        display: 'inline-flex',
        alignItems: 'center',
        lineHeight: '1.1',
      },
    },
  };

  const options = {
    clientSecret,
    appearance,
  };

  return (
    <div className="relative">
      {/* Background accent layers */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.08),transparent_60%)]" />
        <div className="absolute -top-24 -right-24 h-[420px] w-[420px] rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-28 -left-28 h-[360px] w-[360px] rounded-full bg-indigo-500/20 blur-3xl" />
      </div>

      <div className="relative z-10 space-y-6">
        <PageTitle title="Finaliser votre abonnement" subtitle="Ajoutez votre méthode de paiement" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Résumé */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Résumé de votre abonnement</h3>
            
            <div className="space-y-4">
              <div>
                <div className="text-white/60 text-sm mb-1">Plan sélectionné</div>
                <div className="text-white font-semibold text-lg">{formatPlanName(plan)}</div>
              </div>

              <div>
                <div className="text-white/60 text-sm mb-1">Prix</div>
                <div className="text-white font-semibold text-lg">
                  {getMonthlyPrice(plan)}€/mois
                  {plan !== 'monthly' && (
                    <span className="text-white/60 text-sm ml-2">
                      ({getTotalPrice(plan)}€ {plan === 'quarterly' ? 'tous les 3 mois' : 'par an'})
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Image
                    src="/images/horloge.png"
                    alt="Icône horloge"
                    width={24}
                    height={24}
                    className="h-6 w-6"
                  />
                  <div>
                    <div className="text-white/60 text-sm">Jours d'essai restants</div>
                    <div className="text-white font-bold text-xl">{Math.max(0, daysRemaining)} jours</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <Image
                    src="/images/carte%20bancaire.png"
                    alt="Icône carte bancaire"
                    width={24}
                    height={24}
                    className="h-6 w-6"
                  />
                  <div>
                    <div className="text-white/60 text-sm">Premier paiement le</div>
                    <div className="text-white font-bold text-lg">
                      {firstPaymentDate ? formatDate(firstPaymentDate) : '—'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-emerald-500/20 border border-emerald-400/50 rounded-lg">
              <p className="text-emerald-200 text-sm text-center">
                ✅ Votre carte ne sera débitée qu'à la fin de votre essai gratuit
              </p>
            </div>
          </div>

          {/* Formulaire de paiement */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Méthode de paiement</h3>
            
            {!stripePublishableKey ? (
              <div className="bg-red-500/20 border border-red-400/50 rounded-lg p-4 text-red-300">
                <p className="font-semibold mb-2">Erreur de configuration</p>
                <p className="text-sm">
                  La clé publique Stripe n'est pas configurée. Veuillez ajouter{' '}
                  <code className="bg-red-900/50 px-2 py-1 rounded">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> ou{' '}
                  <code className="bg-red-900/50 px-2 py-1 rounded">NEXT_PUBLIC_STRIPE_PUBLIC_KEY</code> dans votre fichier <code className="bg-red-900/50 px-2 py-1 rounded">.env.local</code>.
                </p>
              </div>
            ) : (
              <Elements stripe={stripePromise} options={options} key={`${clientSecret}-appearance-v3`}>
                <CheckoutForm
                  subscriptionId={subscriptionId}
                  plan={plan}
                  trialEndDate={trialEndDate}
                  clientSecret={clientSecret}
                  isSetupIntent={isSetupIntent}
                />
              </Elements>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Chargement...</div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}

