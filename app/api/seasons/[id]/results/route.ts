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
    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canSeeSeasons(user.email) && !isAdmin(user.email)) return NextResponse.json({ results: [] });

    let query = supabaseAdmin
      .from("season_results")
      .select("*, profiles:user_id(first_name, last_name, display_name, avatar_url)")
      .eq("season_id", id)
      .order("final_rank");

    if (country) {
      query = query.eq("country", country);
    }

    const { data: results, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ results: results || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
