import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { canSeeSeasons } from "@/lib/feature-flags";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canSeeSeasons(user.email)) return NextResponse.json({ season: null });

    // Get player's club_id
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("club_id")
      .eq("id", user.id)
      .maybeSingle();

    // Try club-specific season first, then global (date-based detection)
    const today = new Date().toISOString().split("T")[0];
    let season = null;

    if (profile?.club_id) {
      const { data: clubSeason } = await supabaseAdmin
        .from("seasons")
        .select("*, season_rewards(*)")
        .in("status", ["active", "upcoming"])
        .eq("club_id", profile.club_id)
        .lte("start_date", today)
        .gte("end_date", today)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      season = clubSeason;
    }

    if (!season) {
      const { data: globalSeason } = await supabaseAdmin
        .from("seasons")
        .select("*, season_rewards(*)")
        .in("status", ["active", "upcoming"])
        .is("club_id", null)
        .lte("start_date", today)
        .gte("end_date", today)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      season = globalSeason;
    }

    return NextResponse.json({ season: season || null });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
