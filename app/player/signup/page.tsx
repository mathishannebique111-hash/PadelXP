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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#172554] text-white px-6">
        <ClientLogin />
      </div>
    </>
  );
}
