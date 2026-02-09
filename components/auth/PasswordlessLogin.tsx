"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Mail, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import SocialLoginButtons from "./SocialLoginButtons";

type Step = "email" | "otp";

export default function PasswordlessLogin() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("email");
    const [email, setEmail] = useState("");

    // OTP
    const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
    const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // UI state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(0);

    // Validation email
    const isValidEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // Cooldown timer
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    // Envoi du code OTP
    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email.trim() || !isValidEmail(email)) {
            setError("Veuillez entrer une adresse email valide.");
            return;
        }

        setLoading(true);

        try {
            const supabase = createClient();
            const { error: otpError } = await supabase.auth.signInWithOtp({
                email: email.trim().toLowerCase(),
                options: {
                    shouldCreateUser: false, // On ne crée pas de compte ici, c'est le login
                },
            });

            if (otpError) {
                // Si l'utilisateur n'existe pas, Supabase peut renvoyer une erreur ou rien selon la config.
                // Ici on assume que signInWithOtp échoue si shouldCreateUser est false et que l'user n'existe pas.
                // Note: Par défaut Supabase ne révèle pas si l'utilisateur existe ou non pour sécurité.
                // Si l'envoi échoue vraiment, on affiche l'erreur.
                console.error("Erreur OTP:", otpError);
                setError(otpError.message || "Erreur lors de l'envoi du code.");
            } else {
                setStep("otp");
                setCooldown(60); // 60 secondes avant de pouvoir renvoyer
            }
        } catch (err: any) {
            setError(err.message || "Une erreur est survenue.");
        } finally {
            setLoading(false);
        }
    };

    // Vérification du code OTP
    const handleVerifyOtp = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        const code = otpCode.join("");
        if (code.length !== 6) return;

        setLoading(true);
        setError(null);

        try {
            const supabase = createClient();
            const { data, error: verifyError } = await supabase.auth.verifyOtp({
                email: email.trim().toLowerCase(),
                token: code,
                type: "email",
            });

            if (verifyError) {
                setError("Code invalide ou expiré.");
                setLoading(false);
                return;
            }

            if (data.session) {
                // Connexion réussie -> Redirection
                router.refresh();
                router.push("/home");
            } else {
                setError("Erreur de session.");
                setLoading(false);
            }
        } catch (err: any) {
            setError(err.message || "Erreur lors de la vérification.");
            setLoading(false);
        }
    };

    // Gestion des inputs OTP
    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otpCode];
        newOtp[index] = value;
        setOtpCode(newOtp);

        // Auto-focus next
        if (value && index < 5) {
            otpInputRefs.current[index + 1]?.focus();
        }

        // Auto-submit si complet
        if (newOtp.every(digit => digit !== "") && index === 5) {
            // Petit délai pour laisser l'état se mettre à jour
            setTimeout(() => {
                const code = newOtp.join("");
                // Appel manuel car state peut ne pas être à jour dans handleVerifyOtp closure immédiate
                // On passe par un useEffect ou on appelle direct avec les valeurs
                verifyOtpDirect(code);
            }, 100);
        }
    };

    // Version directe pour l'auto-submit
    const verifyOtpDirect = async (code: string) => {
        setLoading(true);
        setError(null);

        try {
            const supabase = createClient();
            const { data, error: verifyError } = await supabase.auth.verifyOtp({
                email: email.trim().toLowerCase(),
                token: code,
                type: "email",
            });

            if (verifyError) {
                setError("Code invalide ou expiré.");
                setLoading(false);
                return;
            }

            if (data.session) {
                router.refresh();
                router.push("/home");
            }
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otpCode[index] && index > 0) {
            otpInputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text").slice(0, 6).replace(/\D/g, "");
        if (pastedData) {
            const newOtp = [...otpCode];
            pastedData.split("").forEach((char, i) => {
                if (i < 6) newOtp[i] = char;
            });
            setOtpCode(newOtp);
            if (pastedData.length === 6) {
                verifyOtpDirect(pastedData);
            } else {
                otpInputRefs.current[Math.min(5, pastedData.length)]?.focus();
            }
        }
    };

    return (
        <div className="w-full">
            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-sm">
                    {error}
                </div>
            )}

            {step === "email" ? (
                <div className="space-y-6">
                    <SocialLoginButtons />

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-[#1a1d2d] px-2 text-white/40">Ou avec email</span>
                        </div>
                    </div>

                    <form onSubmit={handleSendOtp} className="space-y-4">
                        <div>
                            <label className="block text-xs text-white/70 mb-1.5 font-medium ml-1">
                                Email
                            </label>
                            <div className="relative">
                                <input
                                    type="email"
                                    required
                                    placeholder="thomas@exemple.com"
                                    className="w-full rounded-xl bg-white/5 border border-white/10 pl-10 pr-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-xl bg-[#0066FF] hover:bg-[#0055DD] text-white font-semibold text-sm transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    Recevoir le code <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>

                        <div className="mt-4 text-center text-sm text-white/70">
                            Pas encore membre ?{" "}
                            <Link href="/player/signup" className="underline hover:text-white transition-colors">
                                S'inscrire
                            </Link>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="text-center space-y-2">
                        <div className="text-sm text-white/60">
                            Code envoyé à <span className="text-white font-medium">{email}</span>
                        </div>
                        <button
                            onClick={() => setStep("email")}
                            className="text-xs text-[#0066FF] hover:underline"
                        >
                            Modifier l'email
                        </button>
                    </div>

                    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                        {otpCode.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => { otpInputRefs.current[index] = el }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleOtpChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                className="w-10 h-12 rounded-lg bg-white/5 border border-white/10 text-center text-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#0066FF] transition-all caret-transparent"
                            />
                        ))}
                    </div>

                    <button
                        onClick={(e) => handleVerifyOtp(e)}
                        disabled={loading || otpCode.some(d => !d)}
                        className="w-full py-3 rounded-xl bg-[#0066FF] hover:bg-[#0055DD] text-white font-semibold text-sm transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            "Se connecter"
                        )}
                    </button>

                    <div className="text-center">
                        {cooldown > 0 ? (
                            <span className="text-xs text-white/40">
                                Renvoyer le code dans {cooldown}s
                            </span>
                        ) : (
                            <button
                                onClick={handleSendOtp}
                                className="text-xs text-white/60 hover:text-white underline transition-colors"
                            >
                                Renvoyer le code
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
