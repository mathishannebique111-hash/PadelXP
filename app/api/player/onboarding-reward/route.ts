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
    // Dedup check
    const { data: profile } = await admin
      .from("profiles")
      .select("onboarding_reward_claimed, points")
      .eq("id", user.id)
      .single();

    if (profile?.onboarding_reward_claimed) {
      return NextResponse.json({ already_awarded: true });
    }

    // Award points — SAME way as challenge rewards: profiles.points
    const currentPoints = profile?.points || 0;
    const newPoints = currentPoints + REWARD_POINTS;

    const { error: updateError } = await admin
      .from("profiles")
      .update({ points: newPoints, onboarding_reward_claimed: true })
      .eq("id", user.id);

    if (updateError) {
      logger.error("[onboarding-reward] Update failed", updateError);
      return NextResponse.json({ error: "Erreur lors de l'ajout des points" }, { status: 500 });
    }

    // Verify write
    const { data: verify } = await admin
      .from("profiles")
      .select("points")
      .eq("id", user.id)
      .single();

    logger.info(`[onboarding-reward] Awarded ${REWARD_POINTS} pts to ${user.id.substring(0, 8)}... (${currentPoints} -> ${verify?.points})`);

    // Create notification (best-effort)
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
    }

    return NextResponse.json({ success: true, points: newPoints });

  } catch (error: any) {
    logger.error("[onboarding-reward] Unexpected error", { error: error?.message || String(error) });
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
