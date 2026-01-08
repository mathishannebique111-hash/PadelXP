"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    async function handleResetToken() {
      try {
        const supabase = createClient();
        
        // Vérifier si l'utilisateur est déjà connecté (session existante)
        const { data: { user: existingUser } } = await supabase.auth.getUser();
        if (existingUser) {
          setIsValid(true);
          setLoading(false);
          return;
        }

        // Extraire le hash de l'URL (fragment)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const type = hashParams.get("type");
        const refreshToken = hashParams.get("refresh_token");

        // Si pas de token dans le hash, vérifier s'il y a un token dans les query params (fallback)
        if (!accessToken || type !== "recovery") {
          // Vérifier les query params au cas où
          const urlParams = new URLSearchParams(window.location.search);
          const tokenFromQuery = urlParams.get("token");
          
          if (!tokenFromQuery) {
            setError("Lien de réinitialisation invalide ou expiré.");
            setLoading(false);
            setTimeout(() => {
              router.push("/forgot-password");
            }, 3000);
            return;
          }
        }

        // Si on a un access_token dans le hash, créer la session
        if (accessToken && type === "recovery" && refreshToken) {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError || !data.session) {
            setError("Lien de réinitialisation invalide ou expiré.");
            setLoading(false);
            setTimeout(() => {
              router.push("/forgot-password");
            }, 3000);
            return;
          }

          // Nettoyer l'URL en supprimant le hash
          window.history.replaceState(null, "", "/reset-password");
        }

        // Vérifier que l'utilisateur est maintenant connecté
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError("Impossible de valider votre session. Veuillez réessayer.");
          setLoading(false);
          setTimeout(() => {
            router.push("/forgot-password");
          }, 3000);
          return;
        }

        setIsValid(true);
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || "Une erreur est survenue.");
        setLoading(false);
        setTimeout(() => {
          router.push("/forgot-password");
        }, 3000);
      }
    }

    handleResetToken();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-6">
        <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/70 text-sm">Vérification du lien de réinitialisation...</p>
        </div>
      </div>
    );
  }

  if (error || !isValid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-6">
        <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 p-6">
          <div className="rounded-md border border-red-400 bg-red-900/20 px-3 py-2 text-xs text-red-400 mb-4">
            {error || "Lien de réinitialisation invalide ou expiré."}
          </div>
          <p className="text-white/70 text-sm mb-4">
            Redirection vers la page de réinitialisation...
          </p>
          <Link
            href="/forgot-password"
            className="text-sm text-white/70 hover:text-white underline transition-colors flex items-center justify-center gap-1"
          >
            Cliquez ici si la redirection ne fonctionne pas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-6">
      <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 p-6">
        <h1 className="text-xl font-extrabold mb-2">Nouveau mot de passe</h1>
        <p className="text-white/70 mb-5 text-xs opacity-70">
          Choisissez un nouveau mot de passe sécurisé.
        </p>
        <ResetPasswordForm />
        <div className="mt-4 text-center">
          <Link
            href="/login"
            className="text-sm text-white/70 hover:text-white underline transition-colors flex items-center justify-center gap-1"
          >
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Retour à la connexion
          </Link>
        </div>
      </div>
      <div className="mt-6 text-[11px] text-white/50 flex flex-wrap justify-center gap-3">
        <Link href="/player/legal" className="hover:text-white underline-offset-2 hover:underline">
          Mentions légales joueurs
        </Link>
        <span>•</span>
        <Link href="/player/terms" className="hover:text-white underline-offset-2 hover:underline">
          CGU joueurs
        </Link>
        <span>•</span>
        <Link href="/player/privacy" className="hover:text-white underline-offset-2 hover:underline">
          Confidentialité joueurs
        </Link>
        <span>•</span>
        <Link href="/player/cookies" className="hover:text-white underline-offset-2 hover:underline">
          Cookies joueurs
        </Link>
      </div>
    </div>
  );
}
