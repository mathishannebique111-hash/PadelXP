"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    async function handleResetToken() {
      try {
        const supabase = createClient();

        // 1. Check if user is already logged in (active session)
        const { data: { user: existingUser } } = await supabase.auth.getUser();
        if (existingUser) {
          setIsValid(true);
          setLoading(false);
          return;
        }

        // 2. Handle PKCE Flow (code in query params)
        const code = searchParams && searchParams.get("code");
        if (code) {
          const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
          if (sessionError) {
            console.error("Error exchanging code for session:", sessionError);
            setError("Le lien est invalide ou a expiré.");
            setLoading(false);
            return;
          }

          // Verify session is active
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            setIsValid(true);
            setLoading(false);
            // Clean URL
            window.history.replaceState(null, "", "/reset-password");
            return;
          }
        }

        // 3. Handle Implicit Flow (access_token in hash - legacy/fallback)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const type = hashParams.get("type");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && type === "recovery" && refreshToken) {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError || !data.session) {
            setError("Lien de réinitialisation invalide ou expiré.");
            setLoading(false);
            return;
          }

          // Clean URL
          window.history.replaceState(null, "", "/reset-password");
          setIsValid(true);
          setLoading(false);
          return;
        }

        // If neither flow worked and we aren't logged in:
        setError("Lien de réinitialisation introuvable ou invalide.");
        setLoading(false);

      } catch (err: any) {
        console.error("Reset password error:", err);
        setError(err?.message || "Une erreur est survenue.");
        setLoading(false);
      }
    }

    handleResetToken();
  }, [router, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-6">
        <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/70 text-sm">Vérification du lien...</p>
        </div>
      </div>
    );
  }

  if (error || !isValid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-6">
        <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 p-6">
          <div className="rounded-md border border-red-400 bg-red-900/20 px-3 py-2 text-xs text-red-400 mb-4">
            {error || "Lien invalide"}
          </div>
          <p className="text-white/70 text-sm mb-4">
            Redirection vers la page de demande...
          </p>
          <Link
            href="/forgot-password"
            className="text-sm text-white/70 hover:text-white underline transition-colors flex items-center justify-center gap-1"
          >
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-6">
      <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 p-6">
        <h1 className="text-xl font-extrabold mb-2">Réinitialisation du mot de passe</h1>
        <p className="text-white/70 mb-5 text-xs opacity-70">
          Veuillez choisir votre nouveau mot de passe ci-dessous.
        </p>
        <ResetPasswordForm />
      </div>
    </div>
  );
}
