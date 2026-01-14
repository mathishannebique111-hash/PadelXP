import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientLogin from "@/app/login/ClientLogin";
import HideSplashScreen from "@/components/HideSplashScreen";

export default async function PlayerSignupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    // TOUJOURS rediriger vers /home pour garantir l'affichage du menu hamburger et du logo du club
    // /home utilise le layout (protected) qui contient PlayerSidebar et PlayerClubLogo
    redirect("/home");
  }

  return (
    <>
      <HideSplashScreen />
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-6">
        <ClientLogin />
        <div className="mt-6 text-[11px] text-white/50 flex flex-wrap justify-center gap-3">
          <a href="/player/legal" className="hover:text-white underline-offset-2 hover:underline">
            Mentions légales joueurs
          </a>
          <span>•</span>
          <a href="/player/terms" className="hover:text-white underline-offset-2 hover:underline">
            CGU joueurs
          </a>
          <span>•</span>
          <a href="/player/privacy" className="hover:text-white underline-offset-2 hover:underline">
            Confidentialité joueurs
          </a>
          <span>•</span>
          <a href="/player/cookies" className="hover:text-white underline-offset-2 hover:underline">
            Cookies joueurs
          </a>
        </div>
      </div>
    </>
  );
}
