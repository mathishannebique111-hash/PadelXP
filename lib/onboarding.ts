import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export interface OnboardingStatus {
  accountCreated: boolean;
  levelEvaluated: boolean;
  firstMatchPlayed: boolean;
  rewardClaimed: boolean;
}

export async function getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Query 1: profile (with fallback if onboarding_reward_claimed column missing)
  let levelEvaluated = false;
  let rewardClaimedProfile = false;

  const { data: profileData, error: profileError } = await admin
    .from("profiles")
    .select("niveau_padel, onboarding_reward_claimed")
    .eq("id", userId)
    .single();

  if (profileData) {
    levelEvaluated = profileData.niveau_padel != null;
    rewardClaimedProfile = profileData.onboarding_reward_claimed === true;
  } else if (profileError) {
    // Column might not exist, retry without it
    const { data: fallback } = await admin
      .from("profiles")
      .select("niveau_padel")
      .eq("id", userId)
      .single();
    levelEvaluated = fallback?.niveau_padel != null;
  }

  // Query 2: match participation (table has no "id" column — use match_id)
  const { data: matchData } = await admin
    .from("match_participants")
    .select("match_id")
    .eq("user_id", userId)
    .eq("player_type", "user")
    .limit(1);

  const firstMatchPlayed = (matchData?.length ?? 0) > 0;

  // Query 3: reward notification (simple type check, no JSONB syntax)
  let rewardClaimedNotif = false;
  const { data: notifData } = await admin
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "onboarding_reward")
    .limit(1);

  rewardClaimedNotif = (notifData?.length ?? 0) > 0;

  const result = {
    accountCreated: true,
    levelEvaluated,
    firstMatchPlayed,
    rewardClaimed: rewardClaimedProfile || rewardClaimedNotif,
  };

  return result;
}
