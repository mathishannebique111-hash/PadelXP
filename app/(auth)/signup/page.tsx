"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabase";
import { logger } from '@/lib/logger';

// Forcer le rendu dynamique pour éviter les erreurs de prerender avec useSearchParams
export const dynamic = 'force-dynamic';

import HideSplashScreen from "@/components/HideSplashScreen";

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
    <div className="relative min-h-screen flex flex-col items-center justify-center text-white px-6 overflow-hidden">
      <HideSplashScreen />
      {/* Background global */}
      <div className="absolute inset-0 bg-[#172554] z-0" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/80 to-black z-0 pointer-events-none" />

      {/* Logo en haut */}
      <div className="absolute top-8 left-0 right-0 z-20 flex justify-center is-app:top-20 pointer-events-none">
        <img
          src="/images/Logo sans fond.png"
          alt="PadelXP Logo"
          className="w-28 h-auto object-contain opacity-90 drop-shadow-2xl"
        />
      </div>

      <div className="relative z-[50] w-full max-w-md rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md shadow-xl p-8 animate-fadeIn">
        <div className="text-sm uppercase tracking-[0.3em] text-white/40 mb-2">Inscription Club</div>
        <h1 className="text-2xl font-extrabold mb-6">Compte administrateur</h1>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-3 text-xs text-red-200 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={onEmailSignup} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-white/50 uppercase tracking-wider ml-1">Prénom</label>
              <input required placeholder="Prénom" className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0066FF]" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-white/50 uppercase tracking-wider ml-1">Nom</label>
              <input required placeholder="Nom" className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0066FF]" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-white/50 uppercase tracking-wider ml-1">Email professionnel</label>
            <input required type="email" placeholder="Email pro" className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0066FF]" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-white/50 uppercase tracking-wider ml-1">Mot de passe</label>
            <div className="relative">
              <input
                required
                type={showPassword ? "text" : "password"}
                placeholder="Mot de passe"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 pr-20 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
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
          </div>

          <div className="pt-2">
            <label className="flex items-start gap-3 text-xs text-white/60 cursor-pointer select-none">
              <input type="checkbox" className="mt-0.5 w-4 h-4 rounded border-white/10 bg-white/5 text-[#0066FF] focus:ring-[#0066FF]" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
              <span>
                J’accepte les{" "}
                <Link className="underline hover:text-white" href="/terms?returnTo=/signup">
                  Conditions d’utilisation
                </Link>{" "}
                et la{" "}
                <Link className="underline hover:text-white" href="/privacy?returnTo=/signup">
                  Politique de confidentialité
                </Link>
              </span>
            </label>
          </div>

          <div className="pt-4">
            <button
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-bold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,102,255,0.4)]"
              style={{ background: "linear-gradient(135deg,#0066FF,#003D99)" }}
            >
              {loading ? "Création..." : "Continuer"}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-[10px] text-white/30">
            <Link href="/legal?returnTo=/signup" className="hover:text-white transition-colors">Mentions légales</Link>
            <Link href="/terms?returnTo=/signup" className="hover:text-white transition-colors">CGU</Link>
            <Link href="/cgv?returnTo=/signup" className="hover:text-white transition-colors">CGV</Link>
            <Link href="/privacy?returnTo=/signup" className="hover:text-white transition-colors">Confidentialité</Link>
            <Link href="/cookies?returnTo=/signup" className="hover:text-white transition-colors">Cookies</Link>
          </div>
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
