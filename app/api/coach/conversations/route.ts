import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

async function getAuthUser() {
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

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET : lister les conversations de l'utilisateur
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const admin = getAdmin();
    const { data: conversations, error } = await admin
      .from("coach_conversations")
      .select("id, title, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ conversations: conversations || [] });
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur serveur", details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST : créer une nouvelle conversation
export async function POST() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const admin = getAdmin();
    const { data: conversation, error } = await admin
      .from("coach_conversations")
      .insert({ user_id: user.id, title: "Nouvelle conversation" })
      .select("id, title, created_at, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur serveur", details: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE : supprimer une conversation
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { conversationId } = await req.json();
    if (!conversationId) {
      return NextResponse.json({ error: "conversationId requis" }, { status: 400 });
    }

    const admin = getAdmin();

    // Vérifier que la conversation appartient à l'utilisateur
    const { data: conv } = await admin
      .from("coach_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .single();

    if (!conv) {
      return NextResponse.json({ error: "Conversation non trouvée" }, { status: 404 });
    }

    // Les messages sont supprimés en cascade grâce à ON DELETE CASCADE
    await admin.from("coach_conversations").delete().eq("id", conversationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur serveur", details: (error as Error).message },
      { status: 500 }
    );
  }
}
