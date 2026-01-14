import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EmailLoginForm from "@/components/auth/EmailLoginForm";
import Link from "next/link";
import LoginSuccessMessage from "@/components/auth/LoginSuccessMessage";
import HideSplashScreen from "@/components/HideSplashScreen";

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
    <>
      <HideSplashScreen />
      <div className="relative min-h-screen flex flex-col items-center justify-center text-white px-6 overflow-hidden">
        {/* Halos vert et bleu - Ne pas remettre le fond bleu ni le dégradé car ils sont dans le layout (pour éviter le décalage de couleur) */}
        <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-[#BFFF00] rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        <div className="relative z-10 w-full max-w-md rounded-2xl bg-white/15 border border-white/20 backdrop-blur-md p-6">
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
      </div>
    </>
  );
}
