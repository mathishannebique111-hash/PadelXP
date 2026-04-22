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

    const message = `${resultEmoji} Hey ${details.playerFirstName} ! Je vois que tu viens d'enregistrer ${resultText} (${details.score})${partnerText}${opponentsText}.

${details.isWin
  ? `Bravo pour cette victoire ! Comment s'est passé ce match ? Y a-t-il des points sur lesquels tu as senti que tu pouvais encore progresser, même dans la victoire ?`
  : `Pas de panique, chaque défaite est une occasion d'apprendre. Comment s'est passé ce match ? Dis-moi ce qui a été difficile et je te donnerai des conseils pour progresser.`}

Tu veux qu'on analyse ce match ensemble ? Dis-moi comment tu t'es senti sur le terrain !`;

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

    // 5. Envoyer une notification push pour alerter le joueur
    try {
      const { notifyUser } = await import("@/lib/notifications/send-push");
      await notifyUser(
        userId,
        "coach_message" as any,
        "🎾 Ton Coach IA a un message pour toi",
        `${details.playerFirstName}, parlons de ton match ${details.score} ! Ouvre le Coach IA.`,
        { type: "coach_message", match_id: details.matchId }
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
