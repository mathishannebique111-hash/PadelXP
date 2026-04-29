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

  try {
    // Dedup: check profile flag first, then notifications
    const { data: profile } = await admin
      .from("profiles")
      .select("onboarding_reward_claimed, global_points, club_id")
      .eq("id", user.id)
      .single();

    if (profile?.onboarding_reward_claimed) {
      return NextResponse.json({ already_awarded: true });
    }

    // Secondary dedup: check notifications
    const { data: existingNotif } = await admin
      .from("notifications")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", "onboarding_reward")
      .limit(1);

    if (existingNotif && existingNotif.length > 0) {
      // Fix state: set the profile flag too
      await admin.from("profiles").update({ onboarding_reward_claimed: true }).eq("id", user.id);
      return NextResponse.json({ already_awarded: true });
    }

    // Award points atomically via RPC
    const { error: rpcError } = await admin.rpc('increment_global_points', {
      p_user_id: user.id,
      p_points: REWARD_POINTS
    });

    if (rpcError) {
      logger.warn("[onboarding-reward] RPC failed, using fallback", rpcError);
      const newPoints = (profile?.global_points || 0) + REWARD_POINTS;
      await admin.from("profiles").update({ global_points: newPoints }).eq("id", user.id);
    }

    // Mark reward as claimed on profile
    const { error: updateError } = await admin
      .from("profiles")
      .update({ onboarding_reward_claimed: true })
      .eq("id", user.id);

    if (updateError) {
      logger.error("[onboarding-reward] Failed to set onboarding_reward_claimed", updateError);
    }

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

    // Create dedup notification
    const { error: notifError } = await admin.from("notifications").insert({
      user_id: user.id,
      type: "onboarding_reward",
      title: "Onboarding terminé",
      message: `+${REWARD_POINTS} points pour avoir complété ton onboarding !`,
      data: { type: "onboarding_reward", points: REWARD_POINTS },
      is_read: true,
    });

    if (notifError) {
      logger.warn("[onboarding-reward] Notification insert failed", notifError);
      // Fallback: try system type
      const { error: fallbackError } = await admin.from("notifications").insert({
        user_id: user.id,
        type: "system",
        title: "Onboarding terminé",
        message: `+${REWARD_POINTS} points pour avoir complété ton onboarding !`,
        data: { type: "onboarding_reward", points: REWARD_POINTS },
        is_read: true,
      });
      if (fallbackError) {
        logger.error("[onboarding-reward] System notification also failed", fallbackError);
      }
    }

    logger.info(`[onboarding-reward] Awarded ${REWARD_POINTS} points to ${user.id.substring(0, 8)}...`);
    return NextResponse.json({ success: true, points: REWARD_POINTS });

  } catch (error: any) {
    logger.error("[onboarding-reward] Unexpected error", { error: error?.message || String(error) });
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
