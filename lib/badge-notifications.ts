import { createClient } from "@supabase/supabase-js";
import { getBadges, type PlayerStats } from "@/lib/badges";
import { createServerNotification, sendPushNotification } from "@/lib/notifications/send-push";
import { logger } from "@/lib/logger";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Check if a user has earned new badges and send notifications for each.
 * Compares current badges with previously notified badges.
 * Should be called after match confirmation (when stats change).
 */
export async function checkAndNotifyNewBadges(userId: string): Promise<void> {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // 1. Get player stats
    const { data: profile } = await admin
      .from("profiles")
      .select("global_points, referral_count, first_name, display_name")
      .eq("id", userId)
      .single();

    if (!profile) return;

    // Get match stats
    const { data: participations } = await admin
      .from("match_participants")
      .select("match_id, team")
      .eq("user_id", userId)
      .eq("player_type", "user");

    if (!participations || participations.length === 0) return;

    const matchIds = participations.map(p => p.match_id);
    const teamByMatch = new Map(participations.map(p => [p.match_id, p.team]));

    const { data: matches } = await admin
      .from("matches")
      .select("id, winner_team_id, team1_id, team2_id, played_at")
      .in("id", matchIds)
      .eq("status", "confirmed")
      .order("played_at", { ascending: false });

    if (!matches || matches.length === 0) return;

    // Calculate wins, losses, streak
    let wins = 0;
    let losses = 0;
    let currentStreak = 0;
    let streakBroken = false;

    for (const m of matches) {
      const team = teamByMatch.get(m.id);
      const teamId = team === 1 ? m.team1_id : m.team2_id;
      const isWin = m.winner_team_id === teamId;

      if (isWin) {
        wins++;
        if (!streakBroken) currentStreak++;
      } else {
        losses++;
        if (!streakBroken) streakBroken = true;
      }
    }

    const stats: PlayerStats = {
      wins,
      losses,
      matches: wins + losses,
      points: profile.global_points || 0,
      streak: currentStreak,
      referralCount: profile.referral_count || 0,
    };

    // 2. Calculate current badges
    const currentBadges = getBadges(stats);

    if (currentBadges.length === 0) return;

    // 3. Get previously notified badge titles (dedup)
    const { data: previousNotifs } = await admin
      .from("notifications")
      .select("data")
      .eq("user_id", userId)
      .eq("type", "badge_unlocked");

    const alreadyNotifiedTitles = new Set(
      (previousNotifs || [])
        .map((n: any) => {
          const d = typeof n.data === "string" ? JSON.parse(n.data) : n.data;
          return d?.badge_name;
        })
        .filter(Boolean)
    );

    // 4. Find new badges and notify
    const firstName = profile.first_name
      || (profile.display_name ? profile.display_name.split(/\s+/)[0] : "Joueur");

    for (const badge of currentBadges) {
      if (alreadyNotifiedTitles.has(badge.title)) continue;

      await createServerNotification(
        userId,
        "badge_unlocked",
        "Badge debloque !",
        `${firstName}, tu as debloque le badge "${badge.title}" — ${badge.description}`,
        {
          badge_name: badge.title,
          badge_description: badge.description,
          badge_icon: badge.icon,
        }
      );

      sendPushNotification(
        userId,
        "Badge debloque !",
        `${firstName}, tu as debloque "${badge.title}" !`,
        { type: "badge_unlocked", badge_name: badge.title }
      ).catch(() => {});

      logger.info(`[badge-notifications] New badge "${badge.title}" for ${userId}`);
    }
  } catch (error) {
    logger.error("[badge-notifications] Error", { error: (error as Error).message, userId });
  }
}
