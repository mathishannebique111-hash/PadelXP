import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EmailLoginForm from "@/components/auth/EmailLoginForm";
import Link from "next/link";

export default async function LoginPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("club_slug")
      .eq("id", user.id)
      .maybeSingle();
    
    if (profile) {
      // L'utilisateur a un profil joueur, le rediriger vers l'espace joueur
      redirect(profile.club_slug ? `/club/${profile.club_slug}/profil` : "/home");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-6">
      <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 p-8">
        <h1 className="text-2xl font-extrabold mb-2">Connexion</h1>
        <p className="text-white/60 mb-6 text-sm">Connectez-vous à votre compte pour accéder à votre espace.</p>
        <EmailLoginForm />
        <div className="mt-4 text-center text-sm text-white/70">
          Pas encore de compte ? <Link href="/player/signup" className="underline">S'inscrire en tant que joueur</Link>
        </div>
      </div>
    </div>
  );
}


