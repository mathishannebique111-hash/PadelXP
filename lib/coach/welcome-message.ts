import { createClient } from "@supabase/supabase-js";
import { getCoachName } from "./coach-names";
import { logger } from "@/lib/logger";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdmin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Send the coach welcome message when onboarding is completed (first match registered).
 * Creates a new conversation "Bienvenue" with an intro + debrief questions.
 */
export async function sendCoachWelcomeAfterFirstMatch(userId: string): Promise<void> {
  const admin = getAdmin();

  try {
    const coachName = getCoachName(userId);

    const { data: profile } = await admin
      .from("profiles")
      .select("first_name, display_name")
      .eq("id", userId)
      .single();

    const firstName = profile?.first_name
      || (profile?.display_name ? profile.display_name.split(/\s+/)[0] : "Joueur");

    // Check if we already sent a welcome message (dedup)
    const { data: existing } = await admin
      .from("coach_conversations")
      .select("id")
      .eq("user_id", userId)
      .eq("title", "Bienvenue")
      .limit(1);

    if (existing && existing.length > 0) return; // Already sent

    // Create conversation
    const { data: conv, error: convError } = await admin
      .from("coach_conversations")
      .insert({ user_id: userId, title: "Bienvenue" })
      .select("id")
      .single();

    if (convError || !conv) {
      logger.error("[coach/welcome] Failed to create conversation", { error: convError?.message });
      return;
    }

    const message = `Salut ${firstName} ! Je suis ${coachName}, ton coach personnel.

Analysons ton premier match ! Comment tu t'es senti sur le terrain ?

- Comment était ton **service** aujourd'hui ?
- Tes **volées** au filet, tu les sentais bien ?
- Et ton **mental** pendant le match, tu étais concentré ?

Dis-moi tout, je suis là pour t'aider à progresser match après match !`;

    await admin.from("coach_messages").insert({
      conversation_id: conv.id,
      role: "assistant",
      content: message,
    });

    // Send notification
    try {
      const { createServerNotification, sendPushNotification } = await import("@/lib/notifications/send-push");
      await createServerNotification(
        userId,
        "coach_message",
        `${coachName} t'a envoyé un message`,
        `${firstName}, ${coachName} veut analyser ton premier match avec toi`,
        { type: "coach_message", path: "/coach" }
      );
      sendPushNotification(
        userId,
        `${coachName} t'a envoyé un message`,
        `${firstName}, ${coachName} veut analyser ton premier match avec toi`,
        { type: "coach_message" }
      ).catch(() => {});
    } catch { /* non-blocking */ }

    logger.info("[coach/welcome] Welcome message sent after first match", { userId });
  } catch (error) {
    logger.error("[coach/welcome] Error", { error: (error as Error).message, userId });
  }
}

/**
 * Send the coach intro message when user opens Coach IA before completing onboarding.
 * Creates a conversation "Bienvenue" with guidance to evaluate level + register match.
 */
export async function sendCoachOnboardingGuide(userId: string): Promise<void> {
  const admin = getAdmin();

  try {
    const coachName = getCoachName(userId);

    const { data: profile } = await admin
      .from("profiles")
      .select("first_name, display_name")
      .eq("id", userId)
      .single();

    const firstName = profile?.first_name
      || (profile?.display_name ? profile.display_name.split(/\s+/)[0] : "Joueur");

    // Check if we already sent this guide (dedup)
    const { data: existing } = await admin
      .from("coach_conversations")
      .select("id")
      .eq("user_id", userId)
      .eq("title", "Bienvenue")
      .limit(1);

    if (existing && existing.length > 0) return; // Already sent

    const { data: conv, error: convError } = await admin
      .from("coach_conversations")
      .insert({ user_id: userId, title: "Bienvenue" })
      .select("id")
      .single();

    if (convError || !conv) return;

    const message = `Salut ${firstName} ! Je suis ${coachName}, ton coach personnel.

Évalue ton niveau puis enregistre ton premier match, je t'accompagne ! Une fois ton premier match enregistré, je pourrai analyser ton jeu et te donner des conseils personnalisés.

En attendant, n'hésite pas à me poser n'importe quelle question sur le padel !`;

    await admin.from("coach_messages").insert({
      conversation_id: conv.id,
      role: "assistant",
      content: message,
    });

    logger.info("[coach/welcome] Onboarding guide message sent", { userId });
  } catch (error) {
    logger.error("[coach/welcome] Error", { error: (error as Error).message, userId });
  }
}
