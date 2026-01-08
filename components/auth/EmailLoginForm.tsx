"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type PrecheckResult = boolean | { ok: boolean; message?: string; redirect?: string };

// Fonction de validation d'email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default function EmailLoginForm({
  extra,
  beforeSubmit,
}: {
  extra?: React.ReactNode;
  beforeSubmit?: (data: { email: string; password: string }) => Promise<PrecheckResult> | PrecheckResult;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = (params?.get("redirect") as string) || "/home";
  const emailInputRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);

  // Autofocus sur le champ email à l'ouverture
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  // Validation de l'email en temps réel
  useEffect(() => {
    if (email.trim().length === 0) {
      setEmailValid(null);
    } else {
      setEmailValid(isValidEmail(email));
    }
  }, [email]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let customRedirect: string | undefined = undefined;
      if (beforeSubmit) {
        const res = await beforeSubmit({ email, password });
        if (res === false || (typeof res === "object" && res && (res as any).ok === false)) {
          setLoading(false);
          const msg = typeof res === "object" && res && (res as any).message ? (res as any).message : "Vérifiez vos informations";
          setError(msg as string);
          return;
        }
        if (typeof res === "object" && res && (res as any).ok === true && (res as any).redirect) {
          customRedirect = (res as any).redirect as string;
        }
      }
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Traduire les messages d'erreur de Supabase
        const errorMessage = error.message?.toLowerCase() || '';
        let translatedError = "Impossible de se connecter. Vérifiez vos identifiants.";
        
        if (
          errorMessage.includes('invalid login credentials') ||
          errorMessage.includes('invalid credentials') ||
          errorMessage.includes('identifiants invalides')
        ) {
          translatedError = "Email ou mot de passe incorrect.";
        } else if (
          errorMessage.includes('email not confirmed') ||
          errorMessage.includes('email non confirmé')
        ) {
          translatedError = "Votre email n'a pas été confirmé. Vérifiez votre boîte de réception.";
        } else if (
          errorMessage.includes('user not found') ||
          errorMessage.includes('utilisateur introuvable')
        ) {
          translatedError = "Aucun compte trouvé avec cet email.";
        } else if (
          errorMessage.includes('too many requests') ||
          errorMessage.includes('rate limit')
        ) {
          translatedError = "Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.";
        } else if (error.message) {
          // Garder le message original s'il n'y a pas de traduction
          translatedError = error.message;
        }
        
        throw new Error(translatedError);
      }

      if (data.session) {
        const profileInit = await fetch("/api/profile/init", {
          method: "POST",
          credentials: "include",
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
            "Content-Type": "application/json",
          },
        });
        const payload = await profileInit.json().catch(() => null);
        if (!profileInit.ok) {
          await supabase.auth.signOut();
          if (payload?.redirect) {
            router.replace(payload.redirect as string);
            return;
          }
          setError(payload?.error || "Aucun compte joueur trouvé pour cet email. Créez d'abord votre compte via l'inscription joueurs.");
          setLoading(false);
          return;
        }

        // Si l'API retourne un redirect (cas admin de club), suivre la redirection
        if (payload?.redirect && !payload?.profile) {
          router.replace(payload.redirect);
          return;
        }

        const profile = payload?.profile ?? null;
        if (!profile) {
          await supabase.auth.signOut();
          setError("Aucun compte joueur trouvé pour cet email. Créez d'abord votre compte via l'inscription joueurs.");
          setLoading(false);
          return;
        }

        let finalRedirect =
          payload?.redirect ||
          customRedirect ||
          redirectTo;

        const wantsClubDashboard =
          (payload?.redirect && payload.redirect.startsWith("/dashboard")) ||
          (customRedirect && customRedirect.startsWith("/dashboard")) ||
          redirectTo.startsWith("/dashboard");

        if (!payload?.redirect && profile.club_slug && wantsClubDashboard) {
          finalRedirect = "/dashboard";
        }

        router.replace(finalRedirect);
      }
    } catch (e: any) {
      setError(e?.message || "Impossible de se connecter");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-400 bg-red-900/20 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Email avec validation en temps réel */}
      <div>
        <label className="block text-[10px] text-white/70 mb-0.5">
          Email <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <input
            ref={emailInputRef}
            type="email"
            required
            placeholder="Email"
            className={`w-full rounded-lg bg-white/5 border px-2.5 py-1.5 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 ${
              emailValid === true
                ? "border-green-500/50 focus:ring-green-500"
                : emailValid === false
                ? "border-red-500/50 focus:ring-red-500"
                : "border-white/10 focus:ring-[#0066FF]"
            }`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {emailValid === true && email.trim().length > 0 && (
            <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
              <svg
                className="w-4 h-4 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Mot de passe avec icône œil */}
      <div>
        <label className="block text-[10px] text-white/70 mb-0.5">
          Mot de passe <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            required
            placeholder="Mot de passe"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 pr-10 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-2 flex items-center text-white/70 hover:text-white transition-colors"
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPassword ? (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Lien Mot de passe oublié */}
      <div className="flex items-center justify-end text-xs">
        <Link
          href="/forgot-password"
          className="text-white/70 hover:text-white underline transition-colors"
        >
          Mot de passe oublié ?
        </Link>
      </div>

      {extra}
      
      {/* Bouton de connexion */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl px-4 py-3 font-semibold text-white transition-all hover:scale-105 disabled:opacity-60"
        style={{ background: "linear-gradient(135deg,#0066FF,#003D99)", boxShadow: "0 0 20px rgba(0,102,255,0.5)" }}
      >
        {loading ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}


