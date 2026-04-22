import { createClient } from "@supabase/supabase-js";
import { type PlayerContext, type PartnerStats, type AdversaryStats } from "./system-prompt";
import { logger } from "@/lib/logger";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function tierForPoints(points: number): string {
  if (points >= 500) return "Champion";
  if (points >= 300) return "Diamant";
  if (points >= 200) return "Or";
  if (points >= 100) return "Argent";
  return "Bronze";
}

function getAdmin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const EMPTY_CONTEXT: Omit<PlayerContext, "firstName" | "level" | "tier" | "globalPoints"> = {
  totalMatches: 0,
  wins: 0,
  losses: 0,
  winrate: 0,
  currentStreak: 0,
  bestStreak: 0,
  recentMatches: [],
  preferredSide: null,
  hand: null,
  frequency: null,
  bestShot: null,
  clubName: null,
  clubRank: null,
  clubTotalPlayers: null,
  topPartners: [],
  hardestAdversaries: [],
  levelEvolution: [],
  matchesThisMonth: 0,
  matchesLastMonth: 0,
  officialPartner: null,
  badges: [],
};

/**
 * Charge le contexte complet d'un joueur pour injection dans le system prompt.
 * Utilise le service role pour bypasser RLS.
 */
export async function loadPlayerContext(userId: string): Promise<PlayerContext> {
  const admin = getAdmin();

  // 1. Profil complet
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("first_name, display_name, niveau_padel, global_points, club_id, preferred_side, hand, frequency, best_shot")
    .eq("id", userId)
    .single();

  if (profileError) {
    logger.error("[coach/player-context] Profile query error", { error: profileError.message, userId });
  }
  logger.info("[coach/player-context] Profile loaded", { firstName: profile?.first_name, level: profile?.niveau_padel, clubId: profile?.club_id });

  const firstName =
    profile?.first_name ||
    (profile?.display_name ? profile.display_name.split(/\s+/)[0] : "Joueur");
  const level = profile?.niveau_padel ?? 4.0;
  const globalPoints = profile?.global_points ?? 0;

  const baseContext = {
    firstName,
    level,
    tier: tierForPoints(globalPoints),
    globalPoints,
    preferredSide: profile?.preferred_side || null,
    hand: profile?.hand || null,
    frequency: profile?.frequency || null,
    bestShot: profile?.best_shot || null,
  };

  // 2. Club name + rank (parallel)
  const clubPromise = profile?.club_id
    ? (async () => {
        const [clubRes, rankRes] = await Promise.all([
          admin.from("clubs").select("name").eq("id", profile.club_id).single(),
          admin.from("user_clubs").select("club_points").eq("club_id", profile.club_id).order("club_points", { ascending: false }),
        ]);
        const clubName = clubRes.data?.name || null;
        const allMembers = rankRes.data || [];
        const myIndex = allMembers.findIndex((m: any) => m.club_points !== undefined);
        // Find user's rank by looking through sorted list
        let clubRank: number | null = null;
        const { data: myClubEntry } = await admin.from("user_clubs").select("club_points").eq("club_id", profile.club_id).eq("user_id", userId).single();
        if (myClubEntry && allMembers.length > 0) {
          clubRank = allMembers.findIndex((m: any) => m.club_points <= (myClubEntry.club_points || 0)) + 1;
          if (clubRank === 0) clubRank = allMembers.length;
        }
        return { clubName, clubRank, clubTotalPlayers: allMembers.length };
      })()
    : Promise.resolve({ clubName: null, clubRank: null, clubTotalPlayers: null });

  // 3. Badges
  const badgesPromise = admin
    .from("challenge_badges")
    .select("badge_name, badge_emoji")
    .eq("user_id", userId);

  // 4. Official partner
  const partnerPromise = (async () => {
    const { data: partnerships } = await admin
      .from("player_partnerships")
      .select("player_id, partner_id")
      .or(`player_id.eq.${userId},partner_id.eq.${userId}`)
      .eq("status", "accepted")
      .limit(1);
    if (!partnerships || partnerships.length === 0) return null;
    const partnerId = partnerships[0].player_id === userId ? partnerships[0].partner_id : partnerships[0].player_id;
    const { data: partnerProfile } = await admin.from("profiles").select("first_name, display_name").eq("id", partnerId).single();
    return partnerProfile?.first_name || partnerProfile?.display_name?.split(/\s+/)[0] || null;
  })();

  // 5. Level evolution (from match_participants level_after)
  const evolutionPromise = (async () => {
    const { data } = await admin
      .from("match_participants")
      .select("level_after, match_id")
      .eq("user_id", userId)
      .eq("player_type", "user")
      .not("level_after", "is", null)
      .order("match_id", { ascending: false })
      .limit(10);
    if (!data || data.length === 0) return [];
    // We don't have played_at here, but we return in order
    return data.reverse().map((d: any, i: number) => ({
      level: d.level_after,
      date: `match-${i + 1}`,
    }));
  })();

  // 6. All participations for match stats
  const { data: participations, error: partError } = await admin
    .from("match_participants")
    .select("match_id, team")
    .eq("user_id", userId)
    .eq("player_type", "user");

  if (partError) {
    logger.error("[coach/player-context] Participations query error", { error: partError.message, userId });
  }
  logger.info("[coach/player-context] Participations loaded", { count: participations?.length || 0 });

  if (!participations || participations.length === 0) {
    const [clubData, badgesData, officialPartner, levelEvolution] = await Promise.all([
      clubPromise, badgesPromise, partnerPromise, evolutionPromise,
    ]);
    return {
      ...baseContext,
      ...EMPTY_CONTEXT,
      clubName: clubData.clubName,
      clubRank: clubData.clubRank,
      clubTotalPlayers: clubData.clubTotalPlayers,
      badges: (badgesData.data || []).map((b: any) => `${b.badge_emoji} ${b.badge_name}`),
      officialPartner,
      levelEvolution,
    };
  }

  const matchIds = participations.map((p) => p.match_id);
  const teamByMatch = new Map(participations.map((p) => [p.match_id, p.team]));

  const { data: matches, error: matchError } = await admin
    .from("matches")
    .select("id, winner_team_id, team1_id, team2_id, score_team1, score_team2, played_at")
    .in("id", matchIds)
    .eq("status", "confirmed")
    .order("played_at", { ascending: false });

  if (matchError) {
    logger.error("[coach/player-context] Matches query error", { error: matchError.message });
  }
  logger.info("[coach/player-context] Confirmed matches loaded", { count: matches?.length || 0 });

  if (!matches || matches.length === 0) {
    const [clubData, badgesData, officialPartner, levelEvolution] = await Promise.all([
      clubPromise, badgesPromise, partnerPromise, evolutionPromise,
    ]);
    return {
      ...baseContext,
      ...EMPTY_CONTEXT,
      clubName: clubData.clubName,
      clubRank: clubData.clubRank,
      clubTotalPlayers: clubData.clubTotalPlayers,
      badges: (badgesData.data || []).map((b: any) => `${b.badge_emoji} ${b.badge_name}`),
      officialPartner,
      levelEvolution,
    };
  }

  // 7. Get ALL participants for these matches (for partner/adversary analysis)
  const { data: allParticipants } = await admin
    .from("match_participants")
    .select("match_id, user_id, team, player_type")
    .in("match_id", matchIds)
    .eq("player_type", "user");

  // Build profiles lookup for all participants
  const allUserIds = [...new Set((allParticipants || []).map((p) => p.user_id))];
  const { data: allProfiles } = await admin
    .from("profiles")
    .select("id, first_name, display_name")
    .in("id", allUserIds);

  const nameMap = new Map(
    (allProfiles || []).map((p: any) => [
      p.id,
      p.first_name || (p.display_name ? p.display_name.split(/\s+/)[0] : "Joueur"),
    ])
  );

  // 8. Compute win/loss, streaks, recent matches with names
  let wins = 0;
  let losses = 0;
  let currentStreak = 0;
  let bestStreak = 0;
  let streakBroken = false;
  const recentMatches: string[] = [];

  // Partner/adversary tracking
  const partnerMap = new Map<string, { wins: number; total: number }>();
  const adversaryMap = new Map<string, { wins: number; total: number }>();

  // Monthly activity
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  let matchesThisMonth = 0;
  let matchesLastMonth = 0;

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

    // Monthly activity
    const playedAt = new Date(m.played_at);
    if (playedAt >= thisMonthStart) matchesThisMonth++;
    else if (playedAt >= lastMonthStart) matchesLastMonth++;

    // Partner & adversary analysis
    const matchParticipants = (allParticipants || []).filter((p) => p.match_id === m.id);
    const teammates = matchParticipants.filter((p) => p.team === team && p.user_id !== userId);
    const opponents = matchParticipants.filter((p) => p.team !== team);

    for (const t of teammates) {
      const existing = partnerMap.get(t.user_id) || { wins: 0, total: 0 };
      existing.total++;
      if (isWin) existing.wins++;
      partnerMap.set(t.user_id, existing);
    }

    for (const o of opponents) {
      const existing = adversaryMap.get(o.user_id) || { wins: 0, total: 0 };
      existing.total++;
      if (isWin) existing.wins++;
      adversaryMap.set(o.user_id, existing);
    }

    // Recent matches with names
    if (recentMatches.length < 5) {
      const score = team === 1
        ? `${m.score_team1}-${m.score_team2}`
        : `${m.score_team2}-${m.score_team1}`;
      const partnerNames = teammates.map((t) => nameMap.get(t.user_id) || "?").join("/");
      const opponentNames = opponents.map((o) => nameMap.get(o.user_id) || "?").join("/");
      const detail = partnerNames
        ? `${isWin ? "V" : "D"} ${score} (avec ${partnerNames} vs ${opponentNames})`
        : `${isWin ? "V" : "D"} ${score} (vs ${opponentNames})`;
      recentMatches.push(detail);
    }
  }

  // Best streak
  let tempStreak = 0;
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    const team = teamByMatch.get(m.id);
    const teamId = team === 1 ? m.team1_id : m.team2_id;
    if (m.winner_team_id === teamId) {
      tempStreak++;
      if (tempStreak > bestStreak) bestStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  }

  // Top 3 partners (by matches together, min 2)
  const topPartners: PartnerStats[] = [...partnerMap.entries()]
    .filter(([, stats]) => stats.total >= 2)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 3)
    .map(([id, stats]) => ({
      name: nameMap.get(id) || "Joueur",
      matchesTogether: stats.total,
      winsTogether: stats.wins,
      winrate: Math.round((stats.wins / stats.total) * 100),
    }));

  // Top 3 hardest adversaries (lowest winrate, min 2 matches)
  const hardestAdversaries: AdversaryStats[] = [...adversaryMap.entries()]
    .filter(([, stats]) => stats.total >= 2)
    .sort((a, b) => (a[1].wins / a[1].total) - (b[1].wins / b[1].total))
    .slice(0, 3)
    .map(([id, stats]) => ({
      name: nameMap.get(id) || "Joueur",
      matchesAgainst: stats.total,
      winsAgainst: stats.wins,
      winrate: Math.round((stats.wins / stats.total) * 100),
    }));

  const totalMatches = wins + losses;
  const winrate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

  // Await parallel data
  const [clubData, badgesData, officialPartner, levelEvolution] = await Promise.all([
    clubPromise, badgesPromise, partnerPromise, evolutionPromise,
  ]);

  const context: PlayerContext = {
    ...baseContext,
    totalMatches,
    wins,
    losses,
    winrate,
    currentStreak,
    bestStreak,
    recentMatches,
    clubName: clubData.clubName,
    clubRank: clubData.clubRank,
    clubTotalPlayers: clubData.clubTotalPlayers,
    topPartners,
    hardestAdversaries,
    levelEvolution,
    matchesThisMonth,
    matchesLastMonth,
    officialPartner,
    badges: (badgesData.data || []).map((b: any) => `${b.badge_emoji} ${b.badge_name}`),
  };

  logger.info("[coach/player-context] Full context built", {
    firstName: context.firstName,
    level: context.level,
    totalMatches: context.totalMatches,
    wins: context.wins,
    losses: context.losses,
    recentMatchesCount: context.recentMatches.length,
    topPartnersCount: context.topPartners.length,
    adversariesCount: context.hardestAdversaries.length,
    clubName: context.clubName,
    badges: context.badges.length,
  });

  return context;
}
