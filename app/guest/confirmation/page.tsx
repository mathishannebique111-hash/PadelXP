'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

function ConfirmationContent() {
    const searchParams = useSearchParams();
    const guestId = searchParams.get('id');
    const router = useRouter();

    const [marketingConsent, setMarketingConsent] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!guestId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
                <h1 className="text-xl font-bold text-red-500 mb-2">Lien invalide</h1>
                <p className="text-gray-600">L'identifiant du match est manquant.</p>
                <Link href="/" className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Retour à l'accueil
                </Link>
            </div>
        );
    }

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);

        try {
            const response = await fetch('/api/guests/consent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    guestId,
                    consent: marketingConsent,
                }),
            });

            if (!response.ok) {
                throw new Error('Une erreur est survenue');
            }

            setSubmitted(true);
        } catch (err) {
            setError("Impossible d'enregistrer votre choix. Veuillez réessayer.");
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-lg border border-gray-100 text-center">
                <div className="mb-4 flex justify-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">C'est noté !</h2>
                <p className="text-gray-600 mb-6">
                    Merci d'avoir confirmé le match. {marketingConsent ? "Vous recevrez les actualités du club." : "Vos préférences de communication ont été enregistrées."}
                </p>

                <div className="pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-500 mb-4">Envie de suivre vos propres statistiques ?</p>
                    <Link
                        href="/clubs/login"
                        className="inline-block w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                    >
                        Créer mon compte PadelXP
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Match confirmé 🎾</h1>
                <p className="text-gray-600 mt-2">Votre participation a bien été enregistrée.</p>
            </div>

            <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <div className="relative flex items-center mt-1">
                            <input
                                type="checkbox"
                                className="w-5 h-5 border-gray-300 rounded text-blue-600 focus:ring-blue-500"
                                checked={marketingConsent}
                                onChange={(e) => setMarketingConsent(e.target.checked)}
                            />
                        </div>
                        <div className="flex-1">
                            <span className="font-medium text-gray-900">Rester informé</span>
                            <p className="text-sm text-gray-500 mt-1">
                                J'accepte de recevoir des emails d'actualité et les offres du club.
                            </p>
                        </div>
                    </label>
                </div>

                {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
                        {error}
                    </div>
                )}

                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full px-4 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {submitting ? 'Enregistrement...' : 'Valider mes préférences'}
                </button>
            </div>
        </div>
    );
}

export default function GuestConfirmationPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <Suspense fallback={<div>Chargement...</div>}>
                <ConfirmationContent />
            </Suspense>
        </div>
    );
}
