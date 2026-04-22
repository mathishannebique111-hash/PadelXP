import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdmin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface MatchDetails {
  matchId: string;
  score: string; // ex: "6-3 4-6"
  isWin: boolean;
  partnerName: string | null;
  opponentNames: string[];
  playerFirstName: string;
}

/**
 * Crée automatiquement un message du coach IA dans la conversation du joueur
 * après la confirmation d'un match.
 */
export async function sendCoachAutoMessage(
  userId: string,
  details: MatchDetails
): Promise<void> {
  const admin = getAdmin();

  try {
    // 1. Trouver ou créer une conversation pour ce joueur
    const { data: existingConvs } = await admin
      .from("coach_conversations")
      .select("id")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1);

    let conversationId: string;

    if (existingConvs && existingConvs.length > 0) {
      conversationId = existingConvs[0].id;
    } else {
      // Créer une nouvelle conversation
      const { data: newConv, error: convError } = await admin
        .from("coach_conversations")
        .insert({
          user_id: userId,
          title: "Analyse de match",
        })
        .select("id")
        .single();

      if (convError || !newConv) {
        logger.error("[coach/auto-message] Failed to create conversation", {
          error: convError?.message,
          userId,
        });
        return;
      }
      conversationId = newConv.id;
    }

    // 2. Construire le message personnalisé
    const resultEmoji = details.isWin ? "🎉" : "💪";
    const resultText = details.isWin ? "une victoire" : "une défaite";
    const partnerText = details.partnerName
      ? ` avec ${details.partnerName}`
      : "";
    const opponentsText = details.opponentNames.length > 0
      ? ` contre ${details.opponentNames.join(" et ")}`
      : "";

    const message = `${resultEmoji} Hey ${details.playerFirstName} ! Match enregistré : ${resultText} (${details.score})${partnerText}${opponentsText}.

Ton **debrief post-match** est prêt ! Réponds à quelques questions rapides pour que je puisse mieux te connaître :

- Comment était ton **service** aujourd'hui ?
- Tes **volées** et tes **smashs** ?
- Et ton **mental** pendant le match ?

Plus tu me donnes d'infos après tes matchs, plus mes conseils seront précis et personnalisés. ${details.isWin ? "Même dans la victoire, il y a toujours un truc à améliorer !" : "Chaque défaite est une mine d'or d'apprentissage."}

Dis-moi tout, je suis là pour t'aider à progresser !`;

    // 3. Insérer le message du coach
    const { error: msgError } = await admin
      .from("coach_messages")
      .insert({
        conversation_id: conversationId,
        role: "assistant",
        content: message,
      });

    if (msgError) {
      logger.error("[coach/auto-message] Failed to insert message", {
        error: msgError.message,
        userId,
      });
      return;
    }

    // 4. Mettre à jour le titre de la conversation si c'est une nouvelle
    if (!existingConvs || existingConvs.length === 0) {
      await admin
        .from("coach_conversations")
        .update({
          title: `Match ${details.score} ${details.isWin ? "victoire" : "défaite"}`,
        })
        .eq("id", conversationId);
    }

    // 5. Envoyer une notification push (non agressive) pour alerter le joueur
    try {
      const { notifyUser } = await import("@/lib/notifications/send-push");
      await notifyUser(
        userId,
        "coach_message" as any,
        "Ton debrief post-match est prêt",
        `${details.playerFirstName}, 30 secondes pour améliorer ton prochain match`,
        { type: "coach_debrief", match_id: details.matchId, path: "/coach" }
      );
    } catch (notifError) {
      // Non-blocking
      logger.warn("[coach/auto-message] Push notification failed", {
        error: (notifError as Error).message,
      });
    }

    logger.info("[coach/auto-message] Auto-message sent", {
      userId,
      matchId: details.matchId,
      conversationId,
    });
  } catch (error) {
    logger.error("[coach/auto-message] Unexpected error", {
      error: (error as Error).message,
      userId,
    });
  }
}
