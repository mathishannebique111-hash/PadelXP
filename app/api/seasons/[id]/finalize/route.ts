import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin-auth";
import { calculateSeasonLeaderboardForCountry } from "@/lib/utils/season-leaderboard-utils";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdmin(user.email)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const { data: season, error: seasonError } = await supabaseAdmin
      .from("seasons")
      .select("*")
      .eq("id", id)
      .single();

    if (seasonError || !season) return NextResponse.json({ error: "Season not found" }, { status: 404 });
    if (season.status === "completed") return NextResponse.json({ error: "Season already finalized" }, { status: 400 });

    const countries: string[] = season.countries || ["FR", "BE"];
    const dateRange = { start: season.start_date, end: season.end_date };
    const allResults: { country: string; top3: { rank: number; player_name: string; points: number }[] }[] = [];

    for (const country of countries) {
      const leaderboard = await calculateSeasonLeaderboardForCountry(dateRange, country as "FR" | "BE");

      const resultRows = leaderboard.map((entry) => ({
        season_id: id,
        user_id: entry.user_id,
        final_rank: entry.rank,
        final_points: entry.points,
        wins: entry.wins,
        losses: entry.losses,
        matches_played: entry.matches,
        country,
      }));

      if (resultRows.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from("season_results")
          .insert(resultRows);
        if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      allResults.push({
        country,
        top3: leaderboard.slice(0, 3).map(e => ({ rank: e.rank, player_name: e.player_name, points: e.points })),
      });
    }

    await supabaseAdmin.from("seasons").update({ status: "completed" }).eq("id", id);

    return NextResponse.json({ success: true, results: allResults });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
