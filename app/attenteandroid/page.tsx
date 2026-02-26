"use client";

import { useState } from "react";
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react";

export default function AttenteAndroidPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const isValidEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Basic validation
        if (!email.trim() || !isValidEmail(email)) {
            setError("Veuillez entrer une adresse email valide.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("/api/attenteandroid", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email: email.trim() }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Une erreur est survenue.");
            } else {
                setSuccess(true);
            }
        } catch (err) {
            setError("Erreur de connexion serveur.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="relative min-h-screen flex flex-col items-center justify-center text-white px-6 overflow-hidden bg-theme-page">
                {/* Logo */}
                <div className="absolute top-8 sm:top-12 left-0 right-0 z-20 flex justify-center pointer-events-none">
                    <img
                        src="/images/Logo sans fond.png"
                        alt="PadelXP Logo"
                        className="w-24 sm:w-32 h-auto object-contain opacity-90 drop-shadow-2xl"
                    />
                </div>

                <div className="relative z-10 w-full max-w-sm mx-auto p-6 text-center animate-in fade-in zoom-in duration-300 mt-12">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-green-500/30">
                        <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-green-400" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">Tu es sur la liste !</h2>
                    <p className="text-white/70 mb-8 text-base sm:text-lg font-light leading-relaxed">
                        Merci pour ton inscription. Tu seras prévenu dès que l'application Android sera disponible, et tu recevras ta récompense !
                    </p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="text-[#0066FF] hover:text-[#0055DD] transition-colors font-medium flex items-center justify-center gap-2 mx-auto group"
                    >
                        <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                        Retour à l'accueil
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center text-white px-6 py-12 overflow-y-auto bg-theme-page">
            {/* Background gradient (optional, for depth) */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/80 z-0 pointer-events-none" />

            {/* Logo placed above the form */}
            <div className="absolute top-8 sm:top-12 left-0 right-0 z-20 flex justify-center pointer-events-none">
                <img
                    src="/images/Logo sans fond.png"
                    alt="PadelXP Logo"
                    className="w-28 sm:w-32 md:w-40 h-auto object-contain drop-shadow-2xl"
                />
            </div>

            {/* Form Container */}
            <div className="relative z-50 w-full max-w-sm mx-auto mt-16 sm:mt-20">

                {/* Informational Text Above Form */}
                <p className="text-center text-xs sm:text-sm md:text-base text-white/90 font-medium mb-6 sm:mb-8 leading-relaxed max-w-[280px] sm:max-w-xs mx-auto drop-shadow-md">
                    Inscris-toi sur la liste d'attente android pour avoir une récompense à ton arrivée sur l'application !
                </p>

                <div className="rounded-2xl bg-black/40 border border-white/10 p-5 sm:p-6 backdrop-blur-md shadow-2xl">
                    {error && (
                        <div className="rounded-xl bg-red-500/20 border border-red-500/30 px-3 sm:px-4 py-2 sm:py-3 text-[13px] sm:text-sm text-white mb-5 flex items-start gap-3">
                            <div className="mt-0.5">⚠️</div>
                            <p>{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] sm:text-xs font-bold text-white ml-3 tracking-wide uppercase">
                                Email
                            </label>
                            <input
                                type="email"
                                required
                                placeholder="exemple@email.com"
                                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all font-medium text-sm sm:text-base"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                                disabled={loading}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !email}
                            className="w-full rounded-2xl py-3.5 sm:py-4 font-bold text-white text-sm sm:text-md uppercase tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 mt-2 sm:mt-4 shadow-lg shadow-blue-600/20"
                            style={{
                                background: "linear-gradient(135deg, #0066FF, #0044AA)",
                            }}
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Envoyer
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
