"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginIntro({ onShowLogin }: { onShowLogin?: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  function isValidEmail(value: string) {
    // Validation simple RFC5322 light
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  const handleStart = () => {
    if (!isValidEmail(email)) {
      setError("Veuillez saisir une adresse email valide.");
      return;
    }
    setError(null);
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("onboarding_email", email.trim());
      }
    } catch {}
    router.push(`/signup?email=${encodeURIComponent(email.trim())}`);
  };

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleStart(); }}>
      <h1 className="text-3xl md:text-4xl font-extrabold">Créez votre espace club en 5 minutes.</h1>
      <div className="max-w-md">
        <label className="block text-sm text-white/70 mb-2">Continuer avec email</label>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="votre.email@club.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? "true" : "false"}
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/15 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#00CC99]"
        />
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>
      <p className="text-white/60 text-sm">Aucune carte bancaire requise pendant l’essai de 30 jours.</p>
      <div className="flex items-center gap-4">
        <button type="submit" className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#00CC99] to-[#0066FF] font-semibold">
          Commencer
        </button>
        <button type="button" onClick={onShowLogin} className="text-white/70 underline">Déjà partenaire ? Se connecter</button>
      </div>
    </form>
  );
}


