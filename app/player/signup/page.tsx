import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientLogin from "@/app/login/ClientLogin";
import HideSplashScreen from "@/components/HideSplashScreen";

export default async function PlayerSignupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("club_slug")
      .eq("id", user.id)
      .maybeSingle();

    // Si l'utilisateur a déjà un club, rediriger vers /home
    if (profile?.club_slug) {
      // TOUJOURS rediriger vers /home pour garantir l'affichage du menu hamburger et du logo du club
      // /home utilise le layout (protected) qui contient PlayerSidebar et PlayerClubLogo
      redirect("/home");
    }

    // Sinon, l'inscription est incomplète - laisser continuer l'étape 2
  }

  return (
    <>
      <HideSplashScreen />
      <div className="relative min-h-screen flex flex-col items-center justify-center text-white px-6 overflow-hidden">
        {/* Background global pour correspondre aux pages joueur */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/80 to-black z-0 pointer-events-none" />

        {/* Logo en haut de la page */}
        <div className="absolute top-8 left-0 right-0 z-20 flex justify-center is-app:top-20 pointer-events-none">
          <img
            src="/images/Logo sans fond.png"
            alt="PadelXP Logo"
            className="w-28 h-auto object-contain opacity-90 drop-shadow-2xl pointer-events-none"
          />
        </div>

        <div className="relative z-[50] w-full flex flex-col items-center justify-center flex-1">
          <ClientLogin />
        </div>
      </div>
    </>
  );
}
