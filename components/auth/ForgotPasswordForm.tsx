"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Fonction de validation d'email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default function ForgotPasswordForm() {
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
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
    setSuccess(false);

    if (!isValidEmail(email)) {
      setError("Veuillez entrer une adresse email valide.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      // Construire l'URL de redirection
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const redirectUrl = `${siteUrl}/reset-password`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
        // Note: La langue de l'email est configurée dans Supabase Dashboard
        // Authentication > Email Templates > Reset Password
      });

      if (resetError) {
        // Vérifier si l'erreur indique que l'email n'existe pas
        const errorMessage = resetError.message?.toLowerCase() || '';
        if (
          errorMessage.includes('user not found') ||
          errorMessage.includes('no user found') ||
          errorMessage.includes('email not found') ||
          errorMessage.includes('utilisateur introuvable') ||
          errorMessage.includes('aucun utilisateur')
        ) {
          setError("Aucun compte associé à cet email.");
        } else if (
          errorMessage.includes('rate limit') ||
          errorMessage.includes('too many requests') ||
          errorMessage.includes('trop de requêtes')
        ) {
          setError("Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.");
        } else if (
          errorMessage.includes('invalid email') ||
          errorMessage.includes('email invalide')
        ) {
          setError("Adresse email invalide.");
        } else {
          // Traduire les messages d'erreur courants de Supabase
          let translatedError = resetError.message || "Une erreur est survenue. Veuillez réessayer.";

          // Traductions des erreurs courantes
          const errorTranslations: Record<string, string> = {
            'email rate limit exceeded': 'Trop de tentatives. Veuillez patienter avant de réessayer.',
            'email already confirmed': 'Cet email a déjà été confirmé.',
            'invalid request': 'Requête invalide. Veuillez réessayer.',
            'network error': 'Erreur réseau. Vérifiez votre connexion internet.',
            'service unavailable': 'Service temporairement indisponible. Veuillez réessayer plus tard.',
            'error sending recovery email': 'Erreur de configuration email. Veuillez contacter le support.',
          };

          for (const [key, translation] of Object.entries(errorTranslations)) {
            if (errorMessage.includes(key)) {
              translatedError = translation;
              break;
            }
          }

          setError(translatedError);
        }
        setLoading(false);
        return;
      }

      // Succès
      setSuccess(true);
      setLoading(false);
    } catch (e: any) {
      setError(e?.message || "Une erreur est survenue. Veuillez réessayer.");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-green-400 bg-green-900/20 px-3 py-2 text-xs text-green-400">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 flex-shrink-0"
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
            <span>Email envoyé ! Vérifiez votre boîte de réception.</span>
          </div>
        </div>
        <p className="text-xs text-white/70 text-center">
          Si vous ne recevez pas l'email dans quelques minutes, vérifiez votre dossier spam.
        </p>
      </div>
    );
  }

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
            className={`w-full rounded-lg bg-white/5 border px-2.5 py-1.5 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 ${emailValid === true
                ? "border-green-500/50 focus:ring-green-500"
                : emailValid === false
                  ? "border-red-500/50 focus:ring-red-500"
                  : "border-white/10 focus:ring-[#0066FF]"
              }`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
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

      {/* Bouton d'envoi */}
      <button
        type="submit"
        disabled={loading || !emailValid}
        className="w-full rounded-xl px-4 py-3 font-semibold text-white transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
        style={{ background: "linear-gradient(135deg,#0066FF,#003D99)", boxShadow: "0 0 20px rgba(0,102,255,0.5)" }}
      >
        {loading ? "Envoi en cours…" : "Envoyer le lien"}
      </button>
    </form>
  );
}
