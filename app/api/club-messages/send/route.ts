import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn("[ClubMessagesSend] Pas d'utilisateur connecté", { error: authError });
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { content, conversation_id, conversationId: conversationIdCamel } = body;

    const finalConversationId = conversation_id || conversationIdCamel;

    logger.info("[ClubMessagesSend] Requête reçue", {
      hasContent: !!content,
      hasConversationIdSnake: !!conversation_id,
      hasConversationIdCamel: !!conversationIdCamel,
    });

    if (!content || typeof content !== 'string' || content.trim() === '') {
      logger.warn("[ClubMessagesSend] Message vide reçu", {});
      return NextResponse.json({ error: "Message vide" }, { status: 400 });
    }

    // Initialiser le client Admin pour les opérations privilégiées (contournement RLS)
    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
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

    // Vérifier si l'utilisateur est admin via le client Admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin, club_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      logger.error("[ClubMessagesSend] Erreur récupération profil", { error: profileError });
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }

    const isAdmin = profile?.is_admin || false;

    // Récupérer le club_id UUID depuis profiles OU club_admins via le client Admin
    let clubId: string | null = profile?.club_id || null;

    // Si pas de club_id dans profiles, chercher dans club_admins
    if (!clubId) {
      const { data: adminEntry } = await supabaseAdmin
        .from('club_admins')
        .select('club_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (adminEntry?.club_id) {
        clubId = adminEntry.club_id;
      }
    }

    logger.info("[ClubMessagesSend] Profil utilisateur", {
      userId: user.id.substring(0, 8),
      isAdmin,
      clubId: clubId?.substring(0, 8) || null,
      hasConversationId: !!finalConversationId,
    });

    let conversationId = finalConversationId;

    // Si pas de conversation_id fourni, chercher ou créer une conversation (uniquement pour les clubs, pas les admins)
    if (!conversationId && !isAdmin) {
      if (!clubId) {
        logger.warn("[ClubMessagesSend] Pas de club_id pour l'utilisateur", {
          userId: user.id.substring(0, 8),
        });
        return NextResponse.json({ error: "Vous devez être associé à un club pour envoyer des messages" }, { status: 400 });
      }

      let { data: conversation, error: convError } = await supabase
        .from('club_conversations')
        .select('id')
        .eq('club_id', clubId)
        .maybeSingle();

      // Si pas de conversation, en créer une
      if (!conversation) {
        let newConv;
        let createError;

        const createResult = await supabase
          .from('club_conversations')
          .insert({
            club_id: clubId,
            status: 'open'
          })
          .select()
          .single();

        newConv = createResult.data;
        createError = createResult.error;

        // Si erreur RLS, essayer avec service role key
        if (createError) {
          logger.warn("[ClubMessagesSend] Erreur RLS lors de la création de conversation, tentative avec service role key", {
            error: createError,
            clubId: clubId.substring(0, 8),
            userId: user.id.substring(0, 8)
          });

          const adminSupabase = supabaseAdmin;

          const retryResult = await adminSupabase
            .from('club_conversations')
            .insert({
              club_id: clubId,
              status: 'open'
            })
            .select()
            .single();

          newConv = retryResult.data;
          createError = retryResult.error;
        }

        if (createError) {
          logger.error("[ClubMessagesSend] Erreur création conversation", {
            error: createError,
            errorCode: createError.code,
            errorMessage: createError.message,
            clubId: clubId.substring(0, 8),
            userId: user.id.substring(0, 8)
          });
          return NextResponse.json({
            error: "Erreur lors de la création de la conversation",
            details: createError.message,
            code: createError.code
          }, { status: 500 });
        }

        conversation = newConv;
      }

      conversationId = conversation.id;
    }

    // Si admin et pas de conversation_id, erreur
    if (!conversationId) {
      logger.warn("[ClubMessagesSend] conversation_id manquant", {
        isAdmin,
        userId: user.id.substring(0, 8),
      });
      return NextResponse.json(
        { error: "conversation_id requis. Veuillez sélectionner une conversation." },
        { status: 400 }
      );
    }

    // Pour les admins, utiliser le service role key pour contourner RLS si nécessaire
    let insertSupabase = supabase;

    if (isAdmin) {
      insertSupabase = supabaseAdmin as any;
    }

    // Insérer le message dans club_messages
    let message;
    let msgError;

    const insertResult = await insertSupabase
      .from('club_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
        type: 'text',
        is_admin: isAdmin
      })
      .select()
      .single();

    message = insertResult.data;
    msgError = insertResult.error;

    // Si erreur RLS et que l'utilisateur n'est pas admin, essayer avec service role key
    if (msgError && !isAdmin) {
      logger.warn("[ClubMessagesSend] Erreur RLS lors de l'insertion, tentative avec service role key", {
        error: msgError,
        conversationId: conversationId.substring(0, 8),
        clubId: clubId?.substring(0, 8),
      });

      const adminSupabase = supabaseAdmin;

      const retryResult = await adminSupabase
        .from('club_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          type: 'text',
          is_admin: false
        })
        .select()
        .single();

      message = retryResult.data;
      msgError = retryResult.error;
    }

    if (msgError) {
      logger.error("[ClubMessagesSend] Erreur insertion message", {
        error: msgError,
        errorCode: msgError.code,
        errorMessage: msgError.message,
        isAdmin,
        conversationId: conversationId.substring(0, 8),
        clubId: clubId?.substring(0, 8),
        userId: user.id.substring(0, 8),
      });
      return NextResponse.json({
        error: msgError.message || "Erreur lors de l'envoi du message",
        code: msgError.code
      }, { status: 500 });
    }

    logger.info("[ClubMessagesSend] Message envoyé", {
      userId: user.id.substring(0, 8),
      conversationId: conversationId.substring(0, 8),
      isAdmin,
    });

    return NextResponse.json({
      success: true,
      message,
      conversation_id: conversationId // Inclure l'ID de conversation dans la réponse
    });
  } catch (error) {
    logger.error("[ClubMessagesSend] Erreur inattendue", {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
