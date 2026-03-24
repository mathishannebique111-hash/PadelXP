"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import nextDynamic from "next/dynamic";

export const dynamic = 'force-dynamic';

const TennisBallpit = nextDynamic(() => import("@/components/landing/TennisBallpit"), { ssr: false });

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
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

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
          let errorMessage = payload?.error || "Impossible d'initialiser votre accès club. Veuillez contacter le propriétaire du compte.";
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
    <div
      className="min-h-screen flex flex-col items-center justify-start pt-10 sm:pt-14 px-4 sm:px-6 pb-12 relative overflow-hidden"
      style={{ background: "#04050a" }}
    >
      {/* TennisBallpit — same as hero section */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0, filter: "blur(0.8px)" }}>
        <TennisBallpit />
      </div>
      {/* Overlays — same as hero section */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1, background: "radial-gradient(ellipse 80% 70% at 50% 48%, rgba(0,0,0,0.68) 0%, transparent 75%)" }} />
      <div className="fixed top-0 right-0 w-[500px] h-[500px] pointer-events-none" style={{ zIndex: 1, background: "radial-gradient(circle at top right, rgba(10,31,92,0.3) 0%, transparent 65%)" }} />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] pointer-events-none" style={{ zIndex: 1, background: "radial-gradient(circle at bottom left, rgba(10,31,92,0.2) 0%, transparent 65%)" }} />

      <div className="relative w-full max-w-sm" style={{ zIndex: 1 }}>
        {/* Logo + header */}
        <div className="text-center mb-10">
          <img
            src="/images/Logo sans fond.png"
            alt="PadelXP"
            className="h-36 w-36 object-contain mx-auto mb-4"
            style={{ filter: "drop-shadow(0 0 16px rgba(125,200,40,0.5))" }}
          />
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#7DC828", textShadow: "0 0 12px rgba(125,200,40,0.6)" }}>
            Espace clubs
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-white" style={{ textShadow: "0 2px 16px rgba(0,0,0,0.8)" }}>
            Connexion
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: "rgba(255,255,255,0.7)", textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}>
            Accédez à votre tableau de bord club
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(4,5,10,0.82)",
            border: "1px solid rgba(255,255,255,0.22)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          {/* Success banner */}
          {(justCreated || signupSuccess) && (
            <div
              className="mb-5 rounded-xl px-4 py-3 text-sm"
              style={{
                background: "rgba(125,200,40,0.08)",
                border: "1px solid rgba(125,200,40,0.3)",
                color: "#a3e635",
              }}
            >
              🎉 Votre espace club vient d'être créé. Saisissez vos identifiants pour accéder à votre tableau de bord.
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div
              className="mb-5 rounded-xl px-4 py-3 text-sm"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "#fca5a5",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold tracking-wider uppercase mb-2" style={{ color: "rgba(255,255,255,0.45)" }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@club.com"
                disabled={loading}
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 transition-all focus:outline-none"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2)",
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = "rgba(125,200,40,0.6)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(125,200,40,0.1), inset 0 1px 2px rgba(0,0,0,0.2)";
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.boxShadow = "inset 0 1px 2px rgba(0,0,0,0.2)";
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold tracking-wider uppercase mb-2" style={{ color: "rgba(255,255,255,0.45)" }}>
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
                  disabled={loading}
                  className="w-full rounded-xl px-4 py-3 pr-24 text-sm text-white placeholder-white/20 transition-all focus:outline-none"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2)",
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = "rgba(125,200,40,0.6)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(125,200,40,0.1), inset 0 1px 2px rgba(0,0,0,0.2)";
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.boxShadow = "inset 0 1px 2px rgba(0,0,0,0.2)";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={loading}
                  className="absolute inset-y-0 right-2 my-1.5 px-3 text-[11px] font-semibold rounded-lg transition-all"
                  style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.06)" }}
                >
                  {showPassword ? "Masquer" : "Afficher"}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #92e830 0%, #7DC828 55%, #69b220 100%)",
                boxShadow: loading ? "none" : "0 0 24px rgba(125,200,40,0.35), 0 2px 8px rgba(0,0,0,0.3)",
              }}
            >
              {loading ? "Connexion en cours…" : "Se connecter →"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/landingv2"
              className="text-sm transition-colors"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              ← Retour à la page d'accueil
            </Link>
          </div>
        </div>

        {/* Legal links */}
        <div className="mt-6 flex flex-wrap justify-center gap-x-3 gap-y-1">
          {[
            { label: "Mentions légales", href: "/legal" },
            { label: "CGU clubs", href: "/terms" },
            { label: "CGV", href: "/cgv" },
            { label: "Confidentialité", href: "/privacy" },
            { label: "Cookies", href: "/cookies" },
          ].map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="text-[10px] hover:text-white/40 transition-colors"
              style={{ color: "rgba(255,255,255,0.18)" }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ClubsLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#04050a" }}>
        <div className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Chargement…</div>
      </div>
    }>
      <ClubsLoginForm />
    </Suspense>
  );
}
