import { createClient } from "@/lib/supabase/server";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import Link from "next/link";

export default async function ForgotPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    // Si l'utilisateur est déjà connecté, rediriger vers home
    const { data: profile } = await supabase
      .from("profiles")
      .select("club_slug")
      .eq("id", user.id)
      .maybeSingle();
    
    if (profile) {
      const { redirect } = await import("next/navigation");
      redirect("/home");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-6">
      <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 p-6">
        <h1 className="text-xl font-extrabold mb-2">Mot de passe oublié ?</h1>
        <p className="text-white/70 mb-5 text-xs opacity-70">
          Entrez votre email, nous vous enverrons un lien de réinitialisation.
        </p>
        <ForgotPasswordForm />
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
