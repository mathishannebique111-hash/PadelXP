import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logger.warn("[MessagesSend] Pas d'utilisateur connecté", { error: authError });
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { content, conversation_id, conversationId: conversationIdCamel } = body; // Support des deux formats pour compatibilité

    // Utiliser conversation_id (snake_case) ou conversationId (camelCase) pour compatibilité
    const finalConversationId = conversation_id || conversationIdCamel;

    // Log pour debug
    logger.info("[MessagesSend] Requête reçue", {
      hasContent: !!content,
      hasConversationIdSnake: !!conversation_id,
      hasConversationIdCamel: !!conversationIdCamel,
    });

    if (!content || typeof content !== 'string' || content.trim() === '') {
      logger.warn("[MessagesSend] Message vide reçu", {});
      return NextResponse.json({ error: "Message vide" }, { status: 400 });
    }

    // Vérifier si l'utilisateur est admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, club_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      logger.error("[MessagesSend] Erreur récupération profil", { error: profileError });
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }

    const isAdmin = profile?.is_admin || false;

    logger.info("[MessagesSend] Profil utilisateur", {
      userId: user.id.substring(0, 8),
      isAdmin,
      hasConversationId: !!finalConversationId,
    });

    let conversationId = finalConversationId;

    // Si pas de conversation_id fourni, chercher ou créer une conversation (uniquement pour les joueurs)
    if (!conversationId && !isAdmin) {
      let { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Si pas de conversation, en créer une
      if (!conversation) {
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({
            user_id: user.id,
            club_id: profile?.club_id || '00000000-0000-0000-0000-000000000000',
            status: 'open'
          })
          .select()
          .single();

        if (createError) {
          logger.error("[MessagesSend] Erreur création conversation", { error: createError });
          return NextResponse.json({ error: "Erreur lors de la création de la conversation" }, { status: 500 });
        }

        conversation = newConv;
      }

      conversationId = conversation.id;
    }

    // Si admin et pas de conversation_id, erreur
    if (!conversationId) {
      logger.warn("[MessagesSend] conversation_id manquant", {
        isAdmin,
        userId: user.id.substring(0, 8),
      });
      return NextResponse.json(
        { error: "conversation_id requis. Veuillez sélectionner une conversation." },
        { status: 400 }
      );
    }

    // Pour les admins, utiliser le service role key pour contourner RLS si nécessaire
    // Sinon utiliser le client normal qui respectera les nouvelles politiques RLS
    let insertSupabase = supabase;
    
    if (isAdmin) {
      // Si l'admin a des problèmes avec RLS, utiliser le service role key
      // Cela garantit que l'admin peut toujours envoyer des messages
      const { createClient: createAdminClient } = await import("@supabase/supabase-js");
      insertSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      ) as any;
    }

    // Insérer le message
    const { data: message, error: msgError } = await insertSupabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
        type: 'text',
        is_admin: isAdmin
      })
      .select()
      .single();

    if (msgError) {
      logger.error("[MessagesSend] Erreur insertion message", {
        error: msgError,
        isAdmin,
        conversationId: conversationId.substring(0, 8),
      });
      return NextResponse.json({ error: msgError.message || "Erreur lors de l'envoi du message" }, { status: 500 });
    }

    logger.info("[MessagesSend] Message envoyé", {
      userId: user.id.substring(0, 8),
      conversationId: conversationId.substring(0, 8),
      isAdmin,
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    logger.error("[MessagesSend] Erreur inattendue", {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
