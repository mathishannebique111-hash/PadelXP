'use client';

import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

interface StripeStatus {
    connected: boolean;
    details_submitted?: boolean;
    charges_enabled?: boolean;
    payouts_enabled?: boolean;
    reason?: string;
}

export default function StripeConnectCard() {
    const [status, setStatus] = useState<StripeStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/stripe/connect');
            const data = await res.json();
            setStatus(data);
        } catch (error) {
            console.error('Erreur récupération statut Stripe:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        setConnecting(true);
        try {
            const res = await fetch('/api/stripe/connect', { method: 'POST' });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert(data.error || 'Erreur lors de la connexion');
                setConnecting(false);
            }
        } catch (error) {
            console.error('Erreur connexion Stripe:', error);
            setConnecting(false);
        }
    };

    if (loading) {
        return (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-white/60 animate-spin" />
                    <span className="text-white/60">Chargement...</span>
                </div>
            </div>
        );
    }

    const isFullyConnected = status?.connected && status?.charges_enabled && status?.payouts_enabled;
    const isPartiallyConnected = status?.connected && status?.details_submitted && (!status?.charges_enabled || !status?.payouts_enabled);

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-purple-500/20">
                    <CreditCard className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Paiements en ligne</h3>
            </div>

            {isFullyConnected ? (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">Compte Stripe connecté</span>
                    </div>
                    <p className="text-white/60 text-sm">
                        Votre club peut recevoir des paiements en ligne. Les joueurs peuvent payer leur part de réservation directement.
                    </p>
                    <button
                        onClick={async () => {
                            try {
                                const res = await fetch('/api/stripe/connect/dashboard', { method: 'POST' });
                                const data = await res.json();
                                if (data.url) {
                                    window.open(data.url, '_blank');
                                } else {
                                    alert(data.error || 'Erreur lors de l\'accès au dashboard');
                                }
                            } catch (error) {
                                console.error('Erreur accès dashboard:', error);
                            }
                        }}
                        className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                    >
                        Accéder au tableau de bord Stripe
                        <ExternalLink className="w-4 h-4" />
                    </button>
                </div>
            ) : isPartiallyConnected ? (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-yellow-400">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-medium">Configuration incomplète</span>
                    </div>
                    <p className="text-white/60 text-sm">
                        Votre compte Stripe est en cours de vérification. Certaines fonctionnalités peuvent être limitées.
                    </p>
                    <button
                        onClick={handleConnect}
                        disabled={connecting}
                        className="mt-2 px-4 py-2 bg-yellow-500/20 text-yellow-300 rounded-xl font-medium hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
                    >
                        {connecting ? 'Redirection...' : 'Compléter la configuration'}
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-white/60 text-sm">
                        Connectez votre compte Stripe pour permettre aux joueurs de payer leur réservation en ligne. L'argent arrive directement sur votre compte.
                    </p>
                    <button
                        onClick={handleConnect}
                        disabled={connecting}
                        className="w-full mt-2 px-4 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {connecting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Redirection vers Stripe...
                            </>
                        ) : (
                            <>
                                Connecter avec Stripe
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
