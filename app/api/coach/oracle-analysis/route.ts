import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function getUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() { /* read-only */ },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// POST: save an Oracle analysis summary
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { summary, rawData } = await req.json();
  if (!summary) {
    return NextResponse.json({ error: "summary requis" }, { status: 400 });
  }

  const admin = getAdmin();

  // Keep only the 5 most recent analyses (delete older ones)
  const { data: existing } = await admin
    .from("oracle_analyses")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (existing && existing.length >= 5) {
    const idsToDelete = existing.slice(4).map((e) => e.id);
    await admin.from("oracle_analyses").delete().in("id", idsToDelete);
  }

  const { data, error } = await admin
    .from("oracle_analyses")
    .insert({
      user_id: user.id,
      summary,
      raw_data: rawData || {},
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}

// GET: get latest Oracle analysis for the user
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = getAdmin();
  const { data } = await admin
    .from("oracle_analyses")
    .select("summary, raw_data, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ analysis: data });
}
