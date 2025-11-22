import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ClubProfilPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Rediriger TOUJOURS vers /home pour garantir l'affichage du menu hamburger et du logo du club
  // /home utilise le layout (protected) qui contient PlayerSidebar et PlayerClubLogo
  // Cette page était utilisée pour l'ancienne redirection après inscription/connexion
  // Maintenant, toutes les redirections vont vers /home qui affiche correctement le menu et le logo
  redirect("/home");
}

