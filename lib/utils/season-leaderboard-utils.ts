import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { filterMatchesByDailyLimit } from "@/lib/utils/match-limit-utils";
import { MAX_MATCHES_PER_DAY } from "@/lib/match-constants";
import { getPlayerDisplayName } from "@/lib/utils/player-utils";
import { getCountryFromRegion } from "@/lib/utils/geo-leaderboard-utils";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  : null;

const BELGIAN_DEPTS = ["BRU", "VLB", "WBR", "ANT", "LIM", "OVL", "WVL", "HAI", "LIE", "LUX", "NAM"];

export type SeasonLeaderboardEntry = {
  rank: number;
  user_id: string;
  player_name: string;
  points: number;
  wins: number;
  losses: number;
  matches: number;
  avatar_url: string | null;
  niveau_padel?: number | null;
};

/**
 * Calculate a national season leaderboard for a specific country.
 */
export async function calculateSeasonLeaderboardForCountry(
  dateRange: { start: string; end: string },
  country: "FR" | "BE"
): Promise<SeasonLeaderboardEntry[]> {
  if (!supabaseAdmin) {
    logger.warn("[calculateSeasonLeaderboard] Supabase admin not configured");
    return [];
  }

  try {
    // 1. Get profiles filtered by country
    let profilesQuery = supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, display_name, avatar_url, niveau_padel, department_code, region_code")
      .not("email", "is", null);

    if (country === "BE") {
      profilesQuery = profilesQuery.in("department_code", BELGIAN_DEPTS);
    } else {
      profilesQuery = profilesQuery.not("region_code", "eq", "BEL");
    }

    const { data: profiles, error: profilesError } = await profilesQuery;
    if (profilesError || !profiles || profiles.length === 0) return [];

    const userIds = profiles.map(p => p.id);
    const profilesMap = new Map(profiles.map(p => [p.id, p]));

    // 2. Get all match participants for these users
    const { data: allParticipants, error: partError } = await supabaseAdmin
      .from("match_participants")
      .select("user_id, team, match_id")
      .in("user_id", userIds)
      .eq("player_type", "user");

    if (partError || !allParticipants) return [];

    const matchIds = [...new Set(allParticipants.map(p => p.match_id))];
    if (matchIds.length === 0) return [];

    // 3. Get matches in date range
    const { data: allMatches, error: matchesError } = await supabaseAdmin
      .from("matches")
      .select("id, winner_team_id, team1_id, team2_id, played_at, created_at")
      .in("id", matchIds)
      .eq("status", "confirmed")
      .gte("played_at", dateRange.start)
      .lte("played_at", dateRange.end + "T23:59:59.999Z");

    if (matchesError || !allMatches || allMatches.length === 0) return [];

    const matchesMap = new Map<string, { winner_team_id: string; team1_id: string; team2_id: string; played_at: string }>();
    allMatches.forEach(m => {
      if (m.winner_team_id && m.team1_id && m.team2_id) {
        matchesMap.set(m.id, {
          winner_team_id: m.winner_team_id,
          team1_id: m.team1_id,
          team2_id: m.team2_id,
          played_at: m.played_at || m.created_at || new Date().toISOString(),
        });
      }
    });

    // 4. Calculate stats per player
    const playersStats = new Map<string, { wins: number; losses: number; matches: number }>();

    for (const userId of userIds) {
      const playerParts = allParticipants.filter(p => p.user_id === userId);
      const playerMatchObjs = playerParts
        .map(p => matchesMap.has(p.match_id) ? { id: p.match_id, ...matchesMap.get(p.match_id)! } : null)
        .filter(Boolean) as Array<{ id: string; played_at: string; winner_team_id: string; team1_id: string; team2_id: string }>;

      if (playerMatchObjs.length === 0) continue;

      const validMatchIds = filterMatchesByDailyLimit(
        playerParts.map(p => ({ match_id: p.match_id, user_id: userId })),
        playerMatchObjs.map(m => ({ id: m.id, played_at: m.played_at })),
        MAX_MATCHES_PER_DAY
      );

      let wins = 0, losses = 0, matches = 0;
      playerParts.forEach(p => {
        if (!validMatchIds.has(p.match_id) || !matchesMap.has(p.match_id)) return;
        const match = matchesMap.get(p.match_id)!;
        matches++;
        const winnerTeam = match.winner_team_id === match.team1_id ? 1 : 2;
        if (winnerTeam === p.team) wins++; else losses++;
      });

      if (matches > 0) playersStats.set(userId, { wins, losses, matches });
    }

    // 5. Build leaderboard
    const allPlayerNames = profiles.map(p => ({
      first_name: p.first_name || (p.display_name ? p.display_name.split(/\s+/)[0] : ""),
      last_name: p.last_name || (p.display_name ? p.display_name.split(/\s+/).slice(1).join(" ") : ""),
    }));

    const leaderboard: SeasonLeaderboardEntry[] = [];

    for (const [userId, stats] of playersStats) {
      const profile = profilesMap.get(userId);
      if (!profile) continue;

      const firstName = profile.first_name || (profile.display_name ? profile.display_name.split(/\s+/)[0] : "");
      const lastName = profile.last_name || (profile.display_name ? profile.display_name.split(/\s+/).slice(1).join(" ") : "");
      const displayName = getPlayerDisplayName({ first_name: firstName, last_name: lastName }, allPlayerNames);

      leaderboard.push({
        rank: 0,
        user_id: userId,
        player_name: displayName,
        points: stats.wins * 10 + stats.losses * 3,
        wins: stats.wins,
        losses: stats.losses,
        matches: stats.matches,
        avatar_url: profile.avatar_url || null,
        niveau_padel: profile.niveau_padel || null,
      });
    }

    return leaderboard
      .sort((a, b) => b.points !== a.points ? b.points - a.points : a.player_name.localeCompare(b.player_name))
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  } catch (error) {
    logger.error("[calculateSeasonLeaderboard] Error", { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * Determine which country a user belongs to based on their profile.
 */
export async function getUserCountry(userId: string): Promise<"FR" | "BE"> {
  if (!supabaseAdmin) return "FR";
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("region_code")
    .eq("id", userId)
    .maybeSingle();
  return getCountryFromRegion(profile?.region_code || null);
}
