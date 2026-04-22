import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CoachPageWrapper from "@/components/coach/CoachPageWrapper";
import { getCoachName } from "@/lib/coach/coach-names";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const coachName = getCoachName(user.id);

  return (
    <div className="coach-page-wrapper mx-auto max-w-2xl px-4">
      <CoachPageWrapper userId={user.id} coachName={coachName} />
    </div>
  );
}
