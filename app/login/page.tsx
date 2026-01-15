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

      // IMPORTANT: Vérifier que le joueur a un club assigné
      // Si l'inscription a été interrompue après l'étape 1, le profil existe mais sans club_slug
      if (!profile.club_slug) {
        // Inscription incomplète - rediriger vers signup pour terminer l'étape 2
        redirect("/player/signup");
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
        {/* Background global pour correspondre aux pages joueur */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/80 to-black z-0 pointer-events-none" />

        {/* Logo en haut de la page */}
        <div className="absolute top-8 left-0 right-0 z-20 flex justify-center is-app:top-20">
          <img
            src="/images/Logo sans fond.png"
            alt="PadelXP Logo"
            className="w-28 h-auto object-contain opacity-90 drop-shadow-2xl"
          />
        </div>

        <div className="relative z-10 w-full max-w-md rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md p-6 shadow-xl">
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
