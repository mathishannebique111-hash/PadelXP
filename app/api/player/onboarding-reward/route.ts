import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const REWARD_POINTS = 20;

export async function POST() {
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

  // Dedup: check if already awarded (look for a notification)
  const { data: existing } = await admin
    .from("notifications")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "onboarding_reward")
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ already_awarded: true });
  }

  // Award points
  const { data: profile } = await admin
    .from("profiles")
    .select("global_points")
    .eq("id", user.id)
    .single();

  const newPoints = (profile?.global_points || 0) + REWARD_POINTS;

  await admin
    .from("profiles")
    .update({ global_points: newPoints })
    .eq("id", user.id);

  // Also update club points if user has a club
  const { data: userClub } = await admin
    .from("user_clubs")
    .select("club_id, club_points")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (userClub) {
    await admin
      .from("user_clubs")
      .update({ club_points: (userClub.club_points || 0) + REWARD_POINTS })
      .eq("user_id", user.id)
      .eq("club_id", userClub.club_id);
  }

  // Create dedup notification
  await admin.from("notifications").insert({
    user_id: user.id,
    type: "onboarding_reward",
    title: "Onboarding termine",
    message: `+${REWARD_POINTS} points pour avoir complete ton onboarding !`,
    data: { type: "onboarding_reward", points: REWARD_POINTS },
    is_read: true,
    read: true,
  }).catch(() => { /* ignore if type not in CHECK constraint */ });

  logger.info(`[onboarding-reward] Awarded ${REWARD_POINTS} points to ${user.id}`);

  return NextResponse.json({ success: true, points: REWARD_POINTS });
}
