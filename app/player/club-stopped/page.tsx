'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Check, X, CheckCircle, Loader2 } from 'lucide-react';

export default function ClubStoppedPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasResponded, setHasResponded] = useState(false);
    const [selectedResponse, setSelectedResponse] = useState<'yes' | 'no' | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Vérifier si l'utilisateur a déjà répondu
    useEffect(() => {
        const checkExistingResponse = async () => {
            try {
                const res = await fetch('/api/player/club-stopped-survey');
                if (res.ok) {
                    const data = await res.json();
                    if (data.hasResponded) {
                        setHasResponded(true);
                        setSelectedResponse(data.response);
                    }
                }
            } catch (error) {
                console.error('Error checking survey status:', error);
            } finally {
                setIsLoading(false);
            }
        };

        checkExistingResponse();
    }, []);

    const handleSubmit = async (response: 'yes' | 'no') => {
        setIsSubmitting(true);
        setSelectedResponse(response);

        try {
            const res = await fetch('/api/player/club-stopped-survey', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ response }),
            });

            if (res.ok) {
                setHasResponded(true);
            } else {
                console.error('Error submitting response');
                setSelectedResponse(null);
            }
        } catch (error) {
            console.error('Error submitting response:', error);
            setSelectedResponse(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] to-[#1a1a2e] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] to-[#1a1a2e] flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Logo PadelXP */}
                <div className="text-center mb-8">
                    <img
                        src="/images/padelxp-logo.png"
                        alt="PadelXP"
                        className="h-12 mx-auto mb-4"
                    />
                </div>

                {/* Card principale */}
                <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl border border-white/10 p-8 shadow-2xl">
                    {/* Icône */}
                    <div className="flex justify-center mb-6">
                        <div className="p-4 rounded-full bg-orange-500/10 border border-orange-400/20">
                            <Building2 className="w-12 h-12 text-orange-400" />
                        </div>
                    </div>

                    {!hasResponded ? (
                        <>
                            {/* Question */}
                            <h1 className="text-xl font-bold text-white text-center mb-4">
                                Votre club n'a pas souhaité continuer avec PadelXP pour le moment
                            </h1>

                            <p className="text-white/70 text-center mb-8">
                                Vous pensez qu'il devrait continuer ?
                            </p>

                            {/* Boutons de réponse */}
                            <div className="flex gap-4">
                                <button
                                    onClick={() => handleSubmit('yes')}
                                    disabled={isSubmitting}
                                    className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-bold text-white transition-all hover:scale-105 active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-500 to-green-600 border border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                                >
                                    {isSubmitting && selectedResponse === 'yes' ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Check className="w-5 h-5" />
                                    )}
                                    Oui
                                </button>

                                <button
                                    onClick={() => handleSubmit('no')}
                                    disabled={isSubmitting}
                                    className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-bold text-white transition-all hover:scale-105 active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-rose-500 to-red-600 border border-rose-400/50 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                                >
                                    {isSubmitting && selectedResponse === 'no' ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <X className="w-5 h-5" />
                                    )}
                                    Non
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Message de confirmation */}
                            <div className="text-center">
                                <div className="flex justify-center mb-4">
                                    <CheckCircle className="w-16 h-16 text-emerald-400" />
                                </div>

                                <h2 className="text-xl font-bold text-white mb-3">
                                    Merci pour votre réponse !
                                </h2>

                                <p className="text-white/70 mb-6">
                                    {selectedResponse === 'yes'
                                        ? "Nous transmettons votre avis à votre club. Peut-être reviendra-t-il bientôt !"
                                        : "Nous avons bien noté votre réponse. Merci pour votre honnêteté."
                                    }
                                </p>

                                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                    <p className="text-sm text-white/60">
                                        Si votre club décide de reprendre PadelXP, vous pourrez vous reconnecter normalement.
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-white/40 text-sm mt-6">
                    © {new Date().getFullYear()} PadelXP. Tous droits réservés.
                </p>
            </div>
        </div>
    );
}
