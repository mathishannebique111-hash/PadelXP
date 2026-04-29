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
 * Server-side: fetch onboarding status for a user in a single query.
 * Called from the protected layout for SSR pre-fetch.
 */
export async function getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [profileRes, matchRes] = await Promise.all([
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
  ]);

  return {
    accountCreated: true,
    levelEvaluated: profileRes.data?.niveau_padel != null,
    firstMatchPlayed: (matchRes.data?.length ?? 0) > 0,
    rewardClaimed: profileRes.data?.onboarding_reward_claimed === true,
  };
}
