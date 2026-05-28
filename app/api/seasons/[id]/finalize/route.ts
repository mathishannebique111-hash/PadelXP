import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin-auth";
import { calculateGlobalSeasonLeaderboard } from "@/lib/utils/season-leaderboard-utils";

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

    const leaderboard = await calculateGlobalSeasonLeaderboard({
      start: season.start_date,
      end: season.end_date,
    });

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
      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await supabaseAdmin.from("seasons").update({ status: "completed" }).eq("id", id);

    return NextResponse.json({
      success: true,
      results_count: resultRows.length,
      top3: leaderboard.slice(0, 3).map((e) => ({ rank: e.rank, player_name: e.player_name, points: e.points })),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
