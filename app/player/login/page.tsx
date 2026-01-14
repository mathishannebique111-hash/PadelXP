import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EmailLoginForm from "@/components/auth/EmailLoginForm";
import Link from "next/link";
import HideSplashScreen from "@/components/HideSplashScreen";

export default async function PlayerLoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("club_slug")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      // L'utilisateur a un profil joueur, le rediriger vers l'espace joueur
      // TOUJOURS rediriger vers /home pour garantir l'affichage du menu hamburger et du logo du club
      // /home utilise le layout (protected) qui contient PlayerSidebar et PlayerClubLogo
      redirect("/home");
    }
  }

  return (
    <>
      <HideSplashScreen />
      <div className="relative min-h-screen flex flex-col items-center justify-center text-white px-6 overflow-hidden">
        {/* Background avec halos vert et bleu - Fond du layout utilisé s'il existe (sur web), sinon transparent */}
        <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-[#BFFF00] rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        <div className="relative z-10 w-full max-w-md rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md p-6">
          <h1 className="text-2xl font-extrabold mb-2">Connexion joueur</h1>
          <p className="text-white/60 mb-6 text-sm">
            Connectez-vous avec votre email et mot de passe pour accéder à votre club.
          </p>
          <EmailLoginForm />
          <div className="mt-4 text-center text-sm text-white/70">
            Pas encore de compte ?{" "}
            <Link href="/player/signup" prefetch={false} className="underline">
              Créer un compte joueur
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
