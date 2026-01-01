"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabase";
import { logger } from '@/lib/logger';

// Forcer le rendu dynamique pour éviter les erreurs de prerender avec useSearchParams
export const dynamic = 'force-dynamic';

function SignupForm() {
  const supabase = supabaseClient();
  const search = useSearchParams();
  const emailFromQuery = useMemo(() => (search?.get("email") || ""), [search]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? sessionStorage.getItem("onboarding_email") || "" : "";
    setEmail(emailFromQuery || stored);
  }, [emailFromQuery]);

  const onEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accept) {
      setError("Veuillez accepter les Conditions d’utilisation et la Politique de confidentialité.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/clubs/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, firstName, lastName }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || "Impossible de créer le compte");
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError || !signInData.session) {
        throw new Error(signInError?.message || "Impossible de se connecter après l’inscription");
      }

      try {
        await fetch("/api/auth/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ event: "SIGNED_IN", session: signInData.session }),
        });
      } catch (callbackError) {
        logger.warn("/api/auth/callback failed", callbackError);
      }

      await supabase.auth.refreshSession();

      sessionStorage.setItem("onboarding_email", email);
      sessionStorage.setItem("onboarding_password", password);
      window.location.href = "/onboarding/club";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue lors de l’inscription");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-xl mx-auto px-6 py-12">
        <h1 className="text-2xl md:text-3xl font-extrabold mb-6">Création du compte administrateur</h1>
        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
        <form onSubmit={onEmailSignup} className="space-y-4">
          <div className="flex gap-3">
            <input required placeholder="Prénom" className="w-1/2 rounded-lg bg-white/5 border border-white/10 px-3 py-2" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <input required placeholder="Nom" className="w-1/2 rounded-lg bg-white/5 border border-white/10 px-3 py-2" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <input required type="email" placeholder="Email pro" className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="relative">
            <input
              required
              type={showPassword ? "text" : "password"}
              placeholder="Mot de passe"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 pr-20"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-2 my-1 px-1.5 text-[11px] font-semibold text-white/70 hover:text-white rounded-md bg-white/5 hover:bg-white/10"
            >
              {showPassword ? "Masquer" : "Afficher"}
            </button>
          </div>
          <label className="flex items-start gap-3 text-sm text-white/80">
            <input type="checkbox" className="mt-1" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
            <span>
              J’accepte les{" "}
              <a className="underline" href="/terms" target="_blank">
                Conditions d’utilisation
              </a>{" "}
              et la{" "}
              <a className="underline" href="/privacy" target="_blank">
                Politique de confidentialité
              </a>
            </span>
          </label>
          <button
            disabled={loading}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#00CC99] to-[#0066FF] font-semibold disabled:opacity-60"
          >
            Continuer
          </button>
        </form>
        <div className="mt-6 text-[11px] text-white/50 flex flex-wrap justify-center gap-3">
          <a href="/legal" className="hover:text-white underline-offset-2 hover:underline">
            Mentions légales clubs
          </a>
          <span>•</span>
          <a href="/terms" className="hover:text-white underline-offset-2 hover:underline">
            CGU clubs
          </a>
          <span>•</span>
          <a href="/cgv" className="hover:text-white underline-offset-2 hover:underline">
            CGV
          </a>
          <span>•</span>
          <a href="/privacy" className="hover:text-white underline-offset-2 hover:underline">
            Confidentialité clubs
          </a>
          <span>•</span>
          <a href="/cookies" className="hover:text-white underline-offset-2 hover:underline">
            Cookies clubs
          </a>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white">Chargement...</div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
