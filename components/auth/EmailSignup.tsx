"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ClubSelector from "./ClubSelector";
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
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [selectedClub, setSelectedClub] = useState<Club | null>(null);
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

        if (!firstName.trim() || !lastName.trim()) {
            setError("Veuillez renseigner votre nom et prénom.");
            return;
        }

        if (!email.trim() || !isValidEmail(email)) {
            setError("Veuillez entrer une adresse email valide.");
            return;
        }

        if (password.length < 6) {
            setError("Le mot de passe doit contenir au moins 6 caractères.");
            return;
        }

        if (!selectedClub) {
            setError("Veuillez sélectionner votre club.");
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
                        first_name: firstName.trim(),
                        last_name: lastName.trim(),
                        full_name: `${firstName.trim()} ${lastName.trim()}`,
                        club_slug: selectedClub.slug,
                        referral_code: referralCode.trim() || null,
                    },
                },
            });

            if (signUpError) {
                throw new Error(signUpError.message);
            }

            // 3. Attach Club (If session exists immediately)
            if (data.session) {
                const attachResponse = await fetch("/api/player/attach", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${data.session.access_token}`,
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        slug: selectedClub.slug,
                        email: email.trim().toLowerCase(),
                        referralCode: referralCode.trim() || undefined,
                    }),
                });

                const attachData = await attachResponse.json().catch(() => ({}));

                if (attachData.referralProcessed) {
                    sessionStorage.setItem("referral_reward_received", "true");
                }

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
            <div className="w-full max-w-md mx-auto text-center p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Vérifiez vos emails</h2>
                <p className="text-white/70 mb-6">{successMessage}</p>
                <button
                    onClick={() => router.push("/login")}
                    className="text-[#0066FF] hover:underline"
                >
                    Retour à la connexion
                </button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto">
            <div className="rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md shadow-xl p-6 transition-all duration-300">

                <div className="text-center mb-6">
                    <h1 className="text-2xl font-extrabold text-white mb-2">Créer mon compte</h1>
                    <p className="text-sm text-white/60">Rejoignez la communauté PadelXP</p>
                </div>

                {error && (
                    <div className="rounded-lg border border-red-400/50 bg-red-500/10 px-4 py-3 text-sm text-red-400 mb-4 animate-in fade-in duration-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSignup} className="space-y-4">

                    {/* Nom et Prénom */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-white/70 mb-1.5 font-medium ml-1">
                                Prénom <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Thomas"
                                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-white/70 mb-1.5 font-medium ml-1">
                                Nom <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Dupont"
                                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-xs text-white/70 mb-1.5 font-medium ml-1">
                            Email <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            <input
                                type="email"
                                required
                                placeholder="exemple@email.com"
                                className="w-full rounded-xl bg-white/5 border border-white/10 pl-10 pr-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-xs text-white/70 mb-1.5 font-medium ml-1">
                            Mot de passe <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                placeholder="••••••••"
                                minLength={6}
                                className="w-full rounded-xl bg-white/5 border border-white/10 pl-10 pr-10 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Club Selector */}
                    <ClubSelector
                        onSelect={setSelectedClub}
                        selectedClub={selectedClub}
                    />

                    {/* Referral Code */}
                    {showReferralCode ? (
                        <div className="space-y-1.5 animate-in slide-in-from-top duration-200">
                            <label className="block text-xs text-white/70 font-medium ml-1">
                                Code de parrainage
                            </label>
                            <div className="relative">
                                <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                <input
                                    type="text"
                                    placeholder="CODE123"
                                    className={`w-full rounded-xl bg-white/5 border pl-10 pr-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 transition-all ${referralCodeStatus?.valid
                                        ? "border-green-500/50 focus:ring-green-500"
                                        : referralCodeStatus?.valid === false
                                            ? "border-red-500/50 focus:ring-red-500"
                                            : "border-white/10 focus:ring-[#0066FF]"
                                        }`}
                                    value={referralCode}
                                    onChange={(e) => handleReferralCodeChange(e.target.value.toUpperCase())}
                                    maxLength={8}
                                />
                            </div>
                            {referralCodeValidating && (
                                <p className="text-xs text-white/50 ml-1">Vérification...</p>
                            )}
                            {referralCodeStatus?.valid && referralCodeStatus.referrerName && (
                                <p className="text-xs text-green-400 ml-1">
                                    ✓ Parrain : {referralCodeStatus.referrerName}
                                </p>
                            )}
                            {referralCodeStatus?.valid === false && referralCodeStatus.error && (
                                <p className="text-xs text-red-400 ml-1">{referralCodeStatus.error}</p>
                            )}
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setShowReferralCode(true)}
                            className="text-xs text-white/50 hover:text-white/80 underline transition-colors ml-1"
                        >
                            J'ai un code de parrainage
                        </button>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !email || !password || !selectedClub || !firstName || !lastName}
                        className="w-full rounded-xl px-4 py-3.5 font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 mt-6"
                        style={{
                            background: "linear-gradient(135deg, #0066FF, #003D99)",
                            boxShadow: "0 0 20px rgba(0,102,255,0.4)"
                        }}
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                S'inscrire <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 pt-4 border-t border-white/10 text-center">
                    <p className="text-sm text-white/60">
                        Déjà membre ?{" "}
                        <a href="/player/login" className="text-[#0066FF] hover:underline font-medium">
                            Se connecter
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
