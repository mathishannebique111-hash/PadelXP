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
    if (!canSeeSeasons(user.email) && !isAdmin(user.email)) return NextResponse.json({ error: "Feature not available" }, { status: 403 });

    const { data: season, error } = await supabaseAdmin
      .from("seasons")
      .select("*, season_rewards(*), season_results(*)")
      .eq("id", id)
      .single();

    if (error || !season) return NextResponse.json({ error: "Season not found" }, { status: 404 });

    return NextResponse.json({ season });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
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
    const { name, start_date, end_date, status } = body;

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (start_date !== undefined) updates.start_date = start_date;
    if (end_date !== undefined) updates.end_date = end_date;
    if (status !== undefined) updates.status = status;

    const { data: season, error } = await supabaseAdmin
      .from("seasons")
      .update(updates)
      .eq("id", id)
      .select("*, season_rewards(*)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ season });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canSeeSeasons(user.email) && !isAdmin(user.email)) return NextResponse.json({ error: "Feature not available" }, { status: 403 });

    const { error } = await supabaseAdmin
      .from("seasons")
      .delete()
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
