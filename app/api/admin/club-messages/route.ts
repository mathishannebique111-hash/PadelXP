import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(request: Request) {
  try {
    // Vérifier que l'utilisateur est authentifié et admin
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn("[AdminClubMessages] Pas d'utilisateur connecté", { error: authError });
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier si admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      logger.warn("[AdminClubMessages] Utilisateur non-admin", { userId: user.id.substring(0, 8) });
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // Récupérer le conversation_id depuis les query params
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversation_id");

    if (!conversationId) {
      return NextResponse.json({ error: "conversation_id requis" }, { status: 400 });
    }

    // Utiliser le client admin pour contourner RLS et récupérer tous les messages
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from("club_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      logger.error("[AdminClubMessages] Erreur récupération messages", { error: messagesError });
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }

    logger.info(
      "[AdminClubMessages] Messages récupérés",
      {
        conversationId: conversationId.substring(0, 8),
        messageCount: messages?.length || 0,
      }
    );

    return NextResponse.json({ messages: messages || [] });
  } catch (error) {
    logger.error(
      "[AdminClubMessages] Erreur inattendue",
      { error, errorMessage: error instanceof Error ? error.message : String(error) },
    );
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
