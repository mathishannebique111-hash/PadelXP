import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { canSeeSeasons } from "@/lib/feature-flags";
import { isAdmin } from "@/lib/admin-auth";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const dynamic = "force-dynamic";

// GET: list seasons — accepts ?club_id= param, or falls back to user's club
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canSeeSeasons(user.email) && !isAdmin(user.email)) return NextResponse.json({ seasons: [] });

    const { searchParams } = new URL(request.url);
    let clubId = searchParams.get("club_id");

    if (!clubId) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("club_id")
        .eq("id", user.id)
        .maybeSingle();
      clubId = profile?.club_id || null;
    }

    if (!clubId) return NextResponse.json({ seasons: [] });

    const { data: seasons, error } = await supabaseAdmin
      .from("seasons")
      .select("*, season_rewards(*)")
      .eq("club_id", clubId)
      .order("start_date", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ seasons: seasons || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: create a new season (club admin only)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canSeeSeasons(user.email) && !isAdmin(user.email)) return NextResponse.json({ error: "Feature not available" }, { status: 403 });

    const body = await request.json();
    const { name, start_date, end_date, club_id, rewards } = body;

    if (!name || !start_date || !end_date || !club_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify user is club admin or global admin
    if (!isAdmin(user.email)) {
      const { data: adminCheck } = await supabaseAdmin
        .from("club_admins")
        .select("id")
        .eq("user_id", user.id)
        .eq("club_id", club_id)
        .maybeSingle();

      if (!adminCheck) {
        return NextResponse.json({ error: "Not a club admin" }, { status: 403 });
      }
    }

    // Check no overlapping seasons
    const { data: overlapping } = await supabaseAdmin
      .from("seasons")
      .select("id")
      .eq("club_id", club_id)
      .neq("status", "completed")
      .or(`and(start_date.lte.${end_date},end_date.gte.${start_date})`);

    if (overlapping && overlapping.length > 0) {
      return NextResponse.json({ error: "Une saison existe deja sur cette periode" }, { status: 409 });
    }

    // Determine status based on dates
    const now = new Date().toISOString().split("T")[0];
    let status = "upcoming";
    if (start_date <= now && end_date >= now) status = "active";

    const { data: season, error } = await supabaseAdmin
      .from("seasons")
      .insert({ name, start_date, end_date, club_id, status, created_by: user.id })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Insert rewards if provided
    if (rewards && Array.isArray(rewards)) {
      const rewardRows = rewards
        .filter((r: { rank?: number; reward_label?: string }) => r.rank && r.reward_label)
        .map((r: { rank: number; reward_label: string; reward_description?: string; reward_image_url?: string }) => ({
          season_id: season.id,
          rank: r.rank,
          reward_label: r.reward_label,
          reward_description: r.reward_description || null,
          reward_image_url: r.reward_image_url || null,
        }));

      if (rewardRows.length > 0) {
        await supabaseAdmin.from("season_rewards").insert(rewardRows);
      }
    }

    // Fetch the season with rewards
    const { data: fullSeason } = await supabaseAdmin
      .from("seasons")
      .select("*, season_rewards(*)")
      .eq("id", season.id)
      .single();

    return NextResponse.json({ season: fullSeason }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
