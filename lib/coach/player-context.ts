import { createClient } from "@supabase/supabase-js";
import { type PlayerContext } from "./system-prompt";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function tierForPoints(points: number): string {
  if (points >= 500) return "Champion";
  if (points >= 300) return "Diamant";
  if (points >= 200) return "Or";
  if (points >= 100) return "Argent";
  return "Bronze";
}

/**
 * Charge le contexte complet d'un joueur pour injection dans le system prompt.
 * Utilise le service role pour bypasser RLS.
 */
export async function loadPlayerContext(userId: string): Promise<PlayerContext> {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Profil
  const { data: profile } = await admin
    .from("profiles")
    .select("first_name, display_name, niveau_padel, global_points")
    .eq("id", userId)
    .single();

  const firstName =
    profile?.first_name ||
    (profile?.display_name ? profile.display_name.split(/\s+/)[0] : "Joueur");
  const level = profile?.niveau_padel ?? 4.0;
  const globalPoints = profile?.global_points ?? 0;

  // 2. Stats depuis match_participants + matches
  const { data: participations } = await admin
    .from("match_participants")
    .select("match_id, team")
    .eq("user_id", userId)
    .eq("player_type", "user");

  if (!participations || participations.length === 0) {
    return {
      firstName,
      level,
      tier: tierForPoints(globalPoints),
      totalMatches: 0,
      wins: 0,
      losses: 0,
      winrate: 0,
      currentStreak: 0,
      bestStreak: 0,
      globalPoints,
      recentMatches: [],
    };
  }

  const matchIds = participations.map((p) => p.match_id);
  const teamByMatch = new Map(participations.map((p) => [p.match_id, p.team]));

  const { data: matches } = await admin
    .from("matches")
    .select("id, winner_team_id, team1_id, team2_id, score_team1, score_team2, played_at")
    .in("id", matchIds)
    .eq("status", "confirmed")
    .order("played_at", { ascending: false });

  if (!matches || matches.length === 0) {
    return {
      firstName,
      level,
      tier: tierForPoints(globalPoints),
      totalMatches: 0,
      wins: 0,
      losses: 0,
      winrate: 0,
      currentStreak: 0,
      bestStreak: 0,
      globalPoints,
      recentMatches: [],
    };
  }

  let wins = 0;
  let losses = 0;
  let currentStreak = 0;
  let bestStreak = 0;
  let streakBroken = false;
  const recentMatches: string[] = [];

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

    // Best streak (parcours complet)
    // On recalcule en parcourant du plus ancien au plus récent
    if (recentMatches.length < 5) {
      const score = team === 1
        ? `${m.score_team1}-${m.score_team2}`
        : `${m.score_team2}-${m.score_team1}`;
      recentMatches.push(`${isWin ? "V" : "D"} ${score}`);
    }
  }

  // Calculer best streak (du plus ancien au plus récent)
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

  const totalMatches = wins + losses;
  const winrate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

  return {
    firstName,
    level,
    tier: tierForPoints(globalPoints),
    totalMatches,
    wins,
    losses,
    winrate,
    currentStreak,
    bestStreak,
    globalPoints,
    recentMatches,
  };
}
