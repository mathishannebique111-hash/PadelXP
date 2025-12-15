import { createClient } from "@/lib/supabase/client";
import { logger, logError } from "@/lib/logger";

export async function getUserClubIdClient(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    logger.error("[getUserClubIdClient] Error fetching user", { error: userError?.message });
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("club_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    logger.error("[getUserClubIdClient] Error fetching profile", { error: profileError.message });
    return null;
  }

  return profile?.club_id || null;
}



