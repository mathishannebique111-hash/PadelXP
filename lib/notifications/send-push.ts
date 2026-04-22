import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Appelle la Supabase Edge Function pour envoyer une push notification native (iOS/Android).
 * Utilise le service role key pour l'authentification.
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  message: string,
  data?: Record<string, string>
): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/push-notifications`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        record: {
          user_id: userId,
          title,
          message,
          data: data || {},
        },
      }),
    });
    return res.ok;
  } catch (error) {
    logger.error("[send-push] Failed to call push edge function", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Crée une notification in-app dans la table notifications (côté serveur, avec admin client).
 * Utilisé par les crons et les API routes server-side.
 */
export async function createServerNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  data?: Record<string, any>
): Promise<boolean> {
  try {
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await adminClient.from("notifications").insert({
      user_id: userId,
      type,
      title,
      message,
      data: data || {},
      is_read: false,
      read: false,
    });

    if (error) {
      logger.error("[send-push] Failed to create in-app notification", {
        userId,
        type,
        error: error.message,
      });
      return false;
    }
    return true;
  } catch (error) {
    logger.error("[send-push] Unexpected error creating notification", {
      userId,
      type,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Envoie à la fois une notification in-app + push native.
 * Non-bloquant : les erreurs sont loguées mais n'interrompent pas le flow.
 */
export async function notifyUser(
  userId: string,
  type: string,
  title: string,
  message: string,
  data?: Record<string, any>
): Promise<void> {
  await Promise.allSettled([
    createServerNotification(userId, type, title, message, data),
    sendPushNotification(
      userId,
      title,
      message,
      data
        ? Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v)])
          )
        : undefined
    ),
  ]);
}
