import { createClient } from "@/lib/supabase/client";

export async function getUserClubIdClient(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("[getUserClubIdClient] Error fetching user:", userError);
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("club_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[getUserClubIdClient] Error fetching profile:", profileError);
    return null;
  }

  return profile?.club_id || null;
}


