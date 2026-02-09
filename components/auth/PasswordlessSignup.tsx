"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ClubSelector from "./ClubSelector";
import { Mail, Gift, Loader2, ArrowRight, KeyRound, RefreshCw } from "lucide-react";
import Image from "next/image";

interface Club {
    id: string;
    name: string;
    slug: string;
    code_invitation: string;
    logo_url?: string | null;
    city?: string | null;
}

type Step = "form" | "otp";

export default function PasswordlessSignup() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("form");

    // Données du formulaire
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [selectedClub, setSelectedClub] = useState<Club | null>(null);
    const [showReferralCode, setShowReferralCode] = useState(false);
    const [referralCode, setReferralCode] = useState("");
    const [referralCodeStatus, setReferralCodeStatus] = useState<{
        valid: boolean;
        error?: string;
        referrerName?: string;
    } | null>(null);
    const [referralCodeValidating, setReferralCodeValidating] = useState(false);

    // OTP
    const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
    const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // UI State
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

    // Validation du code de parrainage
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

    // Envoi du code OTP
    const handleSendOtp = async (e: React.FormEvent) => {
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

        if (!selectedClub) {
            setError("Veuillez sélectionner votre club.");
            return;
        }

        // Vérifier code parrainage si fourni
        if (referralCode.trim().length > 0 && referralCodeStatus && !referralCodeStatus.valid) {
            setError(referralCodeStatus.error || "Code de parrainage invalide");
            return;
        }

        setLoading(true);

        try {
            // Vérifier si l'email existe déjà (via API serveur)
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

            const supabase = createClient();

            // Stocker les métadonnées pour les récupérer après vérification
            sessionStorage.setItem("signup_club_slug", selectedClub.slug);
            sessionStorage.setItem("signup_club_name", selectedClub.name);
            sessionStorage.setItem("signup_first_name", firstName.trim());
            sessionStorage.setItem("signup_last_name", lastName.trim());

            if (referralCode.trim()) {
                sessionStorage.setItem("signup_referral_code", referralCode.trim());
            }

            const { error: otpError } = await supabase.auth.signInWithOtp({
                email: email.trim().toLowerCase(),
                options: {
                    shouldCreateUser: true,
                    data: {
                        first_name: firstName.trim(),
                        last_name: lastName.trim(),
                        full_name: `${firstName.trim()} ${lastName.trim()}`,
                        club_slug: selectedClub.slug,
                        referral_code: referralCode.trim() || null,
                    },
                },
            });

            if (otpError) {
                throw new Error(otpError.message || "Erreur lors de l'envoi du code");
            }

            // Passer à l'étape OTP
            setStep("otp");
            setCooldown(60);
        } catch (e: any) {
            const errMsg = e?.message?.toLowerCase() || "";
            if (errMsg.includes("rate limit") || errMsg.includes("too many")) {
                setError("Trop de tentatives. Veuillez patienter quelques minutes.");
            } else {
                setError(e?.message || "Impossible d'envoyer le code. Réessayez.");
            }
        } finally {
            setLoading(false);
        }
    };

    // Gestion de la saisie OTP
    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // Que des chiffres

        const newOtp = [...otpCode];
        newOtp[index] = value.slice(-1); // Un seul chiffre
        setOtpCode(newOtp);

        // Auto-focus sur le suivant
        if (value && index < 5) {
            otpInputRefs.current[index + 1]?.focus();
        }

        // Si tous les chiffres sont remplis, vérifier automatiquement
        const fullCode = newOtp.join("");
        if (fullCode.length === 6) {
            handleVerifyOtp(fullCode);
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otpCode[index] && index > 0) {
            otpInputRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (pasted.length === 6) {
            setOtpCode(pasted.split(""));
            handleVerifyOtp(pasted);
        }
    };

    // Vérification OTP
    const handleVerifyOtp = async (code: string) => {
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
                throw new Error(verifyError.message || "Code incorrect");
            }

            if (!data.session) {
                throw new Error("Erreur d'authentification");
            }

            // Récupérer les métadonnées stockées
            const clubSlug = sessionStorage.getItem("signup_club_slug");
            const storedReferralCode = sessionStorage.getItem("signup_referral_code");

            // Attacher le club
            if (clubSlug) {
                const attachResponse = await fetch("/api/player/attach", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${data.session.access_token}`,
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        slug: clubSlug,
                        email: email.trim().toLowerCase(),
                        referralCode: storedReferralCode || undefined,
                    }),
                });

                if (!attachResponse.ok) {
                    const errorData = await attachResponse.json().catch(() => ({}));
                    console.error("Attach error:", errorData);
                    // On continue quand même - l'utilisateur pourra choisir son club plus tard
                }

                const attachData = await attachResponse.json().catch(() => ({}));
                if (attachData.referralProcessed) {
                    sessionStorage.setItem("referral_reward_received", "true");
                }
            }

            // Cleanup
            sessionStorage.removeItem("signup_club_slug");
            sessionStorage.removeItem("signup_club_name");
            sessionStorage.removeItem("signup_referral_code");

            // Rediriger vers l'onboarding (pour compléter le profil)
            router.replace("/player/onboarding");
        } catch (e: any) {
            const errMsg = e?.message?.toLowerCase() || "";
            if (errMsg.includes("invalid") || errMsg.includes("expired")) {
                setError("Code incorrect ou expiré. Veuillez réessayer.");
            } else {
                setError(e?.message || "Erreur de vérification");
            }
            // Reset OTP inputs
            setOtpCode(["", "", "", "", "", ""]);
            otpInputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    // Renvoyer le code
    const handleResendCode = async () => {
        if (cooldown > 0) return;

        setLoading(true);
        setError(null);

        try {
            const supabase = createClient();

            const { error: otpError } = await supabase.auth.signInWithOtp({
                email: email.trim().toLowerCase(),
                options: {
                    shouldCreateUser: true,
                },
            });

            if (otpError) {
                throw new Error(otpError.message);
            }

            setCooldown(60);
            setOtpCode(["", "", "", "", "", ""]);
        } catch (e: any) {
            setError(e?.message || "Erreur lors du renvoi du code");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            {/* Card principale */}
            <div className="rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md shadow-xl p-6 transition-all duration-300">

                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-extrabold text-white mb-2">
                        {step === "form" ? "Créer mon compte" : "Vérification"}
                    </h1>
                    <p className="text-sm text-white/60">
                        {step === "form"
                            ? "Rejoignez la communauté PadelXP"
                            : `Code envoyé à ${email}`
                        }
                    </p>
                </div>

                {/* Erreur */}
                {error && (
                    <div className="rounded-lg border border-red-400/50 bg-red-500/10 px-4 py-3 text-sm text-red-400 mb-4 animate-in fade-in duration-200">
                        {error}
                    </div>
                )}

                {step === "form" ? (
                    /* ========== ÉTAPE 1 : FORMULAIRE ========== */
                    <form onSubmit={handleSendOtp} className="space-y-4">
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

                        {/* Sélecteur de club */}
                        <ClubSelector
                            onSelect={setSelectedClub}
                            selectedClub={selectedClub}
                        />

                        {/* Code de parrainage */}
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

                        {/* Bouton Submit */}
                        <button
                            type="submit"
                            disabled={loading || !email || !selectedClub}
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
                                    Recevoir mon code
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    /* ========== ÉTAPE 2 : VÉRIFICATION OTP ========== */
                    <div className="space-y-6">
                        {/* Icône */}
                        <div className="flex justify-center">
                            <div className="w-16 h-16 rounded-full bg-[#0066FF]/20 flex items-center justify-center">
                                <KeyRound className="w-8 h-8 text-[#0066FF]" />
                            </div>
                        </div>

                        {/* Inputs OTP */}
                        <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                            {otpCode.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(el) => {
                                        otpInputRefs.current[index] = el;
                                    }}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    className="w-12 h-14 rounded-xl bg-white/5 border border-white/20 text-center text-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
                                    value={digit}
                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                    autoFocus={index === 0}
                                />
                            ))}
                        </div>

                        {/* Loader */}
                        {loading && (
                            <div className="flex justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-[#0066FF]" />
                            </div>
                        )}

                        {/* Renvoyer le code */}
                        <div className="text-center">
                            <button
                                type="button"
                                onClick={handleResendCode}
                                disabled={cooldown > 0 || loading}
                                className="text-sm text-white/60 hover:text-white disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 mx-auto"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${cooldown > 0 ? "" : "animate-pulse"}`} />
                                {cooldown > 0 ? `Renvoyer dans ${cooldown}s` : "Renvoyer le code"}
                            </button>
                        </div>

                        {/* Retour */}
                        <button
                            type="button"
                            onClick={() => {
                                setStep("form");
                                setOtpCode(["", "", "", "", "", ""]);
                                setError(null);
                            }}
                            className="w-full text-sm text-white/50 hover:text-white/80 transition-colors"
                        >
                            ← Modifier l'email
                        </button>
                    </div>
                )}

                {/* Lien connexion */}
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
