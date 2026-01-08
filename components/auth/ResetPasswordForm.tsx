"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Fonction pour calculer la force du mot de passe
const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
  if (password.length === 0) {
    return { strength: 0, label: "", color: "" };
  }

  let strength = 0;
  
  // Longueur minimale
  if (password.length >= 8) strength += 1;
  if (password.length >= 12) strength += 1;
  
  // Contient des minuscules
  if (/[a-z]/.test(password)) strength += 1;
  
  // Contient des majuscules
  if (/[A-Z]/.test(password)) strength += 1;
  
  // Contient des chiffres
  if (/[0-9]/.test(password)) strength += 1;
  
  // Contient des caractères spéciaux
  if (/[^a-zA-Z0-9]/.test(password)) strength += 1;

  if (strength <= 2) {
    return { strength, label: "Faible", color: "text-red-400" };
  } else if (strength <= 4) {
    return { strength, label: "Moyen", color: "text-yellow-400" };
  } else {
    return { strength, label: "Fort", color: "text-green-400" };
  }
};

export default function ResetPasswordForm() {
  const router = useRouter();
  const passwordInputRef = useRef<HTMLInputElement>(null);
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const passwordValid = password.length >= 8;
  const formValid = passwordValid && passwordsMatch;

  // Autofocus sur le champ mot de passe à l'ouverture
  useEffect(() => {
    passwordInputRef.current?.focus();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation côté client
    if (!passwordValid) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      setLoading(false);
      return;
    }

    if (!passwordsMatch) {
      setError("Les mots de passe ne correspondent pas.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        // Traduire les messages d'erreur de Supabase
        const errorMessage = updateError.message?.toLowerCase() || '';
        let translatedError = "Une erreur est survenue lors de la réinitialisation.";
        
        if (
          errorMessage.includes('password') && 
          (errorMessage.includes('weak') || errorMessage.includes('faible'))
        ) {
          translatedError = "Le mot de passe est trop faible. Utilisez au moins 8 caractères avec des majuscules, minuscules, chiffres et caractères spéciaux.";
        } else if (
          errorMessage.includes('session') || 
          errorMessage.includes('token') ||
          errorMessage.includes('expired') ||
          errorMessage.includes('expiré')
        ) {
          translatedError = "Votre session a expiré. Veuillez demander un nouveau lien de réinitialisation.";
        } else if (
          errorMessage.includes('rate limit') ||
          errorMessage.includes('too many requests')
        ) {
          translatedError = "Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.";
        } else if (
          errorMessage.includes('invalid') ||
          errorMessage.includes('invalide')
        ) {
          translatedError = "Données invalides. Veuillez vérifier votre mot de passe.";
        } else if (updateError.message) {
          // Garder le message original s'il n'y a pas de traduction
          translatedError = updateError.message;
        }
        
        setError(translatedError);
        setLoading(false);
        return;
      }

      // Succès - rediriger vers la page de connexion
      router.push("/login?password-reset=success");
    } catch (e: any) {
      setError(e?.message || "Une erreur est survenue. Veuillez réessayer.");
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

      {/* Nouveau mot de passe */}
      <div>
        <label className="block text-[10px] text-white/70 mb-0.5">
          Nouveau mot de passe <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <input
            ref={passwordInputRef}
            type={showPassword ? "text" : "password"}
            required
            placeholder="Nouveau mot de passe"
            className={`w-full rounded-lg bg-white/5 border px-2.5 py-1.5 pr-10 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 ${
              password.length > 0 && !passwordValid
                ? "border-red-500/50 focus:ring-red-500"
                : password.length > 0 && passwordValid
                ? "border-green-500/50 focus:ring-green-500"
                : "border-white/10 focus:ring-[#0066FF]"
            }`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            minLength={8}
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
        {/* Indicateur de force du mot de passe */}
        {password.length > 0 && (
          <div className="mt-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[10px] ${passwordStrength.color}`}>
                {passwordStrength.label}
              </span>
              <span className="text-[10px] text-white/50">
                {password.length}/8 caractères minimum
              </span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  passwordStrength.strength <= 2
                    ? "bg-red-400"
                    : passwordStrength.strength <= 4
                    ? "bg-yellow-400"
                    : "bg-green-400"
                }`}
                style={{ width: `${Math.min((passwordStrength.strength / 6) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Confirmer le mot de passe */}
      <div>
        <label className="block text-[10px] text-white/70 mb-0.5">
          Confirmer le mot de passe <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <input
            type={showConfirmPassword ? "text" : "password"}
            required
            placeholder="Confirmer le mot de passe"
            className={`w-full rounded-lg bg-white/5 border px-2.5 py-1.5 pr-10 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 ${
              confirmPassword.length > 0 && !passwordsMatch
                ? "border-red-500/50 focus:ring-red-500"
                : confirmPassword.length > 0 && passwordsMatch
                ? "border-green-500/50 focus:ring-green-500"
                : "border-white/10 focus:ring-[#0066FF]"
            }`}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((v) => !v)}
            className="absolute inset-y-0 right-2 flex items-center text-white/70 hover:text-white transition-colors"
            aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showConfirmPassword ? (
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
        {/* Message de confirmation */}
        {confirmPassword.length > 0 && (
          <div className="mt-1.5">
            {passwordsMatch ? (
              <div className="flex items-center gap-1.5 text-[10px] text-green-400">
                <svg
                  className="w-3 h-3"
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
                <span>Les mots de passe correspondent</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[10px] text-red-400">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                <span>Les mots de passe ne correspondent pas</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bouton de réinitialisation */}
      <button
        type="submit"
        disabled={loading || !formValid}
        className="w-full rounded-xl px-4 py-3 font-semibold text-white transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
        style={{ background: "linear-gradient(135deg,#0066FF,#003D99)", boxShadow: "0 0 20px rgba(0,102,255,0.5)" }}
      >
        {loading ? "Réinitialisation…" : "Réinitialiser le mot de passe"}
      </button>
    </form>
  );
}
