import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateGeoLeaderboard, type LeaderboardScope } from "@/lib/utils/geo-leaderboard-utils";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SCOPES: LeaderboardScope[] = ["club", "department", "region", "national"];

const SCOPE_LABELS: Record<LeaderboardScope, string> = {
  club: "au Club",
  department: "dans ton Département",
  region: "dans ta Région",
  national: "en France",
};

async function callPushEdgeFunction(userId: string, title: string, message: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/push-notifications`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      record: { user_id: userId, title, message, data: { type: "ranking_change" } },
    }),
  });
  return res.ok;
}

/**
 * Builds an aggregated, personalized push notification message from ranking changes.
 *
 * Rules:
 * - Club scope: cite who overtook the player (most meaningful).
 * - Other scopes: mention rank change (+ or -).
 * - If only one scope changed → specific targeted message.
 * - If multiple scopes changed → single aggregated summary.
 */
function buildNotification(
  firstName: string,
  changes: Array<{
    scope: LeaderboardScope;
    oldRank: number;
    newRank: number;
    overtakenBy?: string; // player name (club scope only)
  }>
): { title: string; message: string } | null {
  if (changes.length === 0) return null;

  const losses = changes.filter((c) => c.newRank > c.oldRank);
  const gains = changes.filter((c) => c.newRank < c.oldRank);

  if (changes.length === 1) {
    const c = changes[0];
    if (c.newRank > c.oldRank) {
      // Lost place(s)
      if (c.scope === "club" && c.overtakenBy) {
        return {
          title: "📈 On t'a doublé au classement !",
          message: `Aïe ${firstName} ! ${c.overtakenBy} vient de te dépasser au club. Tu es maintenant ${c.newRank}ème. Prêt à reprendre ta place ? 🎾`,
        };
      }
      const diff = c.newRank - c.oldRank;
      return {
        title: `📉 Classement ${SCOPE_LABELS[c.scope]}`,
        message: `${firstName}, tu recules de ${diff} place${diff > 1 ? "s" : ""} ${SCOPE_LABELS[c.scope]}. Tu es maintenant ${c.newRank}ème. Enregistre un match pour remonter ! 💪`,
      };
    } else {
      // Gained place(s)
      const diff = c.oldRank - c.newRank;
      const milestone = c.newRank <= 3 ? " Tu es sur le podium 🏆 !" : c.newRank <= 10 ? " Tu es dans le Top 10 🔥 !" : ` Tu es ${c.newRank}ème 🎾`;
      return {
        title: `🚀 Tu montes au classement !`,
        message: `Bravo ${firstName} ! +${diff} place${diff > 1 ? "s" : ""} ${SCOPE_LABELS[c.scope]}.${milestone}`,
      };
    }
  }

  // Multiple changes: build aggregated summary
  const parts: string[] = [];

  // Club change first (most personal)
  const clubChange = changes.find((c) => c.scope === "club");
  if (clubChange) {
    if (clubChange.newRank > clubChange.oldRank && clubChange.overtakenBy) {
      parts.push(`tu passes ${clubChange.newRank}ème au club (doublé par ${clubChange.overtakenBy})`);
    } else if (clubChange.newRank < clubChange.oldRank) {
      parts.push(`tu passes ${clubChange.newRank}ème au club 🚀`);
    }
  }

  losses
    .filter((c) => c.scope !== "club")
    .forEach((c) => {
      const diff = c.newRank - c.oldRank;
      parts.push(`-${diff} place${diff > 1 ? "s" : ""} ${SCOPE_LABELS[c.scope]}`);
    });

  gains
    .filter((c) => c.scope !== "club")
    .forEach((c) => {
      const diff = c.oldRank - c.newRank;
      parts.push(`+${diff} place${diff > 1 ? "s" : ""} ${SCOPE_LABELS[c.scope]} 📈`);
    });

  const hasLoss = losses.length > 0;
  const emoji = hasLoss ? "📊" : "🚀";

  return {
    title: `${emoji} Tes classements bougent !`,
    message: `${firstName}, ${parts.join(", ")}. Continue comme ça ! 🎾`,
  };
}

export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const authToken = req.headers.get("authorization")?.replace("Bearer ", "");
  const isManualAuthorized = authToken === process.env.CRON_SECRET;

  if (!isVercelCron && !isManualAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  logger.info("🏆 Cron ranking-alerts started");

  try {
    // 1. Get all users with push tokens
    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("user_id");

    if (tokensError) throw tokensError;
    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ message: "No tokens found", sent: 0 });
    }

    const userIdsWithTokens = new Set<string>(tokens.map((t: any) => t.user_id));

    // 2. Get first names for personalization
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, display_name, club_id, department_code")
      .in("id", [...userIdsWithTokens]);

    const profileMap = new Map(
      (profiles || []).map((p: any) => [
        p.id,
        {
          firstName:
            p.first_name ||
            (p.display_name ? p.display_name.split(/\s+/)[0] : "Joueur"),
          clubId: p.club_id,
          departmentCode: p.department_code,
        },
      ])
    );

    // 3. Load existing snapshots
    const { data: existingSnapshots } = await supabase
      .from("ranking_snapshots")
      .select("user_id, scope, last_rank, last_points")
      .in("user_id", [...userIdsWithTokens]);

    // Map: userId → scope → { last_rank, last_points }
    const snapshotMap = new Map<string, Map<string, { last_rank: number; last_points: number }>>();
    for (const snap of existingSnapshots || []) {
      if (!snapshotMap.has(snap.user_id)) snapshotMap.set(snap.user_id, new Map());
      snapshotMap.get(snap.user_id)!.set(snap.scope, { last_rank: snap.last_rank, last_points: snap.last_points });
    }

    // 4. Calculate current leaderboards for each scope
    // We use a sentinel user to get relevant geo scope context, per scope.
    // For club/dept/region we need a representative user per group — we process by unique groups.
    // Build groups: club → [userId, ...], dept → [...], etc.
    const clubGroups = new Map<string, string[]>();
    const deptGroups = new Map<string, string[]>();

    for (const [userId, profile] of profileMap) {
      if (profile.clubId) {
        if (!clubGroups.has(profile.clubId)) clubGroups.set(profile.clubId, []);
        clubGroups.get(profile.clubId)!.push(userId);
      }
      if (profile.departmentCode) {
        if (!deptGroups.has(profile.departmentCode)) deptGroups.set(profile.departmentCode, []);
        deptGroups.get(profile.departmentCode)!.push(userId);
      }
    }

    // rankingResults: userId → scope → { rank, points }
    const rankingResults = new Map<string, Map<LeaderboardScope, { rank: number; points: number; playerName?: string }>>();

    // Helper to store results
    const storeResult = (userId: string, scope: LeaderboardScope, rank: number, points: number, playerName?: string) => {
      if (!rankingResults.has(userId)) rankingResults.set(userId, new Map());
      rankingResults.get(userId)!.set(scope, { rank, points, playerName });
    };

    // Process CLUB scope: once per club
    for (const [, members] of clubGroups) {
      const representativeUserId = members[0];
      const leaderboard = await calculateGeoLeaderboard(representativeUserId, "club");
      for (const entry of leaderboard) {
        if (userIdsWithTokens.has(entry.user_id)) {
          storeResult(entry.user_id, "club", entry.rank, entry.points, entry.player_name);
        }
      }
    }

    // Process DEPARTMENT scope: once per department
    for (const [, members] of deptGroups) {
      const representativeUserId = members[0];
      const leaderboard = await calculateGeoLeaderboard(representativeUserId, "department");
      for (const entry of leaderboard) {
        if (userIdsWithTokens.has(entry.user_id)) {
          storeResult(entry.user_id, "department", entry.rank, entry.points);
        }
      }
      // Region derives from department — compute once per dept group as well
      const regionLeaderboard = await calculateGeoLeaderboard(representativeUserId, "region");
      for (const entry of regionLeaderboard) {
        if (userIdsWithTokens.has(entry.user_id)) {
          storeResult(entry.user_id, "region", entry.rank, entry.points);
        }
      }
    }

    // Process NATIONAL scope: single leaderboard
    {
      const firstUserId = [...userIdsWithTokens][0];
      if (firstUserId) {
        const nationalLeaderboard = await calculateGeoLeaderboard(firstUserId, "national");
        for (const entry of nationalLeaderboard) {
          if (userIdsWithTokens.has(entry.user_id)) {
            storeResult(entry.user_id, "national", entry.rank, entry.points);
          }
        }
      }
    }

    // 5. Detect changes, send notifications, update snapshots
    const snapshotsToUpsert: Array<{
      user_id: string;
      scope: string;
      last_rank: number;
      last_points: number;
      updated_at: string;
    }> = [];

    let totalSent = 0;
    let totalFailed = 0;

    for (const [userId, scopeRankings] of rankingResults) {
      const profile = profileMap.get(userId);
      const firstName = profile?.firstName || "Joueur";
      const userSnapshots = snapshotMap.get(userId) || new Map();

      const changes: Array<{
        scope: LeaderboardScope;
        oldRank: number;
        newRank: number;
        overtakenBy?: string;
      }> = [];

      for (const [scope, { rank, points }] of scopeRankings) {
        const prevSnap = userSnapshots.get(scope);

        // Always queue snapshot update
        snapshotsToUpsert.push({
          user_id: userId,
          scope,
          last_rank: rank,
          last_points: points,
          updated_at: new Date().toISOString(),
        });

        if (!prevSnap) {
          // First time seeing this user — just save snapshot, no notification
          continue;
        }

        if (rank !== prevSnap.last_rank) {
          let overtakenBy: string | undefined;

          // For club scope losses: find who now ranks just above (rank - 1) to personalize
          if (scope === "club" && rank > prevSnap.last_rank) {
            const clubLeaderboard = rankingResults.get(userId)?.get("club");
            if (clubLeaderboard) {
              // Find the player who is at rank-1 in the club leaderboard
              const clubMembers = Array.from(profileMap.values()).filter(
                (p) => p.clubId === profile?.clubId
              );
              // Look in rankingResults for the user at (rank - 1) in the club
              for (const [uid, scopes] of rankingResults) {
                if (uid === userId) continue;
                const clubRank = scopes.get("club");
                if (clubRank && clubRank.rank === rank - 1 && profileMap.get(uid)?.clubId === profile?.clubId) {
                  overtakenBy = clubRank.playerName || profileMap.get(uid)?.firstName;
                  break;
                }
              }
            }
          }

          changes.push({ scope: scope as LeaderboardScope, oldRank: prevSnap.last_rank, newRank: rank, overtakenBy });
        }
      }

      if (changes.length > 0) {
        const notif = buildNotification(firstName, changes);
        if (notif) {
          const ok = await callPushEdgeFunction(userId, notif.title, notif.message);
          ok ? totalSent++ : totalFailed++;
          logger.info(`📣 Notified ${userId}: ${notif.title} (changes: ${changes.length})`);
        }
      }
    }

    // 6. Upsert snapshots in batch
    if (snapshotsToUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from("ranking_snapshots")
        .upsert(snapshotsToUpsert, { onConflict: "user_id, scope" });

      if (upsertError) {
        logger.error("❌ Error upserting ranking_snapshots", upsertError);
      } else {
        logger.info(`✅ ${snapshotsToUpsert.length} snapshots updated`);
      }
    }

    return NextResponse.json({
      success: true,
      date: new Date().toISOString(),
      results: { sent: totalSent, failed: totalFailed, snapshotsUpdated: snapshotsToUpsert.length },
    });
  } catch (error: any) {
    logger.error("❌ Cron ranking-alerts error:", error);
    return NextResponse.json({ error: "Server error", details: error.message }, { status: 500 });
  }
}
