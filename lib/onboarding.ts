import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export interface OnboardingStatus {
  accountCreated: boolean; // always true (user exists)
  levelEvaluated: boolean;
  firstMatchPlayed: boolean;
  rewardClaimed: boolean;
}

/**
 * Server-side: fetch onboarding status for a user.
 * Called from the protected layout for SSR pre-fetch.
 */
export async function getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [profileRes, matchRes, rewardNotifRes] = await Promise.all([
    admin
      .from("profiles")
      .select("niveau_padel, onboarding_reward_claimed")
      .eq("id", userId)
      .single(),
    admin
      .from("match_participants")
      .select("id")
      .eq("user_id", userId)
      .eq("player_type", "user")
      .limit(1),
    // Fallback: check notifications table (onboarding_reward OR system with matching data)
    admin
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .or('type.eq.onboarding_reward,data->>type.eq.onboarding_reward')
      .limit(1),
  ]);

  // If profile query failed (e.g. column doesn't exist), try without the new column
  let levelEvaluated = false;
  let rewardClaimedFromProfile = false;

  if (profileRes.data) {
    levelEvaluated = profileRes.data.niveau_padel != null;
    rewardClaimedFromProfile = (profileRes.data as any).onboarding_reward_claimed === true;
  } else if (profileRes.error) {
    // Column might not exist — retry with just niveau_padel
    const { data: fallbackProfile } = await admin
      .from("profiles")
      .select("niveau_padel")
      .eq("id", userId)
      .single();
    levelEvaluated = fallbackProfile?.niveau_padel != null;
  }

  // rewardClaimed = profile flag OR notification exists (belt and suspenders)
  const rewardClaimedFromNotif = (rewardNotifRes.data?.length ?? 0) > 0;

  return {
    accountCreated: true,
    levelEvaluated,
    firstMatchPlayed: (matchRes.data?.length ?? 0) > 0,
    rewardClaimed: rewardClaimedFromProfile || rewardClaimedFromNotif,
  };
}
