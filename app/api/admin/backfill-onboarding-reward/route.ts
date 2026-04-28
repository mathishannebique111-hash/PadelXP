import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const REWARD_POINTS = 20;

/**
 * One-time backfill: award 20 onboarding points to all existing users
 * who have completed onboarding (have level + have played matches)
 * but never received the reward.
 *
 * Call manually: GET /api/admin/backfill-onboarding-reward?secret=CRON_SECRET
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET && secret !== process.env.SUBSCRIPTION_CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    // Find users who have level evaluated AND have played matches
    const { data: eligibleUsers, error } = await admin
      .from("profiles")
      .select("id, global_points")
      .not("niveau_padel", "is", null)
      .gt("matchs_joues", 0);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!eligibleUsers || eligibleUsers.length === 0) {
      return NextResponse.json({ message: "No eligible users", awarded: 0 });
    }

    // Check who already got the reward
    const userIds = eligibleUsers.map(u => u.id);
    const { data: alreadyAwarded } = await admin
      .from("notifications")
      .select("user_id")
      .in("user_id", userIds)
      .eq("type", "onboarding_reward");

    const awardedSet = new Set((alreadyAwarded || []).map(n => n.user_id));

    let awarded = 0;

    for (const user of eligibleUsers) {
      if (awardedSet.has(user.id)) continue;

      // Award global points
      await admin
        .from("profiles")
        .update({ global_points: (user.global_points || 0) + REWARD_POINTS })
        .eq("id", user.id);

      // Award club points
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

      // Mark as awarded
      await admin.from("notifications").insert({
        user_id: user.id,
        type: "onboarding_reward",
        title: "Onboarding termine",
        message: `+${REWARD_POINTS} points pour avoir complete ton onboarding !`,
        data: { type: "onboarding_reward", points: REWARD_POINTS, backfill: true },
        is_read: true,
        read: true,
      }).catch(() => {});

      awarded++;
    }

    logger.info(`[backfill-onboarding-reward] Awarded ${awarded} users`);

    return NextResponse.json({
      success: true,
      eligible: eligibleUsers.length,
      alreadyAwarded: awardedSet.size,
      awarded,
    });
  } catch (err) {
    logger.error("[backfill-onboarding-reward] Error", { error: (err as Error).message });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
