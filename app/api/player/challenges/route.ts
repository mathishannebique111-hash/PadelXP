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
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("club_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("[api/player/challenges] resolveClubId error", error);
    return null;
  }
  return data?.club_id ?? null;
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
  return /(remporter|gagner|victoire)/.test(lower);
}

type MatchHistoryItem = {
  matchId: string;
  playedAt: string | null;
  isWinner: boolean;
};

async function loadPlayerHistory(userId: string): Promise<MatchHistoryItem[]> {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from("match_participants")
    .select(`match_id, team, matches!inner(played_at, winner_team_id, team1_id, team2_id, score_team1, score_team2)`)
    .eq("player_type", "user")
    .eq("user_id", userId)
    .order("played_at", { referencedTable: "matches", ascending: true });

  if (error || !data) {
    if (error) {
      console.warn("[api/player/challenges] history error", error);
    }
    return [];
  }

  return (data as any[]).map((row) => {
    const matchId: string = row.match_id;
    const team: number | null = typeof row.team === "number" ? row.team : row.team ? Number(row.team) : null;
    const match = row.matches || {};
    const winnerTeamId: string | null = match.winner_team_id ?? null;
    const team1Id: string | null = match.team1_id ?? null;
    const team2Id: string | null = match.team2_id ?? null;
    const scoreTeam1 = match.score_team1 != null ? Number(match.score_team1) : null;
    const scoreTeam2 = match.score_team2 != null ? Number(match.score_team2) : null;

    let isWinner = false;
    if (winnerTeamId && team) {
      const participantTeamId = team === 1 ? team1Id : team2Id;
      if (participantTeamId) {
        isWinner = winnerTeamId === participantTeamId;
      }
    } else if (team && scoreTeam1 != null && scoreTeam2 != null && scoreTeam1 !== scoreTeam2) {
      isWinner = team === 1 ? scoreTeam1 > scoreTeam2 : scoreTeam2 > scoreTeam1;
    }

    return {
      matchId,
      playedAt: match.played_at ?? null,
      isWinner,
    };
  });
}

function computeProgress(record: ChallengeRecord, history: MatchHistoryItem[]): { current: number; target: number } {
  const target = Math.max(1, extractTarget(record.objective));
  const metricIsWin = isWinObjective(record.objective);
  const start = new Date(record.start_date);
  const end = new Date(record.end_date);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const relevant = history.filter((item) => {
    if (!item.playedAt) return false;
    const played = new Date(item.playedAt);
    if (Number.isNaN(played.getTime())) return false;
    return played >= start && played <= end;
  });

  const current = metricIsWin
    ? relevant.filter((item) => item.isWinner).length
    : relevant.length;

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
  if (records.length === 0) {
    return NextResponse.json({ challenges: [] });
  }

  const history = await loadPlayerHistory(user.id);

  const challenges: ChallengeResponse[] = records
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .map((record) => ({
      id: record.id,
      title: record.title,
      startDate: record.start_date,
      endDate: record.end_date,
      objective: record.objective,
      rewardType: record.reward_type,
      rewardLabel: record.reward_label,
      createdAt: record.created_at,
      status: computeStatus(record),
      progress: computeProgress(record, history),
    }));

  return NextResponse.json({ challenges });
}
