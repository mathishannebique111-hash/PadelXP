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

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Vérifier que l'utilisateur est authentifié et admin
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn("[DeleteClubConversation] Pas d'utilisateur connecté", { error: authError });
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier si admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      logger.warn("[DeleteClubConversation] Utilisateur non-admin", { userId: user.id.substring(0, 8) });
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const conversationId = params.id;

    if (!conversationId) {
      return NextResponse.json({ error: "conversation_id requis" }, { status: 400 });
    }

    // Utiliser le client admin pour contourner RLS et supprimer la conversation
    // Les messages seront automatiquement supprimés grâce à ON DELETE CASCADE
    const { error: deleteError } = await supabaseAdmin
      .from("club_conversations")
      .delete()
      .eq("id", conversationId);

    if (deleteError) {
      logger.error("[DeleteClubConversation] Erreur suppression conversation", { 
        error: deleteError,
        conversationId: conversationId.substring(0, 8)
      });
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }

    logger.info("[DeleteClubConversation] Conversation supprimée", {
      conversationId: conversationId.substring(0, 8),
      adminId: user.id.substring(0, 8),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[DeleteClubConversation] Erreur inattendue", { 
      error, 
      errorMessage: error instanceof Error ? error.message : String(error) 
    });
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
