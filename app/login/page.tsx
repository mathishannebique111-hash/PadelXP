import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EmailLoginForm from "@/components/auth/EmailLoginForm";
import Link from "next/link";
import LoginSuccessMessage from "@/components/auth/LoginSuccessMessage";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { "password-reset"?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("club_slug, has_completed_onboarding, is_admin")
      .eq("id", user.id)
      .maybeSingle();
    
    if (profile) {
      // Si l'utilisateur est admin, rediriger vers l'interface admin (pas d'onboarding)
      if (profile.is_admin) {
        redirect("/admin/messages");
      }
      
      // Vérifier si l'onboarding est complété (uniquement pour les non-admins)
      if (!profile.has_completed_onboarding) {
        // Rediriger vers l'onboarding si pas encore complété
        redirect("/player/onboarding");
      }
      // L'utilisateur a un profil joueur, le rediriger vers l'espace joueur
      // TOUJOURS rediriger vers /home pour garantir l'affichage du menu hamburger et du logo du club
      // /home utilise le layout (protected) qui contient PlayerSidebar et PlayerClubLogo
      redirect("/home");
    }
  }

  const showPasswordResetSuccess = searchParams?.["password-reset"] === "success";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-6">
      <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 p-6">
        <h1 className="text-xl font-extrabold mb-2">Connexion</h1>
        <p className="text-white/70 mb-5 text-xs opacity-70">Bon retour sur PadelXP !</p>
        {showPasswordResetSuccess && <LoginSuccessMessage />}
        <EmailLoginForm />
        <div className="mt-4 text-center text-sm text-white/70">
          Pas encore membre ?{" "}
          <Link href="/player/signup" className="underline">
            S'inscrire
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


