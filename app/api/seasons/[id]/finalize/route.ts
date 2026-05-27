import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { canSeeSeasons } from "@/lib/feature-flags";
import { calculatePlayerLeaderboard } from "@/lib/utils/player-leaderboard-utils";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const dynamic = "force-dynamic";

// POST: finalize a season — freeze leaderboard into season_results
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canSeeSeasons(user.email)) return NextResponse.json({ error: "Feature not available" }, { status: 403 });

    // Fetch the season
    const { data: season, error: seasonError } = await supabaseAdmin
      .from("seasons")
      .select("*")
      .eq("id", id)
      .single();

    if (seasonError || !season) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 });
    }

    if (season.status === "completed") {
      return NextResponse.json({ error: "Season already finalized" }, { status: 400 });
    }

    // Verify user is club admin
    const { data: adminCheck } = await supabaseAdmin
      .from("club_admins")
      .select("id")
      .eq("user_id", user.id)
      .eq("club_id", season.club_id)
      .maybeSingle();

    if (!adminCheck) {
      return NextResponse.json({ error: "Not a club admin" }, { status: 403 });
    }

    // Calculate the season leaderboard
    const leaderboard = await calculatePlayerLeaderboard(season.club_id, {
      start: season.start_date,
      end: season.end_date,
    });

    // Insert season results
    const resultRows = leaderboard.map((entry) => ({
      season_id: id,
      user_id: entry.user_id,
      final_rank: entry.rank,
      final_points: entry.points,
      wins: entry.wins,
      losses: entry.losses,
      matches_played: entry.matches,
    }));

    if (resultRows.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from("season_results")
        .insert(resultRows);

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    // Mark season as completed
    const { error: updateError } = await supabaseAdmin
      .from("seasons")
      .update({ status: "completed" })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      results_count: resultRows.length,
      top3: leaderboard.slice(0, 3).map((e) => ({
        rank: e.rank,
        player_name: e.player_name,
        points: e.points,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
