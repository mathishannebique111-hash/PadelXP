"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type StepStatus = "loading" | "ready" | "error" | "success";

export default function ClientAdminInvite() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<StepStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState<string | null>(null);

  // Étape 1 : établir la session à partir du lien d'invitation
  useEffect(() => {
    let cancelled = false;

    async function handleInvite() {
      setStatus("loading");
      setError(null);

      const hashString = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
      const searchString = typeof window !== "undefined" ? window.location.search : "";
      const hashParams = new URLSearchParams(hashString);
      const queryParams = new URLSearchParams(searchString);

      const accessToken = hashParams.get("access_token") || queryParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token") || queryParams.get("refresh_token");
      const typeFromHash = hashParams.get("type") || queryParams.get("type");
      const code = searchParams?.get("code") || hashParams.get("code") || queryParams.get("code");
      const inviteToken =
        searchParams?.get("token") ||
        searchParams?.get("token_hash") ||
        searchParams?.get("invite_token") ||
        queryParams.get("token") ||
        queryParams.get("token_hash") ||
        queryParams.get("invite_token") ||
        hashParams.get("token") ||
        hashParams.get("token_hash") ||
        hashParams.get("invite_token");
      const emailParam =
        searchParams?.get("email") ||
        queryParams.get("email") ||
        hashParams.get("email") ||
        hashParams.get("email_address");

      try {
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error || !data.session) {
            throw new Error(error?.message || "Code invalide ou expiré.");
          }
          if (!cancelled) {
            setEmail(data.session.user.email ?? null);
            setStatus("ready");
          }
          return;
        }

        if (inviteToken && !accessToken) {
          let sessionEstablished = false;
          let lastError: Error | null = null;

          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(inviteToken);
            if (error) {
              lastError = error;
            } else if (data?.session) {
              sessionEstablished = true;
            }
          } catch (exchangeError: any) {
            lastError = exchangeError;
          }

          if (!sessionEstablished && emailParam) {
            try {
              const { data, error } = await supabase.auth.verifyOtp({
                type: "invite",
                token: inviteToken,
                email: emailParam,
              });
              if (error) {
                lastError = error;
              } else if (data?.session) {
                sessionEstablished = true;
              }
            } catch (verifyError: any) {
              lastError = verifyError;
            }
          }

          if (!sessionEstablished) {
            throw new Error(
              lastError?.message ||
                "Lien d'invitation expiré ou déjà utilisé. Demandez-en un nouveau."
            );
          }

          const { data: sessionData } = await supabase.auth.getSession();
          const session = sessionData.session ?? null;
          if (session && !cancelled) {
            setEmail(session.user.email ?? emailParam ?? session.user.email ?? null);
            setStatus("ready");
            if (typeof window !== "undefined") {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
            return;
          }
        }

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error || !data?.session) {
            throw new Error(error?.message || "Impossible de valider l'invitation.");
          }
          if (!cancelled) {
            setEmail(data.session.user.email ?? null);
            setStatus("ready");
            // Nettoyer le hash pour éviter les soucis de navigation
            if (typeof window !== "undefined") {
              window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
            }
          }
          return;
        }

        // Vérifier si une session existe déjà (par exemple après actualisation)
        const { data: existingSession } = await supabase.auth.getSession();
        if (existingSession?.session && !cancelled) {
          setEmail(existingSession.session.user.email ?? emailParam ?? null);
          setStatus("ready");
          return;
        }

        // Lien incomplet : rediriger vers la connexion club avec message
        if (typeFromHash === "invite" && !accessToken && !inviteToken) {
          throw new Error("Lien d'invitation incomplet. Réessayez.");
        }

        throw new Error("Lien d'invitation invalide ou déjà utilisé.");
      } catch (err: any) {
        console.error("[clubs/signup] Invitation error:", err);
        if (!cancelled) {
          setError(err?.message || "Impossible de valider cette invitation.");
          setStatus("error");
        }
      }
    }

    handleInvite();

    return () => {
      cancelled = true;
    };
  }, [searchParams, supabase.auth]);

  const handleSetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!password || password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        throw updateError;
      }

      await fetch("/api/clubs/activate-admin", {
        method: "POST",
        credentials: "include",
      }).catch((err) => {
        console.warn("[clubs/signup] activate-admin warning", err);
      });

      await supabase.auth.signOut();

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("club_signup_success", "1");
      }

      setStatus("success");
      setTimeout(() => {
        router.push("/clubs/login");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      console.error("[clubs/signup] Password setup error:", err);
      setError(err?.message || "Impossible d'enregistrer le mot de passe. Réessayez plus tard.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="text-3xl mb-4 animate-pulse">🚀</div>
          <p className="text-white/70">Validation de votre invitation en cours...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-md rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-center">
          <div className="text-4xl mb-3">😕</div>
          <h1 className="text-xl font-semibold mb-2">Invitation invalide</h1>
          <p className="text-sm text-white/70 mb-4">
            {error || "Cette invitation n'est plus valide ou a déjà été utilisée."}
          </p>
          <p className="text-xs text-white/40">
            Contactez le propriétaire du club pour obtenir une nouvelle invitation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <div className="text-sm uppercase tracking-[0.3em] text-white/40 mb-2">Invitation administrateur</div>
        <h1 className="text-2xl font-extrabold mb-3">Définir votre mot de passe</h1>
        <p className="text-sm text-white/70 mb-6">
          {email
            ? `Votre invitation est associée à l'adresse ${email}. Choisissez votre mot de passe pour accéder au dashboard du club.`
            : "Définissez votre mot de passe pour accéder au dashboard du club."}
        </p>

        <form onSubmit={handleSetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-white/50 mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-white/50 mb-2">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-[#00CC99] to-[#0066FF] text-white font-semibold hover:shadow-[0_0_25px_rgba(0,102,255,0.35)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Enregistrement..." : "Enregistrer le mot de passe"}
          </button>
        </form>

        <p className="mt-6 text-xs text-white/50">
          Une fois le mot de passe enregistré, vous serez redirigé vers la page de connexion du compte club.
        </p>
      </div>
    </div>
  );
}

