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

export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const authToken = req.headers
    .get("authorization")
    ?.replace("Bearer ", "");
  const isManualAuthorized = authToken === process.env.CRON_SECRET;

  if (!isVercelCron && !isManualAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  logger.info("📊 Cron weekly-recap started");

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

    // 2. Get profiles for personalization
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, display_name, club_id, global_points")
      .in("id", userIds);

    const profileMap = new Map(
      (profiles || []).map((p: any) => [
        p.id,
        {
          firstName:
            p.first_name ||
            (p.display_name ? p.display_name.split(/\s+/)[0] : "Joueur"),
          clubId: p.club_id as string | null,
          globalPoints: (p.global_points || 0) as number,
        },
      ])
    );

    // 3. Get match activity for the past 7 days for each user
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();

    // Build map: userId -> { matchCount, wins }
    const userActivity = new Map<
      string,
      { matchCount: number; wins: number }
    >();

    // Process in batches
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);

      // Get match participations from last 7 days
      const { data: participations } = await supabase
        .from("match_participants")
        .select("user_id, match_id, team")
        .in("user_id", batch)
        .eq("player_type", "user");

      if (!participations || participations.length === 0) continue;

      const matchIds = [
        ...new Set(participations.map((p: any) => p.match_id)),
      ];

      // Get confirmed matches from the last 7 days
      const { data: recentMatches } = await supabase
        .from("matches")
        .select("id, winner_team_id, team1_id, team2_id, played_at")
        .in("id", matchIds)
        .eq("status", "confirmed")
        .gte("played_at", sevenDaysAgoISO);

      if (!recentMatches) continue;

      const recentMatchSet = new Set(recentMatches.map((m: any) => m.id));
      const matchDataMap = new Map(
        recentMatches.map((m: any) => [m.id, m])
      );

      for (const part of participations) {
        if (!recentMatchSet.has(part.match_id)) continue;

        const activity = userActivity.get(part.user_id) || {
          matchCount: 0,
          wins: 0,
        };
        activity.matchCount++;

        const match = matchDataMap.get(part.match_id);
        if (match) {
          const teamId =
            part.team === 1 ? match.team1_id : match.team2_id;
          if (match.winner_team_id === teamId) {
            activity.wins++;
          }
        }
        userActivity.set(part.user_id, activity);
      }
    }

    // 4. Get last match date for inactive user detection
    // For users with NO activity in last 7 days, check last match ever
    const inactiveUserIds = userIds.filter(
      (id) => !userActivity.has(id) || userActivity.get(id)!.matchCount === 0
    );

    const lastMatchMap = new Map<string, Date | null>();

    for (let i = 0; i < inactiveUserIds.length; i += BATCH_SIZE) {
      const batch = inactiveUserIds.slice(i, i + BATCH_SIZE);

      const { data: lastParts } = await supabase
        .from("match_participants")
        .select("user_id, match_id")
        .in("user_id", batch)
        .eq("player_type", "user");

      if (!lastParts || lastParts.length === 0) {
        // These users have never played
        batch.forEach((id) => lastMatchMap.set(id, null));
        continue;
      }

      const matchIds = [
        ...new Set(lastParts.map((p: any) => p.match_id)),
      ];

      const { data: matchDates } = await supabase
        .from("matches")
        .select("id, played_at")
        .in("id", matchIds)
        .eq("status", "confirmed")
        .order("played_at", { ascending: false });

      if (!matchDates) continue;

      // Group by user -> most recent match date
      const matchDateMap = new Map(
        matchDates.map((m: any) => [m.id, m.played_at])
      );

      const userMatchIds = new Map<string, string[]>();
      for (const p of lastParts) {
        if (!userMatchIds.has(p.user_id)) userMatchIds.set(p.user_id, []);
        userMatchIds.get(p.user_id)!.push(p.match_id);
      }

      for (const [uid, mIds] of userMatchIds) {
        let latest: Date | null = null;
        for (const mid of mIds) {
          const playedAt = matchDateMap.get(mid);
          if (playedAt) {
            const d = new Date(playedAt);
            if (!latest || d > latest) latest = d;
          }
        }
        lastMatchMap.set(uid, latest);
      }
    }

    // 5. Dedup: check for recent weekly_recap / inactivity_reminder in last 6 days
    const sixDaysAgo = new Date(
      now.getTime() - 6 * 24 * 60 * 60 * 1000
    ).toISOString();
    const { data: recentNotifs } = await supabase
      .from("notifications")
      .select("user_id, type")
      .in("type", ["weekly_recap", "inactivity_reminder"])
      .gte("created_at", sixDaysAgo)
      .in("user_id", userIds);

    const alreadyNotified = new Set(
      (recentNotifs || []).map((n: any) => `${n.user_id}:${n.type}`)
    );

    // 6. Get club leaderboard rank for users who played
    // Simple approach: count users with more club_points in the same club
    const activeUserIds = userIds.filter(
      (id) => userActivity.has(id) && userActivity.get(id)!.matchCount > 0
    );

    const clubRankMap = new Map<string, number>();

    // Group active users by club
    const usersByClub = new Map<string, string[]>();
    for (const uid of activeUserIds) {
      const clubId = profileMap.get(uid)?.clubId;
      if (!clubId) continue;
      if (!usersByClub.has(clubId)) usersByClub.set(clubId, []);
      usersByClub.get(clubId)!.push(uid);
    }

    for (const [clubId, members] of usersByClub) {
      const { data: clubMembers } = await supabase
        .from("user_clubs")
        .select("user_id, club_points")
        .eq("club_id", clubId)
        .order("club_points", { ascending: false });

      if (clubMembers) {
        for (let rank = 0; rank < clubMembers.length; rank++) {
          const cm = clubMembers[rank];
          if (members.includes(cm.user_id)) {
            clubRankMap.set(cm.user_id, rank + 1);
          }
        }
      }
    }

    // 7. Send notifications
    let sentRecap = 0;
    let sentInactivity = 0;

    for (const userId of userIds) {
      const profile = profileMap.get(userId);
      if (!profile) continue;
      const firstName = profile.firstName;
      const activity = userActivity.get(userId);

      if (activity && activity.matchCount > 0) {
        // --- #12 : Résumé hebdomadaire ---
        if (alreadyNotified.has(`${userId}:weekly_recap`)) continue;

        const losses = activity.matchCount - activity.wins;
        const winRate = Math.round(
          (activity.wins / activity.matchCount) * 100
        );
        const rank = clubRankMap.get(userId);

        let rankPart = "";
        if (rank) {
          if (rank <= 3) rankPart = ` Tu es ${rank === 1 ? "1er" : `${rank}ème`} au club 🏆`;
          else if (rank <= 10) rankPart = ` Tu es ${rank}ème au club 💪`;
          else rankPart = ` Classement club : ${rank}ème`;
        }

        const matchWord = activity.matchCount > 1 ? "matchs" : "match";
        const winEmoji =
          winRate >= 75 ? "🔥" : winRate >= 50 ? "👏" : "💪";

        await createServerNotification(
          userId,
          "weekly_recap",
          "📊 Ton résumé de la semaine",
          `${firstName}, cette semaine : ${activity.matchCount} ${matchWord} joué${activity.matchCount > 1 ? "s" : ""}, ${activity.wins} victoire${activity.wins > 1 ? "s" : ""} (${winRate}%) ${winEmoji}.${rankPart}`,
          {
            type: "weekly_recap",
            matches: activity.matchCount,
            wins: activity.wins,
            losses,
            win_rate: winRate,
            club_rank: rank || null,
          }
        );
        await sendPushNotification(
          userId,
          "📊 Résumé de la semaine",
          `${firstName} : ${activity.matchCount} ${matchWord}, ${activity.wins}V/${losses}D (${winRate}%) ${winEmoji}${rankPart}`,
          { type: "weekly_recap" }
        );
        sentRecap++;
      } else {
        // --- #11 : Rappel d'inactivité ---
        if (alreadyNotified.has(`${userId}:inactivity_reminder`)) continue;

        const lastMatch = lastMatchMap.get(userId);

        // Only send for users inactive 7+ days
        if (lastMatch && lastMatch > sevenDaysAgo) continue;

        let message: string;
        let pushMessage: string;

        if (!lastMatch) {
          // Never played
          message = `${firstName}, tu n'as pas encore enregistré de match ! Joue ta première partie et fais évoluer ton classement 🎾`;
          pushMessage = `${firstName}, joue ton premier match et commence ton aventure padel ! 🎾`;
        } else {
          const daysSince = Math.round(
            (now.getTime() - lastMatch.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysSince >= 30) {
            message = `${firstName}, ça fait ${daysSince} jours sans match ! Ton classement n'attend que toi. Reviens sur le terrain 🎾`;
            pushMessage = `${firstName}, ${daysSince} jours sans jouer ! Reviens, le padel te manque 😉`;
          } else if (daysSince >= 14) {
            message = `${firstName}, ça fait ${daysSince} jours sans match. Tes adversaires progressent, et toi ? Reviens en forme ! 💪`;
            pushMessage = `${firstName}, ${daysSince}j sans jouer. Tes rivaux avancent ! 💪`;
          } else {
            message = `${firstName}, ça fait ${daysSince} jours sans match. Un petit padel cette semaine ? Ton classement va en profiter 📈`;
            pushMessage = `${firstName}, ${daysSince}j sans match. Un padel cette semaine ? 📈`;
          }
        }

        await createServerNotification(
          userId,
          "inactivity_reminder",
          "😴 Tu nous manques !",
          message,
          {
            type: "inactivity_reminder",
            days_since_last_match: lastMatch
              ? Math.round(
                  (now.getTime() - lastMatch.getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              : null,
          }
        );
        await sendPushNotification(userId, "😴 Tu nous manques !", pushMessage, {
          type: "inactivity_reminder",
        });
        sentInactivity++;
      }
    }

    logger.info(
      `✅ Weekly recap: ${sentRecap} recaps, ${sentInactivity} inactivity reminders`
    );

    return NextResponse.json({
      success: true,
      date: now.toISOString(),
      results: {
        recaps: sentRecap,
        inactivityReminders: sentInactivity,
        total: sentRecap + sentInactivity,
      },
    });
  } catch (error: any) {
    logger.error("❌ Cron weekly-recap error:", error);
    return NextResponse.json(
      { error: "Server error", details: error.message },
      { status: 500 }
    );
  }
}
