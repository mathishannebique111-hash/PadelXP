"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function ClubsLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const justCreated = searchParams?.get("created") === "1";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedFlag = sessionStorage.getItem("club_signup_success");
    if (storedFlag === "1") {
      setSignupSuccess(true);
      sessionStorage.removeItem("club_signup_success");
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message || "Erreur lors de la connexion");
        setLoading(false);
        return;
      }

      if (data?.user) {
        const nextPath = searchParams?.get("next") || "/dashboard";
        router.push(nextPath);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-[#0066FF] to-[#00CC99]">
            PadelXP
          </h1>
          <p className="text-white/60 text-sm">Espace clubs / complexes</p>
        </div>

        {/* Formulaire de connexion */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-8 backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-2">Connexion</h2>
          <p className="text-white/60 mb-6 text-sm">
            Connectez-vous à votre compte club / complexe
          </p>

          {(justCreated || signupSuccess) && (
            <div className="mb-4 rounded-lg border border-emerald-400 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200">
              🎉 Félicitations&nbsp;! Votre espace club vient d’être créé. Saisissez vos identifiants pour accéder à votre tableau de bord.
            </div>
          )}


          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-2">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-[#0066FF] to-[#0052CC] text-white font-semibold hover:shadow-[0_0_20px_rgba(0,102,255,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link
              href="/clubs"
              className="text-sm text-white/60 hover:text-white/80 transition-colors"
            >
              ← Retour à la page d'accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

