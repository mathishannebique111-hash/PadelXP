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

// GET: list user's goals
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = getAdmin();
  const { data: goals, error } = await admin
    .from("coach_goals")
    .select("id, title, description, status, created_at, completed_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ goals: goals || [] });
}

// POST: create a new goal
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { title, description } = await req.json();
  if (!title?.trim()) {
    return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  }

  const admin = getAdmin();

  // Limit to 5 active goals
  const { count } = await admin
    .from("coach_goals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "active");

  if ((count ?? 0) >= 5) {
    return NextResponse.json(
      { error: "Tu as déjà 5 objectifs actifs. Termine ou abandonne un objectif avant d'en créer un nouveau." },
      { status: 400 }
    );
  }

  const { data: goal, error } = await admin
    .from("coach_goals")
    .insert({
      user_id: user.id,
      title: title.trim(),
      description: description?.trim() || null,
    })
    .select("id, title, description, status, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ goal });
}

// PATCH: update goal status
export async function PATCH(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { goalId, status } = await req.json();
  if (!goalId || !["completed", "abandoned", "active"].includes(status)) {
    return NextResponse.json({ error: "goalId et status valide requis" }, { status: 400 });
  }

  const admin = getAdmin();
  const updates: any = { status };
  if (status === "completed") updates.completed_at = new Date().toISOString();
  if (status === "active") updates.completed_at = null;

  const { error } = await admin
    .from("coach_goals")
    .update(updates)
    .eq("id", goalId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE: remove a goal
export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { goalId } = await req.json();
  if (!goalId) {
    return NextResponse.json({ error: "goalId requis" }, { status: 400 });
  }

  const admin = getAdmin();
  const { error } = await admin
    .from("coach_goals")
    .delete()
    .eq("id", goalId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
