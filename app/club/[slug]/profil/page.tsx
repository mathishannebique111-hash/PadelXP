import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HomePage from "@/app/(protected)/home/page";

export default async function ClubProfilPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Vérifier que le slug correspond au club de l'utilisateur
  const { data: profile } = await supabase
    .from("profiles")
    .select("club_slug, club_id")
    .eq("id", user.id)
    .single();

  let userClubSlug = profile?.club_slug || null;
  if (!userClubSlug && profile?.club_id) {
    const { data: club } = await supabase
      .from("clubs")
      .select("slug")
      .eq("id", profile.club_id)
      .single();
    userClubSlug = club?.slug || null;
  }

  // Si le slug ne correspond pas, rediriger vers le bon club ou la page home
  if (userClubSlug && userClubSlug !== params.slug) {
    redirect(`/club/${userClubSlug}/profil`);
  }

  return <HomePage />;
}

