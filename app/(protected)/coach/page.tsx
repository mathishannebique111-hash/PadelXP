import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PageTitle from "@/components/PageTitle";
import CoachChat from "@/components/coach/CoachChat";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-2">
      <PageTitle subtitle="Ton coach personnel expert en padel">
        Coach IA
      </PageTitle>
      <div className="mt-4">
        <CoachChat userId={user.id} />
      </div>
    </div>
  );
}
