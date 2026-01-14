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
      <div className="relative min-h-screen flex flex-col items-center justify-center text-white px-6 overflow-hidden">
        {/* Halos vert et bleu - Fond layout suffisant */}
        <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-[#BFFF00] rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        <div className="relative z-10 w-full flex flex-col items-center">
          <ClientLogin />
        </div>
      </div>
    </>
  );
}
