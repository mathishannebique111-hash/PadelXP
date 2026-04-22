import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import {
  sendPushNotification,
  createServerNotification,
} from "@/lib/notifications/send-push";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BATCH_SIZE = 100;

const MESSAGES = [
  {
    title: "🎾 Et si tu jouais cette semaine ?",
    template: (name: string, days: number) =>
      `${name}, ça fait ${days} jours sans match. Cale une partie avant le week-end, ton classement te remerciera ! 📈`,
    pushTemplate: (name: string, days: number) =>
      `${name}, ${days}j sans jouer — un padel avant le week-end ? 📈`,
  },
  {
    title: "💪 C'est le moment de jouer !",
    template: (name: string, days: number) =>
      `${name}, ${days} jours sans match ! On est mercredi, le moment parfait pour programmer un padel 🎾`,
    pushTemplate: (name: string, days: number) =>
      `${name}, ${days}j sans match. Mercredi = jour de padel ? 🎾`,
  },
  {
    title: "🏓 Tes adversaires progressent !",
    template: (name: string, days: number) =>
      `${name}, ça fait ${days} jours. Pendant ce temps, tes rivaux enregistrent des matchs. Reprends ta place ! 🔥`,
    pushTemplate: (name: string, days: number) =>
      `${name}, ${days}j d'absence — tes rivaux avancent ! 🔥`,
  },
];

export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const authToken = req.headers
    .get("authorization")
    ?.replace("Bearer ", "");
  const isManualAuthorized = authToken === process.env.CRON_SECRET;

  if (!isVercelCron && !isManualAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  logger.info("🗓️ Cron midweek-reminder started");

  try {
    // 1. Get all users with push tokens
    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("user_id");

    if (tokensError) throw tokensError;
    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ message: "No tokens found", sent: 0 });
    }

    const userIds = [...new Set(tokens.map((t: any) => t.user_id as string))];

    // 2. Get profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, display_name")
      .in("id", userIds);

    const nameMap = new Map(
      (profiles || []).map((p: any) => [
        p.id,
        p.first_name ||
          (p.display_name ? p.display_name.split(/\s+/)[0] : "Joueur"),
      ])
    );

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const threeDaysAgoISO = threeDaysAgo.toISOString();

    // 3. Find users who played in the last 3 days (they are active, skip them)
    const activeUsers = new Set<string>();

    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);

      const { data: parts } = await supabase
        .from("match_participants")
        .select("user_id, match_id")
        .in("user_id", batch)
        .eq("player_type", "user");

      if (!parts || parts.length === 0) continue;

      const matchIds = [...new Set(parts.map((p: any) => p.match_id))];

      const { data: recentMatches } = await supabase
        .from("matches")
        .select("id")
        .in("id", matchIds)
        .eq("status", "confirmed")
        .gte("played_at", threeDaysAgoISO);

      if (!recentMatches) continue;

      const recentMatchSet = new Set(recentMatches.map((m: any) => m.id));
      for (const p of parts) {
        if (recentMatchSet.has(p.match_id)) {
          activeUsers.add(p.user_id);
        }
      }
    }

    // 4. For inactive users, find their last match date
    const inactiveUserIds = userIds.filter((id) => !activeUsers.has(id));

    if (inactiveUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All users are active",
        sent: 0,
      });
    }

    // Dedup: don't send if already sent inactivity_reminder in last 3 days
    const dedupCutoff = new Date(
      now.getTime() - 3 * 24 * 60 * 60 * 1000
    ).toISOString();
    const { data: recentNotifs } = await supabase
      .from("notifications")
      .select("user_id")
      .eq("type", "inactivity_reminder")
      .gte("created_at", dedupCutoff)
      .in("user_id", inactiveUserIds);

    const alreadyNotified = new Set(
      (recentNotifs || []).map((n: any) => n.user_id)
    );

    // Get last match for each inactive user
    const lastMatchMap = new Map<string, number>(); // userId -> days since last match

    for (let i = 0; i < inactiveUserIds.length; i += BATCH_SIZE) {
      const batch = inactiveUserIds.slice(i, i + BATCH_SIZE);

      const { data: parts } = await supabase
        .from("match_participants")
        .select("user_id, match_id")
        .in("user_id", batch)
        .eq("player_type", "user");

      if (!parts || parts.length === 0) {
        batch.forEach((id) => lastMatchMap.set(id, 999));
        continue;
      }

      const matchIds = [...new Set(parts.map((p: any) => p.match_id))];

      const { data: matches } = await supabase
        .from("matches")
        .select("id, played_at")
        .in("id", matchIds)
        .eq("status", "confirmed");

      if (!matches) continue;

      const matchDateMap = new Map(
        matches.map((m: any) => [m.id, m.played_at])
      );

      // Group by user -> most recent
      const userLatest = new Map<string, Date>();
      for (const p of parts) {
        const playedAt = matchDateMap.get(p.match_id);
        if (!playedAt) continue;
        const d = new Date(playedAt);
        const current = userLatest.get(p.user_id);
        if (!current || d > current) {
          userLatest.set(p.user_id, d);
        }
      }

      for (const uid of batch) {
        const latest = userLatest.get(uid);
        if (latest) {
          lastMatchMap.set(
            uid,
            Math.round((now.getTime() - latest.getTime()) / (1000 * 60 * 60 * 24))
          );
        } else {
          lastMatchMap.set(uid, 999);
        }
      }
    }

    // 5. Send notifications to inactive users (3+ days without match)
    let sent = 0;

    for (const userId of inactiveUserIds) {
      if (alreadyNotified.has(userId)) continue;

      const daysSince = lastMatchMap.get(userId) ?? 999;
      if (daysSince < 3) continue; // played recently enough

      const firstName = nameMap.get(userId) || "Joueur";

      // Pick message variant based on a hash of userId for variety
      const variant =
        MESSAGES[
          userId.charCodeAt(0) % MESSAGES.length
        ];

      await createServerNotification(
        userId,
        "inactivity_reminder",
        variant.title,
        variant.template(firstName, daysSince),
        { type: "inactivity_reminder", days_since_last_match: daysSince, source: "midweek" }
      );
      await sendPushNotification(
        userId,
        variant.title,
        variant.pushTemplate(firstName, daysSince),
        { type: "inactivity_reminder" }
      );
      sent++;
    }

    logger.info(`✅ Midweek reminder: ${sent} notifications sent`);

    return NextResponse.json({
      success: true,
      date: now.toISOString(),
      results: {
        inactive: inactiveUserIds.length,
        alreadyNotified: alreadyNotified.size,
        sent,
      },
    });
  } catch (error: any) {
    logger.error("❌ Cron midweek-reminder error:", error);
    return NextResponse.json(
      { error: "Server error", details: error.message },
      { status: 500 }
    );
  }
}
