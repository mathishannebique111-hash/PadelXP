"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { capitalizeFullName } from "@/lib/utils/name-utils";
import { logger } from '@/lib/logger';

type PrecheckResult =
  | boolean
  | {
      ok?: boolean;
      message?: string;
      redirect?: string;
      club?: { slug: string; code: string };
    };

export default function EmailSignupForm({
  extra,
  beforeSubmit,
  afterAuth,
}: {
  extra?: React.ReactNode;
  beforeSubmit?: (data: { email: string; password: string }) => Promise<PrecheckResult> | PrecheckResult;
  afterAuth?: (context?: { club?: { slug: string; code: string } }) => Promise<void> | void;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = (params?.get("redirect") as string) || "/home";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referralCodeValidating, setReferralCodeValidating] = useState(false);
  const [referralCodeStatus, setReferralCodeStatus] = useState<{
    valid: boolean;
    error?: string;
    referrerName?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation du code de parrainage en temps réel
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
        // Si la réponse n'est pas OK, essayer de parser l'erreur
        const errorData = await response.json().catch(() => ({ error: "Erreur lors de la validation" }));
        setReferralCodeStatus({
          valid: false,
          error: errorData.error || "Erreur lors de la validation",
        });
        return;
      }

      const data = await response.json();
      setReferralCodeStatus({
        valid: data.valid || false,
        error: data.error || undefined,
        referrerName: data.referrerName || undefined,
      });
    } catch (error) {
      setReferralCodeStatus({
        valid: false,
        error: "Erreur lors de la validation",
      });
    } finally {
      setReferralCodeValidating(false);
    }
  };

  // Debounce pour la validation du code de parrainage
  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null);
  const handleReferralCodeChange = (value: string) => {
    setReferralCode(value);
    setReferralCodeStatus(null);

    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }

    const timeout = setTimeout(() => {
      if (value.trim().length > 0) {
        validateReferralCode(value);
      }
    }, 500);

    setValidationTimeout(timeout);
  };

  // Nettoyer le timeout au démontage
  useEffect(() => {
    return () => {
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }
    };
  }, [validationTimeout]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Validation des champs prénom et nom
      if (!firstName.trim() || !lastName.trim()) {
        setError("Le prénom et le nom sont requis");
        setLoading(false);
        return;
      }

      // Si un code de parrainage est fourni, vérifier qu'il est valide
      if (referralCode.trim().length > 0) {
        if (!referralCodeStatus || !referralCodeStatus.valid) {
          setError(referralCodeStatus?.error || "Code de parrainage invalide");
          setLoading(false);
          return;
        }
      }

      let precheckContext: { club?: { slug: string; code: string } } | undefined;
      let customRedirect: string | undefined;
      if (beforeSubmit) {
        const res = await beforeSubmit({ email, password });
        if (res === false || (typeof res === "object" && res && (res as any).ok === false)) {
          setLoading(false);
          const msg = typeof res === "object" && res && (res as any).message ? (res as any).message : "Vérifiez vos informations";
          setError(msg as string);
          return;
        }
        if (typeof res === "object" && res) {
          if ((res as any).redirect) customRedirect = (res as any).redirect as string;
          if ((res as any).club) {
            precheckContext = { club: (res as any).club };
          }
        }
      }

      if (!precheckContext?.club?.slug || !precheckContext?.club?.code) {
        setLoading(false);
        setError("Sélectionnez un club / complexe valide et saisissez le code d'invitation");
        return;
      }

      // Capitaliser automatiquement le prénom et le nom
      const { firstName: capitalizedFirstName, lastName: capitalizedLastName } = capitalizeFullName(
        firstName.trim(),
        lastName.trim()
      );

      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: capitalizedFirstName,
            last_name: capitalizedLastName,
          },
        },
      });
      if (error) {
        logger.error("[EmailSignup] SignUp error:", error);
        // Améliorer le message d'erreur pour l'utilisateur
        if (error.message?.includes("Database") || error.message?.includes("database")) {
          throw new Error("Erreur lors de la création du compte. Veuillez réessayer ou contacter le support.");
        }
        throw error;
      }

      const displayName = `${capitalizedFirstName} ${capitalizedLastName}`.trim();
      let accessToken = data.session?.access_token || null;

      if (!data.session) {
        try {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) {
            throw signInError;
          }
          if (!signInData.session) {
            throw new Error("Connexion nécessaire pour finaliser l’inscription");
          }
          accessToken = signInData.session?.access_token || null;
        } catch (signInProblem) {
          logger.error("[EmailSignup] Impossible de créer la session après inscription", signInProblem);
          setError("Impossible de créer la session. Réessayez.");
          setLoading(false);
          return;
        }
      }

      if (!accessToken) {
        const { data: sessionData } = await supabase.auth.getSession();
        accessToken = sessionData.session?.access_token || null;
      }

      try {
        const response = await fetch('/api/player/attach', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({
            slug: precheckContext?.club?.slug,
            code: precheckContext?.club?.code,
            firstName: capitalizedFirstName,
            lastName: capitalizedLastName,
            displayName,
            email,
            referralCode: referralCode.trim().length > 0 ? referralCode.trim() : undefined,
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          logger.error('[EmailSignup] Failed to attach club:', response.status, errorData);
          const message = errorData?.error || "Impossible d'attacher le club";
          throw new Error(message);
        }

        const attachData = await response.json();
        
        // Si un code de parrainage a été traité avec succès, stocker l'info pour la notification
        if (attachData.referralProcessed) {
          // La notification sera affichée lors de la prochaine connexion via ReferralNotifier
          // On peut aussi stocker dans sessionStorage pour afficher immédiatement
          sessionStorage.setItem("referral_reward_received", "true");
        }
      } catch (attachError) {
        logger.error('[EmailSignup] Error attaching club:', attachError);
        if (attachError instanceof Error) {
          // Améliorer le message d'erreur pour l'utilisateur
          let errorMessage = attachError.message;
          if (errorMessage.includes("Database") || errorMessage.includes("database")) {
            errorMessage = "Erreur lors de la création du profil. Veuillez réessayer ou contacter le support.";
          }
          setError(errorMessage);
        } else {
          setError("Erreur lors de l'attachement au club. Veuillez réessayer.");
        }
        setLoading(false);
        return;
      }

      if (afterAuth) {
        try { await afterAuth(precheckContext); } catch {}
      }
      router.replace(customRedirect || redirectTo);
    } catch (e: any) {
      logger.error("[EmailSignup] Unexpected error:", e);
      // Améliorer le message d'erreur pour l'utilisateur
      let errorMessage = e?.message || "Impossible de créer le compte";
      if (errorMessage.includes("Database") || errorMessage.includes("database")) {
        errorMessage = "Erreur lors de la création du compte. Veuillez réessayer ou contacter le support.";
      }
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      {error && <div className="rounded-md border border-red-400 bg-red-900/20 px-3 py-2 text-sm text-red-400">{error}</div>}

      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          required
          placeholder="Prénom"
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <input
          type="text"
          required
          placeholder="Nom"
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
      </div>
      <input
        type="email"
        required
        placeholder="Email"
        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        required
        placeholder="Mot de passe"
        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      
      {/* Champ code de parrainage (optionnel) */}
      <div>
        <input
          type="text"
          placeholder="Code de parrainage (optionnel)"
          className={`w-full rounded-lg bg-white/5 border px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 ${
            referralCodeStatus?.valid
              ? "border-green-500/50 focus:ring-green-500"
              : referralCodeStatus?.valid === false
              ? "border-red-500/50 focus:ring-red-500"
              : "border-white/10 focus:ring-[#0066FF]"
          }`}
          value={referralCode}
          onChange={(e) => handleReferralCodeChange(e.target.value.toUpperCase())}
          maxLength={8}
        />
        {referralCodeValidating && (
          <p className="mt-1 text-xs text-white/60">Vérification du code...</p>
        )}
        {referralCodeStatus?.valid && referralCodeStatus.referrerName && (
          <p className="mt-1 text-xs text-green-400">
            ✓ Code valide ! Parrain : {referralCodeStatus.referrerName}
          </p>
        )}
        {referralCodeStatus?.valid === false && referralCodeStatus.error && (
          <p className="mt-1 text-xs text-red-400">{referralCodeStatus.error}</p>
        )}
        {referralCode.trim().length > 0 && !referralCodeStatus && !referralCodeValidating && (
          <p className="mt-1 text-xs text-white/60">
            Vous recevrez +1 boost gratuit si le code est valide
          </p>
        )}
      </div>
      
      {extra}
      <button
        disabled={loading}
        className="w-full rounded-xl px-4 py-3 font-semibold text-white transition-all hover:scale-105 disabled:opacity-60"
        style={{ background: "linear-gradient(135deg,#0066FF,#003D99)", boxShadow: "0 0 20px rgba(0,102,255,0.5)" }}
      >
        {loading ? "Création…" : "Créer mon compte"}
      </button>
    </form>
  );
}


