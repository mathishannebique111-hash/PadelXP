import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = "club-challenges";

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

type ChallengeRecord = {
  id: string;
  club_id: string;
  title: string;
  start_date: string;
  end_date: string;
  objective: string;
  reward_type: "points" | "badge";
  reward_label: string;
  created_at: string;
};

type ChallengeResponse = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  objective: string;
  rewardType: "points" | "badge";
  rewardLabel: string;
  createdAt: string;
  status: "upcoming" | "active" | "completed";
  progress: { current: number; target: number };
  rewardClaimed: boolean;
};

function computeStatus(record: ChallengeRecord): "upcoming" | "active" | "completed" {
  const now = new Date();
  const start = new Date(record.start_date);
  const end = new Date(record.end_date);
  if (now < start) return "upcoming";
  if (now > end) return "completed";
  return "active";
}

async function resolveClubId(userId: string) {
  if (!supabaseAdmin) return null;
  
  // Essayer via le profil (pour les joueurs)
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("club_id")
    .eq("id", userId)
    .maybeSingle();
  
  if (profile?.club_id) {
    return profile.club_id;
  }
  
  console.warn("[api/player/challenges] resolveClubId: aucun club trouvé pour userId", userId);
  return null;
}

async function loadChallenges(clubId: string): Promise<ChallengeRecord[]> {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin.storage.from(BUCKET_NAME).download(`${clubId}.json`);
  if (error || !data) {
    if (error && !error.message?.toLowerCase().includes("not found")) {
      console.warn("[api/player/challenges] load error", error);
    }
    return [];
  }
  try {
    const text = await data.text();
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed as ChallengeRecord[];
    }
  } catch (err) {
    console.warn("[api/player/challenges] invalid JSON", err);
  }
  return [];
}

function extractTarget(objective: string): number {
  const match = objective.match(/(\d+)/);
  if (!match) return 1;
  const value = parseInt(match[1], 10);
  if (!Number.isFinite(value) || value <= 0) return 1;
  return value;
}

function isWinObjective(objective: string) {
  const lower = objective.toLowerCase();
  return /(remporter|gagner|victoire|victoires|remporte|gagne|gagné|remporté|win|wins|won)/.test(lower);
}

type MatchHistoryItem = {
  matchId: string;
  playedAt: string | null;
  isWinner: boolean;
};

async function loadPlayerHistory(userId: string): Promise<MatchHistoryItem[]> {
  if (!supabaseAdmin) return [];
  
  console.log(`[loadPlayerHistory] Fetching matches for userId: ${userId}`);
  
  // ÉTAPE 1: Récupérer les match_ids du joueur (EXACTEMENT comme dans la page historique)
  const { data: userParticipations, error: partError } = await supabaseAdmin
    .from("match_participants")
    .select("match_id, team")
    .eq("user_id", userId)
    .eq("player_type", "user");

  console.log(`[loadPlayerHistory] User participations:`, userParticipations?.length || 0, "Error:", partError);

  if (partError || !userParticipations || userParticipations.length === 0) {
    console.warn(`[loadPlayerHistory] ⚠️ NO PARTICIPATIONS found for user ${userId}`);
    return [];
  }

  const matchIds = userParticipations.map((p) => p.match_id);
  const teamMap = new Map(userParticipations.map((p) => [p.match_id, p.team]));
  console.log(`[loadPlayerHistory] Found ${matchIds.length} match IDs for user`);

  // ÉTAPE 2: Récupérer les détails des matchs
  const { data: matches, error: matchError } = await supabaseAdmin
    .from("matches")
    .select("id, played_at, winner_team_id, team1_id, team2_id, score_team1, score_team2")
    .in("id", matchIds)
    .order("played_at", { ascending: true });

  console.log(`[loadPlayerHistory] Matches fetched:`, matches?.length || 0, "Error:", matchError);

  if (matchError || !matches) {
    console.warn(`[loadPlayerHistory] ⚠️ Error fetching matches:`, matchError);
    return [];
  }

  console.log(`[loadPlayerHistory] ✅ Found ${matches.length} matches for user ${userId}`);

  return matches.map((match) => {
    const team = teamMap.get(match.id) || null;
    const teamNum = typeof team === "number" ? team : team ? Number(team) : null;
    
    let isWinner = false;
    if (match.winner_team_id && teamNum) {
      const participantTeamId = teamNum === 1 ? match.team1_id : match.team2_id;
      isWinner = match.winner_team_id === participantTeamId;
    } else if (teamNum && match.score_team1 != null && match.score_team2 != null && match.score_team1 !== match.score_team2) {
      isWinner = teamNum === 1 ? match.score_team1 > match.score_team2 : match.score_team2 > match.score_team1;
    }

    console.log(`[loadPlayerHistory] Match ${match.id.substring(0, 8)}: team=${teamNum}, isWinner=${isWinner}, playedAt=${match.played_at}`);

    return {
      matchId: match.id,
      playedAt: match.played_at ?? null,
      isWinner,
    };
  });
}

function computeProgress(record: ChallengeRecord, history: MatchHistoryItem[]): { current: number; target: number } {
  const target = Math.max(1, extractTarget(record.objective));
  const metricIsWin = isWinObjective(record.objective);
  
  // Convertir les dates en objets Date et normaliser au début/fin de journée en UTC
  const start = new Date(record.start_date);
  const end = new Date(record.end_date);
  
  // Normaliser au début de la journée (00:00:00) en UTC pour start
  start.setUTCHours(0, 0, 0, 0);
  
  // Normaliser à la fin de la journée (23:59:59) en UTC pour end
  end.setUTCHours(23, 59, 59, 999);

  console.log(`[Challenge ${record.id}] Computing progress:`, {
    objective: record.objective,
    target,
    metricIsWin,
    period: { 
      start: start.toISOString(), 
      end: end.toISOString(),
      startLocal: start.toString(),
      endLocal: end.toString()
    },
    totalMatches: history.length
  });

  const relevant = history.filter((item) => {
    if (!item.playedAt) {
      console.log(`  ❌ Match ${item.matchId.substring(0, 8)} excluded: no playedAt`);
      return false;
    }
    const played = new Date(item.playedAt);
    if (Number.isNaN(played.getTime())) {
      console.log(`  ❌ Match ${item.matchId.substring(0, 8)} excluded: invalid date`);
      return false;
    }
    const inPeriod = played >= start && played <= end;
    console.log(`  ${inPeriod ? '✅' : '❌'} Match ${item.matchId.substring(0, 8)}: played=${played.toISOString()} (${played.toString()}), isWinner=${item.isWinner}, inPeriod=${inPeriod}`);
    return inPeriod;
  });

  const current = metricIsWin
    ? relevant.filter((item) => item.isWinner).length
    : relevant.length;

  console.log(`[Challenge ${record.id}] Result: ${current}/${target} (${relevant.length} relevant matches, ${metricIsWin ? 'counting wins only' : 'counting all'})`);

  return {
    current: Math.min(current, target),
    target,
  };
}

export async function GET(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Serveur mal configuré" }, { status: 500 });
  }

  const supabase = createClient({ headers: Object.fromEntries(request.headers) });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const clubId = await resolveClubId(user.id);
  if (!clubId) {
    return NextResponse.json({ challenges: [] });
  }

  const records = await loadChallenges(clubId);
  console.log(`[Player ${user.id}] Loaded ${records.length} challenges for club ${clubId}`);
  if (records.length > 0) {
    console.log(`[Player ${user.id}] Challenges:`, records.map(r => ({
      id: r.id.substring(0, 8),
      title: r.title,
      start_date: r.start_date,
      end_date: r.end_date,
      objective: r.objective
    })));
  }
  
  if (records.length === 0) {
    return NextResponse.json({ challenges: [] });
  }

  console.log(`[api/player/challenges] About to load player history for user ${user.id}`);
  const history = await loadPlayerHistory(user.id);
  console.log(`[api/player/challenges] Player ${user.id} - Loaded ${history.length} matches from history`);
  
  if (history.length > 0) {
    console.log(`[api/player/challenges] Recent matches:`, history.slice(-5).map(h => ({
      matchId: h.matchId.substring(0, 8),
      playedAt: h.playedAt,
      isWinner: h.isWinner
    })));
  } else {
    console.warn(`[api/player/challenges] ⚠️ NO MATCHES FOUND for user ${user.id} - this will cause progress to be 0`);
  }

  // Récupérer les récompenses déjà réclamées
  let claimedSet = new Set<string>();
  try {
    const { data: claimedRewards, error: rewardsError } = await supabaseAdmin!
      .from("challenge_rewards")
      .select("challenge_id")
      .eq("user_id", user.id);
    
    if (rewardsError) {
      console.warn("[api/player/challenges] ⚠️ Could not fetch rewards (table may not exist yet):", rewardsError.message);
    } else {
      claimedSet = new Set(claimedRewards?.map(r => r.challenge_id) || []);
    }
  } catch (err) {
    console.warn("[api/player/challenges] ⚠️ Exception fetching rewards:", err);
  }

  const challenges: ChallengeResponse[] = records
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .map((record) => {
      const progress = computeProgress(record, history);
      return {
        id: record.id,
        title: record.title,
        startDate: record.start_date,
        endDate: record.end_date,
        objective: record.objective,
        rewardType: record.reward_type,
        rewardLabel: record.reward_label,
        createdAt: record.created_at,
        status: computeStatus(record),
        progress,
        rewardClaimed: claimedSet.has(record.id),
      };
    });

  return NextResponse.json({ challenges });
}
