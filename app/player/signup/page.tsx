import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientLogin from "@/app/login/ClientLogin";

export default async function PlayerSignupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("club_slug")
      .eq("id", user.id)
      .maybeSingle();
    redirect(profile?.club_slug ? `/club/${profile.club_slug}/profil` : "/home");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-6">
      <ClientLogin />
    </div>
  );
}


