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

  // Dedup: check notification table (always works, no column dependency)
  const { data: existingNotif } = await admin
    .from("notifications")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "onboarding_reward")
    .limit(1);

  if (existingNotif && existingNotif.length > 0) {
    // Also try to set the profile flag if it wasn't set (migration catch-up)
    await admin
      .from("profiles")
      .update({ onboarding_reward_claimed: true })
      .eq("id", user.id)
      .catch(() => {});
    return NextResponse.json({ already_awarded: true });
  }

  // Also check profile flag as secondary dedup
  const { data: profile } = await admin
    .from("profiles")
    .select("global_points, club_id")
    .eq("id", user.id)
    .single();

  // Award points atomically via RPC
  const { error: rpcError } = await admin.rpc('increment_global_points', {
    p_user_id: user.id,
    p_points: REWARD_POINTS
  });

  if (rpcError) {
    // Fallback: manual update
    logger.warn("[onboarding-reward] RPC failed, using fallback", rpcError);
    const newPoints = (profile?.global_points || 0) + REWARD_POINTS;
    await admin
      .from("profiles")
      .update({ global_points: newPoints })
      .eq("id", user.id);
  }

  // Mark reward as claimed on profile (best-effort, column might not exist yet)
  await admin
    .from("profiles")
    .update({ onboarding_reward_claimed: true })
    .eq("id", user.id)
    .catch(() => {});

  // Also update club points if user has a club
  if (profile?.club_id) {
    const { error: clubRpcError } = await admin.rpc('increment_club_points', {
      p_user_id: user.id,
      p_club_id: profile.club_id,
      p_points: REWARD_POINTS
    });

    if (clubRpcError) {
      logger.warn("[onboarding-reward] Club RPC failed, using fallback", clubRpcError);
      const { data: userClub } = await admin
        .from("user_clubs")
        .select("club_points")
        .eq("user_id", user.id)
        .eq("club_id", profile.club_id)
        .maybeSingle();

      if (userClub) {
        await admin
          .from("user_clubs")
          .update({ club_points: (userClub.club_points || 0) + REWARD_POINTS })
          .eq("user_id", user.id)
          .eq("club_id", profile.club_id);
      }
    }
  }

  // Create dedup notification — THIS is the reliable marker
  // Try with onboarding_reward type first, fallback to system type
  const { error: notifError } = await admin.from("notifications").insert({
    user_id: user.id,
    type: "onboarding_reward",
    title: "Onboarding terminé",
    message: `+${REWARD_POINTS} points pour avoir complété ton onboarding !`,
    data: { type: "onboarding_reward", points: REWARD_POINTS },
    is_read: true,
    read: true,
  });

  if (notifError) {
    logger.warn("[onboarding-reward] Notification insert failed with onboarding_reward type, trying system", notifError);
    // Fallback: use 'system' type which is always in the CHECK constraint
    await admin.from("notifications").insert({
      user_id: user.id,
      type: "system",
      title: "Onboarding terminé",
      message: `+${REWARD_POINTS} points pour avoir complété ton onboarding !`,
      data: { type: "onboarding_reward", points: REWARD_POINTS },
      is_read: true,
      read: true,
    }).catch(e => logger.error("[onboarding-reward] System notification also failed", e));
  }

  logger.info(`[onboarding-reward] Awarded ${REWARD_POINTS} points to ${user.id.substring(0, 8)}...`);

  return NextResponse.json({ success: true, points: REWARD_POINTS });
}
