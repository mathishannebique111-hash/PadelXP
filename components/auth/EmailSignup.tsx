"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
// AJOUT : Import MapPin
import { Mail, Gift, Loader2, ArrowRight, Lock, Eye, EyeOff } from "lucide-react";

interface Club {
    id: string;
    name: string;
    slug: string;
    code_invitation: string;
    logo_url?: string | null;
    city?: string | null;
}

export default function EmailSignup() {
    const router = useRouter();

    // Form Data
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [showReferralCode, setShowReferralCode] = useState(false);
    const [referralCode, setReferralCode] = useState("");

    // Referral Status
    const [referralCodeStatus, setReferralCodeStatus] = useState<{
        valid: boolean;
        error?: string;
        referrerName?: string;
    } | null>(null);
    const [referralCodeValidating, setReferralCodeValidating] = useState(false);

    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Email Validation
    const isValidEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // Referral Validation
    const validateReferralCode = async (code: string) => {
        if (!code || code.trim().length === 0) {
            setReferralCodeStatus(null);
            return;
        }

        setReferralCodeValidating(true);
        try {
            const response = await fetch("/api/referrals/validate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: code.trim() }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: "Erreur" }));
                setReferralCodeStatus({
                    valid: false,
                    error: errorData.error || "Code invalide",
                });
                return;
            }

            const data = await response.json();
            setReferralCodeStatus({
                valid: data.valid || false,
                error: data.error || undefined,
                referrerName: data.referrerName || undefined,
            });
        } catch {
            setReferralCodeStatus({
                valid: false,
                error: "Erreur lors de la validation",
            });
        } finally {
            setReferralCodeValidating(false);
        }
    };

    const handleReferralCodeChange = (value: string) => {
        setReferralCode(value);
        setReferralCodeStatus(null);
        if (value.trim().length > 0) {
            setTimeout(() => validateReferralCode(value), 500);
        }
    };

    // Signup Handler
    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email.trim() || !isValidEmail(email)) {
            setError("Veuillez entrer une adresse email valide.");
            return;
        }

        if (password.length < 6) {
            setError("Le mot de passe doit contenir au moins 6 caractères.");
            return;
        }

        if (referralCode.trim().length > 0 && referralCodeStatus && !referralCodeStatus.valid) {
            setError(referralCodeStatus.error || "Code de parrainage invalide");
            return;
        }

        setLoading(true);

        try {
            // 1. Check if email exists
            const checkResponse = await fetch("/api/auth/check-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim() }),
            });

            if (checkResponse.ok) {
                const { exists } = await checkResponse.json();
                if (exists) {
                    setError("Un compte est déjà associé à cette adresse email. Veuillez vous connecter.");
                    setLoading(false);
                    return;
                }
            }

            // 2. SignUp with Supabase
            const supabase = createClient();
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: email.trim().toLowerCase(),
                password: password,
                options: {
                    data: {
                        club_slug: null,
                        referral_code: referralCode.trim() || null,
                        // Les autres champs (nom, prénom, code postal) seront demandés à l'onboarding
                    },
                },
            });

            if (signUpError) {
                console.error("Erreur détaillée Supabase:", signUpError);
                console.error("Message d'erreur:", signUpError.message);
                console.error("Code d'erreur:", signUpError.status);

                // Si l'utilisateur existe déjà
                if (signUpError.message.includes("User already registered")) {
                    setError("Un compte existe déjà avec cet email.");
                } else if (signUpError.message.includes("Database error saving new user")) {
                    // Souvent lié à un trigger qui échoue
                    setError("Erreur technique lors de la création du profil (Database error). Vérifiez la console.");
                } else {
                    setError(signUpError.message);
                }
                throw signUpError;
            }

            // 3. Redirect to onboarding (no club attachment needed)
            if (data.session) {
                // Redirect to onboarding
                router.replace("/player/onboarding");

            } else {
                // Email confirmation required
                setSuccessMessage("Compte créé ! Veuillez vérifier vos emails pour confirmer votre inscription.");
            }

        } catch (e: any) {
            setError(e?.message || "Une erreur est survenue lors de l'inscription.");
        } finally {
            setLoading(false);
        }
    };

    if (successMessage) {
        return (
            <div className="w-full max-w-md mx-auto text-center p-6 animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-green-500/30">
                    <Mail className="w-10 h-10 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Vérifiez vos emails</h2>
                <p className="text-white/70 mb-8 text-lg font-light leading-relaxed">{successMessage}</p>
                <button
                    onClick={() => router.push("/login")}
                    className="text-[#0066FF] hover:text-[#0055DD] transition-colors font-medium flex items-center justify-center gap-2 mx-auto group"
                >
                    <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                    Retour à la connexion
                </button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-sm mx-auto px-4 mt-8 relative z-10">
            <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-white mb-2 tracking-tight drop-shadow-md">Créer un compte</h1>
                <p className="text-white/80 font-medium">Rejoignez la communauté PadelXP</p>
            </div>

            <div className="rounded-2xl bg-black/40 border border-white/10 p-6 backdrop-blur-md shadow-2xl">

                {error && (
                    <div className="rounded-xl bg-red-500/20 border border-red-500/30 px-4 py-3 text-sm text-white mb-5 flex items-start gap-3">
                        <div className="mt-0.5">⚠️</div>
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSignup} className="space-y-5">

                    {/* Email */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-white ml-3 tracking-wide">
                            EMAIL
                        </label>
                        <input
                            type="email"
                            required
                            placeholder="exemple@email.com"
                            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all font-medium"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                        />
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-white ml-3 tracking-wide">
                            MOT DE PASSE
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                placeholder="6 caractères min."
                                minLength={6}
                                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all font-medium pr-10"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors p-1"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Referral Code */}
                    <div className="pt-2">
                        {showReferralCode ? (
                            <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                                <div className="flex justify-between items-center ml-3">
                                    <label className="text-xs font-bold text-white tracking-wide">
                                        CODE PARRAINAGE
                                    </label>
                                    <button type="button" onClick={() => setShowReferralCode(false)} className="text-white/60 hover:text-white transition-colors text-xs font-medium">Masquer</button>
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="CODE123"
                                        className={`w-full bg-white/10 border rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none transition-all uppercase tracking-widest font-mono font-medium ${referralCodeStatus?.valid
                                            ? "border-green-400 focus:border-green-400 text-green-300 bg-green-900/20"
                                            : referralCodeStatus?.valid === false
                                                ? "border-red-400 focus:border-red-400 text-red-300 bg-red-900/20"
                                                : "border-white/10 focus:border-white/40 focus:bg-white/20"
                                            }`}
                                        value={referralCode}
                                        onChange={(e) => handleReferralCodeChange(e.target.value.toUpperCase())}
                                        maxLength={8}
                                    />
                                    {referralCodeStatus?.valid && (
                                        <Gift className="w-5 h-5 text-green-400 absolute right-4 top-1/2 -translate-y-1/2 drop-shadow-glow" />
                                    )}
                                </div>
                                {referralCodeStatus?.valid && referralCodeStatus.referrerName && (
                                    <p className="text-xs text-green-300 mt-1 ml-3 flex items-center gap-1 font-medium">
                                        ✓ Parrain : <span className="font-bold text-white">{referralCodeStatus.referrerName}</span>
                                    </p>
                                )}
                                {referralCodeStatus?.valid === false && (
                                    <p className="text-xs text-red-300 mt-1 ml-3 font-medium">{referralCodeStatus.error}</p>
                                )}
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowReferralCode(true)}
                                className="text-xs text-white/70 hover:text-white transition-colors flex items-center gap-2 ml-1 p-2 rounded-lg hover:bg-white/5 active:scale-95 duration-200 font-medium"
                            >
                                <Gift className="w-4 h-4 text-white" />
                                J'ai un code de parrainage
                            </button>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !email || !password || password.length < 6}
                        className="w-full rounded-2xl py-4 font-bold text-white text-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 mt-4 shadow-lg shadow-blue-600/20"
                        style={{
                            background: "linear-gradient(135deg, #0066FF, #0044AA)",
                        }}
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                S'inscrire <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>
            </div>

            <p className="text-center text-sm text-white/40 mt-5">
                Déjà membre ?{" "}
                <a href="/player/login" className="text-white hover:text-[#0066FF] transition-colors font-medium">
                    Se connecter
                </a>
            </p>
        </div>
    );
}
