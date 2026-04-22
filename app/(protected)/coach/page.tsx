import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import nextDynamic from "next/dynamic";
import CoachChat from "@/components/coach/CoachChat";
import CoachPageTabs from "@/components/coach/CoachPageTabs";
import { getCoachName } from "@/lib/coach/coach-names";

export const dynamic = "force-dynamic";

const OracleTab = nextDynamic(() => import("@/components/OracleTab"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
    </div>
  ),
});

export default async function CoachPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const coachName = getCoachName(user.id);

  return (
    <div className="coach-page-wrapper mx-auto max-w-2xl px-4">
      <CoachPageTabs
        coachName={coachName}
        chatContent={<CoachChat userId={user.id} coachName={coachName} />}
        oracleContent={<OracleTab selfId={user.id} />}
      />
    </div>
  );
}
