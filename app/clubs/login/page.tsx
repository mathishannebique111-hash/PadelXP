"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

// Forcer le rendu dynamique pour éviter les erreurs de prerender avec useSearchParams
export const dynamic = 'force-dynamic';

function ClubsLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const justCreated = searchParams?.get("created") === "1";
  const errorParam = searchParams?.get("error");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedFlag = sessionStorage.getItem("club_signup_success");
    if (storedFlag === "1") {
      setSignupSuccess(true);
      sessionStorage.removeItem("club_signup_success");
    }
    
    if (errorParam === "no_access") {
      setError("Vous n'avez plus accès à ce compte club. Contactez le propriétaire si c'est une erreur.");
    } else if (errorParam === "invite_incomplete") {
      setError("Votre lien d'invitation est incomplet. Veuillez cliquer directement sur le lien reçu par email ou demander un nouvel email d'invitation.");
    } else if (errorParam === "invite_invalid") {
      setError("Ce lien d'invitation n'est plus valide ou a déjà été utilisé. Contactez le propriétaire du club pour en obtenir un nouveau.");
    }
  }, [errorParam]);

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

      if (data?.session) {
        const profileInit = await fetch("/api/profile/init", {
          method: "POST",
          credentials: "include",
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
            "Content-Type": "application/json",
          },
        });

        if (!profileInit.ok) {
          const payload = await profileInit.json().catch(() => ({}));
          await supabase.auth.signOut();
          
          // Adapter le message d'erreur pour les clubs
          let errorMessage = payload?.error || "Impossible d'initialiser votre accès club. Veuillez contacter le propriétaire du compte.";
          
          // Si le message parle de "compte joueur", le remplacer par un message adapté aux clubs
          if (errorMessage.includes("compte joueur") || errorMessage.includes("inscription joueurs")) {
            errorMessage = "Aucun compte club trouvé pour cet email. Vérifiez que vous avez bien créé votre compte club ou contactez le propriétaire du club.";
          }
          
          setError(errorMessage);
          setLoading(false);
          return;
        }

        const payload = await profileInit.json();

        if (payload?.redirect) {
          router.replace(payload.redirect);
          router.refresh();
          return;
        }

        const nextPath = searchParams?.get("next") || "/dashboard";
        router.push(nextPath);
        router.refresh();
      } else {
        setError("Session introuvable. Réessayez.");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-[#0066FF] to-[#00CC99]">
            PadelXP
          </h1>
          <p className="text-white/60 text-sm">Espace clubs / complexes</p>
        </div>

        {/* Formulaire de connexion */}
        <div className="rounded-2xl bg-white/5 border border-white p-8 backdrop-blur-sm">
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
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 pr-24 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-2 my-1 px-2.5 text-[11px] font-semibold text-white/70 hover:text-white rounded-md bg-white/5 hover:bg-white/10"
                  disabled={loading}
                >
                  {showPassword ? "Masquer" : "Afficher"}
                </button>
              </div>
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
        <div className="mt-6 text-[11px] text-white/50 flex flex-wrap justify-center gap-3">
          <Link href="/legal" className="hover:text-white underline-offset-2 hover:underline">
            Mentions légales clubs
          </Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-white underline-offset-2 hover:underline">
            CGU clubs
          </Link>
          <span>•</span>
          <Link href="/cgv" className="hover:text-white underline-offset-2 hover:underline">
            CGV
          </Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-white underline-offset-2 hover:underline">
            Confidentialité clubs
          </Link>
          <span>•</span>
          <Link href="/cookies" className="hover:text-white underline-offset-2 hover:underline">
            Cookies clubs
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ClubsLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white">Chargement...</div>
      </div>
    }>
      <ClubsLoginForm />
    </Suspense>
  );
}

