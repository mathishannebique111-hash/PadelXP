import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { filterMatchesByDailyLimit } from "@/lib/utils/match-limit-utils";
import { MAX_MATCHES_PER_DAY } from "@/lib/match-constants";
import { getPlayerDisplayName } from "@/lib/utils/player-utils";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  : null;

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
 * Calculate a global leaderboard for a season date range.
 * Includes ALL players across the app, not filtered by club.
 */
export async function calculateGlobalSeasonLeaderboard(
  dateRange: { start: string; end: string }
): Promise<SeasonLeaderboardEntry[]> {
  if (!supabaseAdmin) {
    logger.warn("[calculateGlobalSeasonLeaderboard] Supabase admin client not configured");
    return [];
  }

  try {
    // 1. Get ALL confirmed matches in the date range
    const { data: allMatches, error: matchesError } = await supabaseAdmin
      .from("matches")
      .select("id, winner_team_id, team1_id, team2_id, played_at, created_at")
      .eq("status", "confirmed")
      .gte("played_at", dateRange.start)
      .lte("played_at", dateRange.end + "T23:59:59.999Z");

    if (matchesError) {
      logger.error("[calculateGlobalSeasonLeaderboard] Error fetching matches", { error: matchesError.message });
      return [];
    }

    if (!allMatches || allMatches.length === 0) return [];

    const matchIds = allMatches.map(m => m.id);
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

    // 2. Get all participants for these matches
    const { data: allParticipants, error: participantsError } = await supabaseAdmin
      .from("match_participants")
      .select("user_id, player_type, team, match_id")
      .in("match_id", matchIds)
      .eq("player_type", "user");

    if (participantsError || !allParticipants) return [];

    // 3. Get unique user IDs
    const userIds = [...new Set(allParticipants.map(p => p.user_id).filter(Boolean))];
    if (userIds.length === 0) return [];

    // 4. Fetch profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, display_name, avatar_url, niveau_padel")
      .in("id", userIds);

    if (profilesError || !profiles) return [];

    const profilesMap = new Map(profiles.map(p => [p.id, p]));

    // 5. Calculate stats per player
    const playersStats = new Map<string, { wins: number; losses: number; matches: number }>();

    for (const userId of userIds) {
      const playerParticipants = allParticipants.filter(p => p.user_id === userId);
      const playerMatchIds = playerParticipants.map(p => p.match_id);
      const playerMatches = playerMatchIds
        .map(id => matchesMap.has(id) ? { id, ...matchesMap.get(id)! } : null)
        .filter(Boolean) as Array<{ id: string; winner_team_id: string; team1_id: string; team2_id: string; played_at: string }>;

      const validMatchIds = filterMatchesByDailyLimit(
        playerParticipants.map(p => ({ match_id: p.match_id, user_id: userId })),
        playerMatches.map(m => ({ id: m.id, played_at: m.played_at })),
        MAX_MATCHES_PER_DAY
      );

      let wins = 0, losses = 0, matches = 0;
      playerParticipants.forEach(p => {
        if (!validMatchIds.has(p.match_id) || !matchesMap.has(p.match_id)) return;
        const match = matchesMap.get(p.match_id)!;
        matches++;
        const winnerTeam = match.winner_team_id === match.team1_id ? 1 : 2;
        if (winnerTeam === p.team) wins++;
        else losses++;
      });

      playersStats.set(userId, { wins, losses, matches });
    }

    // 6. Build leaderboard (points = wins * 10 + losses * 3)
    const allPlayerNames = profiles.map(p => ({
      first_name: p.first_name || (p.display_name ? p.display_name.split(/\s+/)[0] : ""),
      last_name: p.last_name || (p.display_name ? p.display_name.split(/\s+/).slice(1).join(" ") : ""),
    }));

    const leaderboard: SeasonLeaderboardEntry[] = userIds
      .map(userId => {
        const stats = playersStats.get(userId) || { wins: 0, losses: 0, matches: 0 };
        const profile = profilesMap.get(userId);
        if (!profile) return null;

        const firstName = profile.first_name || (profile.display_name ? profile.display_name.split(/\s+/)[0] : "");
        const lastName = profile.last_name || (profile.display_name ? profile.display_name.split(/\s+/).slice(1).join(" ") : "");
        const displayName = getPlayerDisplayName({ first_name: firstName, last_name: lastName }, allPlayerNames);

        const points = stats.wins * 10 + stats.losses * 3;

        return {
          rank: 0,
          user_id: userId,
          player_name: displayName,
          points,
          wins: stats.wins,
          losses: stats.losses,
          matches: stats.matches,
          avatar_url: profile.avatar_url || null,
          niveau_padel: profile.niveau_padel || null,
        };
      })
      .filter(Boolean) as SeasonLeaderboardEntry[];

    return leaderboard
      .sort((a, b) => b.points !== a.points ? b.points - a.points : a.player_name.localeCompare(b.player_name))
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  } catch (error) {
    logger.error("[calculateGlobalSeasonLeaderboard] Unexpected error", { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}
