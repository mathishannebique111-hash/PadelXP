import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

export const dynamic = "force-dynamic";

export default async function PlayerOnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Vérifier si l'utilisateur a déjà complété l'onboarding
  const { data: profile } = await supabase
    .from("profiles")
    .select("has_completed_onboarding, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  // Si l'utilisateur est admin, rediriger vers l'interface admin (pas d'onboarding)
  if (profile?.is_admin) {
    redirect("/admin/messages");
  }

  // Si l'onboarding est déjà complété, rediriger vers /home
  if (profile?.has_completed_onboarding) {
    redirect("/home");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-black to-black">
      <OnboardingWizard />
    </div>
  );
}
