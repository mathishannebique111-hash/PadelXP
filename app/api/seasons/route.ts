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

function canAccess(email: string | undefined | null) {
  return canSeeSeasons(email) || isAdmin(email);
}

// GET: list all seasons (admin sees all, with club info)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canAccess(user.email)) return NextResponse.json({ seasons: [] });

    const { data: seasons, error } = await supabaseAdmin
      .from("seasons")
      .select("*, season_rewards(*), clubs(id, name, subdomain)")
      .order("start_date", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ seasons: seasons || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: create a new global season (admin only)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdmin(user.email)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const body = await request.json();
    const { name, start_date, end_date, rewards, countries, club_id } = body;

    if (!name || !start_date || !end_date || !club_id) {
      return NextResponse.json({ error: "Missing required fields (name, dates, club_id)" }, { status: 400 });
    }

    // Check no overlapping active/upcoming seasons for this club
    const { data: overlapping } = await supabaseAdmin
      .from("seasons")
      .select("id")
      .eq("club_id", club_id)
      .in("status", ["active", "upcoming"]);

    if (overlapping && overlapping.length > 0) {
      return NextResponse.json({ error: "Une saison active ou a venir existe deja pour ce club. Finalisez-la d'abord." }, { status: 409 });
    }

    // Determine status
    const now = new Date().toISOString().split("T")[0];
    const status = start_date <= now && end_date >= now ? "active" : "upcoming";

    const { data: season, error } = await supabaseAdmin
      .from("seasons")
      .insert({
        name, start_date, end_date, status, created_by: user.id,
        countries: countries || ["FR", "BE"],
        club_id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Insert rewards
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
