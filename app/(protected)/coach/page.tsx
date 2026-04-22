import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CoachChat from "@/components/coach/CoachChat";
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
    <div className="mx-auto max-w-2xl px-4 pt-2">
      <CoachChat userId={user.id} coachName={coachName} />
    </div>
  );
}
