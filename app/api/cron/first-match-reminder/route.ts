import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { createServerNotification, sendPushNotification } from "@/lib/notifications/send-push";

export const dynamic = "force-dynamic";

/**
 * Cron J+1 : rappel aux utilisateurs inscrits depuis 24h qui n'ont pas encore enregistré de match.
 * Tourne quotidiennement à 10h.
 */
export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const authToken = req.headers.get("authorization")?.replace("Bearer ", "");
  const isManualAuthorized = authToken === process.env.CRON_SECRET;

  if (!isVercelCron && !isManualAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const now = new Date();

    // Users who signed up at least 24h ago (up to 7 days), have evaluated level but 0 matches
    // Wide window ensures we catch up if cron was down for several days
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: eligibleUsers, error } = await admin
      .from("profiles")
      .select("id, first_name, display_name, niveau_padel, matchs_joues, created_at")
      .not("niveau_padel", "is", null)          // Has evaluated level
      .or("matchs_joues.is.null,matchs_joues.eq.0")  // No matches played
      .gte("created_at", sevenDaysAgo)           // Signed up within 7 days
      .lte("created_at", twentyFourHoursAgo);   // But at least 24h ago

    if (error) {
      logger.error("[cron/first-match-reminder] Query error", { error: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!eligibleUsers || eligibleUsers.length === 0) {
      logger.info("[cron/first-match-reminder] No eligible users found");
      return NextResponse.json({ sent: 0 });
    }

    // Check we haven't already sent this notification (dedup via notifications table)
    const userIds = eligibleUsers.map(u => u.id);
    const { data: alreadySent } = await admin
      .from("notifications")
      .select("user_id")
      .in("user_id", userIds)
      .eq("type", "first_match_reminder");

    const alreadySentIds = new Set((alreadySent || []).map(n => n.user_id));

    let sent = 0;

    for (const user of eligibleUsers) {
      if (alreadySentIds.has(user.id)) continue;

      const firstName = user.first_name
        || (user.display_name ? user.display_name.split(/\s+/)[0] : "Joueur");
      const level = user.niveau_padel?.toFixed(1) || "?";

      const title = "Enregistre ton premier match";
      const message = `${firstName}, tu as évalué ton niveau à ${level} — enregistre ton premier match pour commencer à monter dans le classement !`;

      await createServerNotification(
        user.id,
        "first_match_reminder",
        title,
        message,
        { type: "first_match_reminder", path: "/match/new?tab=record" }
      );

      sendPushNotification(
        user.id,
        title,
        message,
        { type: "first_match_reminder" }
      ).catch(() => {});

      sent++;
    }

    logger.info(`[cron/first-match-reminder] Sent ${sent} reminders`);
    return NextResponse.json({ eligible: eligibleUsers.length, sent });
  } catch (err) {
    logger.error("[cron/first-match-reminder] Unexpected error", { error: (err as Error).message });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
