import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import {
  sendPushNotification,
  createServerNotification,
} from "@/lib/notifications/send-push";
import {
  type ChallengeRecord,
  type MatchHistoryItem,
} from "@/lib/challenges";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET_CLUB = "club-challenges";
const BUCKET_GLOBAL = "challenges";
const GLOBAL_KEY = "__global__/challenges.json";

// ─── Helpers for loading challenges (mirrored from lib/challenges.ts for server use) ───

async function loadClubChallenges(clubId: string): Promise<ChallengeRecord[]> {
  const { data, error } = await supabase.storage
    .from(BUCKET_CLUB)
    .download(`${clubId}.json`);
  if (error || !data) return [];
  try {
    const text = await data.text();
    if (!text || text.trim().length === 0) return [];
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map((r: any) => ({ ...r, scope: "club" }));
    }
  } catch {
    /* ignore parse errors */
  }
  return [];
}

async function loadGlobalChallenges(): Promise<ChallengeRecord[]> {
  const { data, error } = await supabase.storage
    .from(BUCKET_GLOBAL)
    .download(GLOBAL_KEY);
  if (error || !data) return [];
  try {
    const text = await data.text();
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map((r: any) => ({
        id: r.id,
        club_id: "global",
        title: r.title || r.name,
        start_date: r.start_date,
        end_date: r.end_date,
        objective: r.objective,
        reward_type: r.reward_type || "points",
        reward_label: r.reward_label || r.reward || "",
        created_at: r.created_at,
        scope: "global" as const,
        isPremium: !!r.is_premium,
      }));
    }
  } catch {
    /* ignore */
  }
  return [];
}

// ─── Progress calculation (simplified from lib/challenges.ts) ───

function extractTarget(objective: string): number {
  const match = objective.match(/(\d+)/);
  if (!match) return 1;
  const v = parseInt(match[1], 10);
  return Number.isFinite(v) && v > 0 ? v : 1;
}

function isWinObjective(objective: string): boolean {
  return /(remporter|gagner|victoire|victoires|win|wins|won)/i.test(objective);
}

function computeSimpleProgress(
  challenge: ChallengeRecord,
  history: MatchHistoryItem[]
): { current: number; target: number } {
  const target = Math.max(1, extractTarget(challenge.objective));
  const metricIsWin = isWinObjective(challenge.objective);

  const start = new Date(challenge.start_date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(challenge.end_date);
  end.setUTCHours(23, 59, 59, 999);

  const relevant = history.filter((item) => {
    if (!item.playedAt) return false;
    const isGlobal =
      challenge.scope === "global" || challenge.club_id === "global";
    if (!isGlobal && challenge.club_id && item.locationClubId !== challenge.club_id)
      return false;
    const played = new Date(item.playedAt);
    return played >= start && played <= end;
  });

  const current = metricIsWin
    ? relevant.filter((m) => m.isWinner).length
    : relevant.length;

  return { current: Math.min(current, target), target };
}

// ─── Player history loader ───

async function loadPlayerHistory(userId: string): Promise<MatchHistoryItem[]> {
  const { data: parts } = await supabase
    .from("match_participants")
    .select("match_id, team")
    .eq("user_id", userId)
    .eq("player_type", "user");

  if (!parts || parts.length === 0) return [];

  const matchIds = parts.map((p: any) => p.match_id);
  const teamMap = new Map(parts.map((p: any) => [p.match_id, p.team]));

  const { data: matches } = await supabase
    .from("matches")
    .select(
      "id, played_at, winner_team_id, team1_id, team2_id, created_at, location_club_id"
    )
    .in("id", matchIds)
    .eq("status", "confirmed");

  if (!matches) return [];

  return matches.map((m: any) => {
    const teamNum = teamMap.get(m.id);
    const teamId = teamNum === 1 ? m.team1_id : m.team2_id;
    return {
      matchId: m.id,
      playedAt: m.played_at ?? m.created_at ?? null,
      isWinner: m.winner_team_id === teamId,
      locationClubId: m.location_club_id,
    };
  });
}

// ─── Main cron handler ───

export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const authToken = req.headers
    .get("authorization")
    ?.replace("Bearer ", "");
  const isManualAuthorized = authToken === process.env.CRON_SECRET;

  if (!isVercelCron && !isManualAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  logger.info("🏅 Cron challenge-notifications started");

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

    // 2. Get user profiles (club_id + first_name)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, display_name, club_id")
      .in("id", userIds);

    const profileMap = new Map(
      (profiles || []).map((p: any) => [
        p.id,
        {
          firstName:
            p.first_name ||
            (p.display_name ? p.display_name.split(/\s+/)[0] : "Joueur"),
          clubId: p.club_id as string | null,
        },
      ])
    );

    // 3. Load global challenges once
    const globalChallenges = await loadGlobalChallenges();

    // 4. Load club challenges per unique club
    const clubIds = [
      ...new Set(
        [...profileMap.values()]
          .map((p) => p.clubId)
          .filter(Boolean) as string[]
      ),
    ];
    const clubChallengesMap = new Map<string, ChallengeRecord[]>();
    for (const clubId of clubIds) {
      clubChallengesMap.set(clubId, await loadClubChallenges(clubId));
    }

    // 5. Get already claimed rewards to avoid notifying for completed+claimed
    const { data: allClaimed } = await supabase
      .from("challenge_rewards")
      .select("user_id, challenge_id")
      .in("user_id", userIds);
    const claimedSet = new Set(
      (allClaimed || []).map(
        (r: any) => `${r.user_id}:${r.challenge_id}`
      )
    );

    // 6. Track what we've already notified recently (dedup via notifications table)
    // Check last 48h notifications of challenge types
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: recentNotifs } = await supabase
      .from("notifications")
      .select("user_id, type, data")
      .in("type", ["challenge_new", "challenge_expiring", "challenge_progress"])
      .gte("created_at", twoDaysAgo)
      .in("user_id", userIds);

    const recentNotifKeys = new Set(
      (recentNotifs || []).map((n: any) => {
        const d = n.data || {};
        return `${n.user_id}:${n.type}:${d.challenge_id || ""}`;
      })
    );

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fortyEightHoursFromNow = new Date(
      now.getTime() + 48 * 60 * 60 * 1000
    );

    let sentNew = 0;
    let sentExpiring = 0;
    let sentProgress = 0;

    // 7. Process each user
    for (const userId of userIds) {
      const profile = profileMap.get(userId);
      if (!profile) continue;
      const firstName = profile.firstName;

      // Combine challenges for this user
      const userChallenges: ChallengeRecord[] = [
        ...globalChallenges,
        ...(profile.clubId ? clubChallengesMap.get(profile.clubId) || [] : []),
      ];

      if (userChallenges.length === 0) continue;

      // --- #8 : Nouveaux challenges (créés dans les dernières 24h) ---
      const newChallenges = userChallenges.filter((c) => {
        const created = new Date(c.created_at);
        const start = new Date(c.start_date);
        return created >= twentyFourHoursAgo && start <= now;
      });

      for (const c of newChallenges) {
        const key = `${userId}:challenge_new:${c.id}`;
        if (recentNotifKeys.has(key)) continue;
        recentNotifKeys.add(key);

        const reward =
          c.reward_type === "points"
            ? `${c.reward_label} points`
            : `le badge ${c.reward_label}`;

        await createServerNotification(
          userId,
          "challenge_new",
          "🆕 Nouveau challenge !",
          `${firstName}, nouveau défi : "${c.title}". Remporte ${reward} en relevant le challenge !`,
          { type: "challenge_new", challenge_id: c.id, challenge_title: c.title }
        );
        await sendPushNotification(
          userId,
          "🆕 Nouveau challenge !",
          `${firstName}, nouveau défi : "${c.title}". Remporte ${reward} !`,
          { type: "challenge_new", challenge_id: c.id }
        );
        sentNew++;
      }

      // --- #9 : Challenges expirant dans les 48 prochaines heures ---
      const expiringChallenges = userChallenges.filter((c) => {
        const end = new Date(c.end_date);
        const start = new Date(c.start_date);
        return start <= now && end > now && end <= fortyEightHoursFromNow;
      });

      for (const c of expiringChallenges) {
        const key = `${userId}:challenge_expiring:${c.id}`;
        if (recentNotifKeys.has(key)) continue;
        if (claimedSet.has(`${userId}:${c.id}`)) continue;
        recentNotifKeys.add(key);

        const end = new Date(c.end_date);
        const hoursLeft = Math.round(
          (end.getTime() - now.getTime()) / (1000 * 60 * 60)
        );
        const timeLabel =
          hoursLeft > 24
            ? `${Math.round(hoursLeft / 24)} jour${Math.round(hoursLeft / 24) > 1 ? "s" : ""}`
            : `${hoursLeft}h`;

        await createServerNotification(
          userId,
          "challenge_expiring",
          "⏰ Challenge bientôt terminé !",
          `${firstName}, plus que ${timeLabel} pour compléter "${c.title}". Ne laisse pas passer ta chance !`,
          { type: "challenge_expiring", challenge_id: c.id, hours_left: hoursLeft }
        );
        await sendPushNotification(
          userId,
          "⏰ Challenge bientôt terminé !",
          `Plus que ${timeLabel} pour "${c.title}" ! Fonce ${firstName} 🏃`,
          { type: "challenge_expiring", challenge_id: c.id }
        );
        sentExpiring++;
      }

      // --- #10 : Milestones de progression (50%, 75%) ---
      const activeChallenges = userChallenges.filter((c) => {
        const start = new Date(c.start_date);
        const end = new Date(c.end_date);
        return start <= now && end > now;
      });

      if (activeChallenges.length > 0) {
        // Load history once per user (only if they have active challenges)
        const history = await loadPlayerHistory(userId);

        for (const c of activeChallenges) {
          if (claimedSet.has(`${userId}:${c.id}`)) continue;

          const { current, target } = computeSimpleProgress(c, history);
          const pct = Math.round((current / target) * 100);

          // Check 50% milestone
          if (pct >= 50 && pct < 75) {
            const key = `${userId}:challenge_progress:${c.id}`;
            if (recentNotifKeys.has(key)) continue;
            recentNotifKeys.add(key);

            await createServerNotification(
              userId,
              "challenge_progress",
              "🎯 Mi-parcours atteint !",
              `${firstName}, tu es à ${pct}% du challenge "${c.title}" (${current}/${target}). Continue, tu y es presque !`,
              { type: "challenge_progress", challenge_id: c.id, progress_pct: pct, current, target }
            );
            await sendPushNotification(
              userId,
              "🎯 Mi-parcours atteint !",
              `${current}/${target} pour "${c.title}" — à ${pct}% ${firstName} ! 💪`,
              { type: "challenge_progress", challenge_id: c.id }
            );
            sentProgress++;
          }

          // Check 75% milestone
          if (pct >= 75 && pct < 100) {
            const key75 = `${userId}:challenge_progress:${c.id}:75`;
            if (recentNotifKeys.has(key75)) continue;
            recentNotifKeys.add(key75);

            await createServerNotification(
              userId,
              "challenge_progress",
              "🔥 Presque terminé !",
              `${firstName}, ${current}/${target} pour "${c.title}" — plus que ${target - current} ! Tu vas y arriver 🚀`,
              { type: "challenge_progress", challenge_id: c.id, progress_pct: pct, current, target, milestone: 75 }
            );
            await sendPushNotification(
              userId,
              "🔥 Presque terminé !",
              `${current}/${target} pour "${c.title}" — encore ${target - current} ${firstName} ! 🚀`,
              { type: "challenge_progress", challenge_id: c.id }
            );
            sentProgress++;
          }
        }
      }
    }

    logger.info(
      `✅ Challenge notifications: ${sentNew} new, ${sentExpiring} expiring, ${sentProgress} progress`
    );

    return NextResponse.json({
      success: true,
      date: now.toISOString(),
      results: {
        newChallenges: sentNew,
        expiring: sentExpiring,
        progress: sentProgress,
        total: sentNew + sentExpiring + sentProgress,
      },
    });
  } catch (error: any) {
    logger.error("❌ Cron challenge-notifications error:", error);
    return NextResponse.json(
      { error: "Server error", details: error.message },
      { status: 500 }
    );
  }
}
