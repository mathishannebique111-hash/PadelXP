import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() { /* read-only */ },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Check 1: profile columns
  const profileQuery = await admin
    .from("profiles")
    .select("niveau_padel, onboarding_reward_claimed, global_points, has_completed_onboarding")
    .eq("id", user.id)
    .single();

  // Check 2: match_participants
  const matchQuery = await admin
    .from("match_participants")
    .select("id")
    .eq("user_id", user.id)
    .eq("player_type", "user")
    .limit(1);

  // Check 3: notification with type onboarding_reward
  const notifQuery = await admin
    .from("notifications")
    .select("id, type, data")
    .eq("user_id", user.id)
    .eq("type", "onboarding_reward")
    .limit(5);

  // Check 4: notification with type system and data onboarding_reward
  const systemNotifQuery = await admin
    .from("notifications")
    .select("id, type, data")
    .eq("user_id", user.id)
    .eq("type", "system")
    .limit(5);

  return NextResponse.json({
    userId: user.id,
    profile: { data: profileQuery.data, error: profileQuery.error?.message || null },
    matchParticipants: { count: matchQuery.data?.length ?? 0, error: matchQuery.error?.message || null },
    onboardingRewardNotif: { data: notifQuery.data, error: notifQuery.error?.message || null },
    systemNotifs: { data: systemNotifQuery.data, error: systemNotifQuery.error?.message || null },
  }, { headers: { "Cache-Control": "no-store" } });
}
