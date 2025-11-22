import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientLogin from "@/app/login/ClientLogin";

export default async function PlayerSignupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    // TOUJOURS rediriger vers /home pour garantir l'affichage du menu hamburger et du logo du club
    // /home utilise le layout (protected) qui contient PlayerSidebar et PlayerClubLogo
    redirect("/home");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-6">
      <ClientLogin />
    </div>
  );
}


