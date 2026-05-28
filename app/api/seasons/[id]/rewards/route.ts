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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canSeeSeasons(user.email) && !isAdmin(user.email)) return NextResponse.json({ rewards: [] });

    const { data: rewards } = await supabaseAdmin
      .from("season_rewards")
      .select("*")
      .eq("season_id", id)
      .order("rank");

    return NextResponse.json({ rewards: rewards || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canSeeSeasons(user.email) && !isAdmin(user.email)) return NextResponse.json({ error: "Feature not available" }, { status: 403 });

    const body = await request.json();
    const { rank, reward_label, reward_description, reward_image_url } = body;

    if (!rank || !reward_label) {
      return NextResponse.json({ error: "rank and reward_label required" }, { status: 400 });
    }

    // Upsert: replace existing reward for this rank
    const { data: existing } = await supabaseAdmin
      .from("season_rewards")
      .select("id")
      .eq("season_id", id)
      .eq("rank", rank)
      .maybeSingle();

    if (existing) {
      const { data: reward, error } = await supabaseAdmin
        .from("season_rewards")
        .update({ reward_label, reward_description, reward_image_url })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ reward });
    }

    const { data: reward, error } = await supabaseAdmin
      .from("season_rewards")
      .insert({ season_id: id, rank, reward_label, reward_description, reward_image_url })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ reward }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
