import { createClient as createServiceClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = "club-challenges";
const CHALLENGES_BUCKET_NAME = "challenges";
const GLOBAL_CHALLENGES_KEY = "__global__/challenges.json";

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
    ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
    })
    : null;

export interface ChallengeRecord {
    id: string;
    club_id: string;
    title: string;
    start_date: string;
    end_date: string;
    objective: string;
    reward_type: "points" | "badge";
    reward_label: string;
    created_at: string;
    scope?: 'global' | 'club';
    isPremium?: boolean;
}

export interface ChallengeResponse {
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
    scope: 'global' | 'club';
    isPremium?: boolean;
}

export interface MatchHistoryItem {
    matchId: string;
    playedAt: string | null;
    isWinner: boolean;
    partnerId?: string | null;
    locationClubId?: string | null;
    myScore?: number;
    opponentScore?: number;
}

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

    const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("club_id, club_slug")
        .eq("id", userId)
        .maybeSingle();

    if (profile?.club_id) return profile.club_id;

    if (profile?.club_slug) {
        const { data: clubBySlug } = await supabaseAdmin
            .from("clubs")
            .select("id")
            .eq("slug", profile.club_slug)
            .maybeSingle();
        if (clubBySlug?.id) return clubBySlug.id;
    }

    return null;
}

async function loadClubChallenges(clubId: string): Promise<ChallengeRecord[]> {
    if (!supabaseAdmin) return [];
    const { data, error } = await supabaseAdmin.storage.from(BUCKET_NAME).download(`${clubId}.json`);
    if (error || !data) return [];
    try {
        const text = await data.text();
        if (!text || text.trim().length === 0) return [];
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
            return parsed.map((record: any) => ({ ...record, scope: 'club' }));
        }
    } catch (err) {
        logger.warn("[challenges-util] invalid Club JSON", { clubId, error: err });
    }
    return [];
}

async function loadGlobalChallenges(): Promise<ChallengeRecord[]> {
    if (!supabaseAdmin) return [];
    const { data, error } = await supabaseAdmin.storage.from(CHALLENGES_BUCKET_NAME).download(GLOBAL_CHALLENGES_KEY);
    if (error || !data) return [];
    try {
        const text = await data.text();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
            return parsed.map((record: any) => ({
                id: record.id,
                club_id: "global",
                title: record.title || record.name,
                start_date: record.start_date,
                end_date: record.end_date,
                objective: record.objective,
                reward_type: record.reward_type || "points",
                reward_label: record.reward_label || record.reward || "",
                created_at: record.created_at,
                scope: 'global',
                isPremium: !!record.is_premium
            }));
        }
    } catch (e) {
        logger.error("[challenges-util] Error parsing global challenges", e);
    }
    return [];
}

function extractTarget(objective: string): number {
    const match = objective.match(/(\d+)/);
    if (!match) return 1;
    const value = parseInt(match[1], 10);
    return Number.isFinite(value) && value > 0 ? value : 1;
}

function isWinObjective(objective: string) {
    const lower = objective.toLowerCase();
    return /(remporter|gagner|victoire|victoires|remporte|gagne|gagné|remporté|win|wins|won)/.test(lower);
}

function isDifferentPartnersObjective(objective: string) {
    const lower = objective.toLowerCase();
    return /(partenaire|partenaires|coéquipier|coéquipiers|joueur|joueurs).*(différent|différents|différente|différentes|divers|variés)/.test(lower) ||
        /(différent|différents|différente|différentes|divers|variés).*(partenaire|partenaires|coéquipier|coéquipiers|joueur|joueurs)/.test(lower);
}

function isConsecutiveWinsObjective(objective: string) {
    const lower = objective.toLowerCase();
    return /(consécutif|consécutifs|consécutivement|consecutive|consecutives|sans.*défaite|sans.*défaites|d'affilée|de suite|enchaîner|enchaîné|enchaînés)/.test(lower);
}

function isCleanSheetObjective(objective: string) {
    const lower = objective.toLowerCase();
    return /(sans perdre de set|sans concéder de set|sans que l'adversaire.*prenne.*set|2-0|3-0|4-0|clean sheet)/.test(lower);
}

function isWeekendObjective(objective: string) {
    const lower = objective.toLowerCase();
    return /(week-end|weekend|samedi|dimanche)/.test(lower);
}

function isThreeSetsObjective(objective: string) {
    const lower = objective.toLowerCase();
    return /(3 sets|trois sets|match long|long match)/.test(lower);
}

function extractBeforeHour(objective: string): number | null {
    const match = objective.toLowerCase().match(/(?:avant|jusqu'à|jusqu'a)\s*(\d{1,2})\s*heures?/i);
    if (match) {
        const hour = parseInt(match[1], 10);
        if (hour >= 0 && hour <= 23) return hour;
    }
    return null;
}

function extractAfterHour(objective: string): number | null {
    const match = objective.toLowerCase().match(/(?:après|a partir de|à partir de)\s*(\d{1,2})\s*heures?/i);
    if (match) {
        const hour = parseInt(match[1], 10);
        if (hour >= 0 && hour <= 23) return hour;
    }
    return null;
}

async function loadPlayerHistory(userId: string): Promise<MatchHistoryItem[]> {
    if (!supabaseAdmin) return [];

    const { data: userParticipations, error: partError } = await supabaseAdmin
        .from("match_participants")
        .select("match_id, team")
        .eq("user_id", userId)
        .eq("player_type", "user");

    if (partError || !userParticipations || userParticipations.length === 0) return [];

    const matchIds = userParticipations.map((p) => p.match_id);
    const teamMap = new Map(userParticipations.map((p) => [p.match_id, p.team]));

    const { data: matches, error: matchError } = await supabaseAdmin
        .from("matches")
        .select("id, played_at, winner_team_id, team1_id, team2_id, score_team1, score_team2, created_at, location_club_id")
        .in("id", matchIds)
        .eq("status", "confirmed")
        .order("played_at", { ascending: true });

    if (matchError || !matches) return [];

    const { data: allParticipants } = await supabaseAdmin
        .from("match_participants")
        .select("match_id, user_id, team, player_type")
        .in("match_id", matchIds);

    const partnerMap = new Map<string, string | null>();
    if (allParticipants) {
        allParticipants.forEach((p: any) => {
            const userTeam = teamMap.get(p.match_id);
            if (p.user_id !== userId && p.team === userTeam && p.player_type === "user") {
                partnerMap.set(p.match_id, p.user_id);
            }
        });
    }

    return matches.map((match) => {
        const teamNum = teamMap.get(match.id) ? Number(teamMap.get(match.id)) : null;
        let isWinner = false;
        if (match.winner_team_id && teamNum) {
            const participantTeamId = teamNum === 1 ? match.team1_id : match.team2_id;
            isWinner = match.winner_team_id === participantTeamId;
        } else if (teamNum && match.score_team1 != null && match.score_team2 != null) {
            isWinner = teamNum === 1 ? match.score_team1 > match.score_team2 : match.score_team2 > match.score_team1;
        }
        return {
            matchId: match.id,
            playedAt: match.played_at ?? match.created_at ?? null,
            isWinner,
            partnerId: partnerMap.get(match.id) || null,
            locationClubId: match.location_club_id,
            myScore: teamNum === 1 ? Number(match.score_team1) : Number(match.score_team2),
            opponentScore: teamNum === 1 ? Number(match.score_team2) : Number(match.score_team1),
        };
    });
}

function computeProgress(record: ChallengeRecord, history: MatchHistoryItem[]): { current: number; target: number } {
    const target = Math.max(1, extractTarget(record.objective));
    const metricIsWin = isWinObjective(record.objective);
    const isDifferentPartners = isDifferentPartnersObjective(record.objective);
    const isConsecutiveWins = isConsecutiveWinsObjective(record.objective);

    const start = new Date(record.start_date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(record.end_date);
    end.setUTCHours(23, 59, 59, 999);

    const relevant = history.filter((item) => {
        if (!item.playedAt) return false;
        const isGlobal = record.scope === 'global' || record.club_id === 'global';
        if (!isGlobal && record.club_id && item.locationClubId !== record.club_id) return false;
        const played = new Date(item.playedAt);
        return played >= start && played <= end;
    });

    const sortedRelevant = [...relevant].sort((a, b) => new Date(a.playedAt!).getTime() - new Date(b.playedAt!).getTime());
    let current = 0;

    if (isConsecutiveWins && metricIsWin) {
        let currentStreak = 0;
        for (const item of sortedRelevant) {
            if (item.isWinner) currentStreak++;
            else currentStreak = 0;
        }
        current = currentStreak;
    } else if (isDifferentPartners) {
        const uniquePartners = new Set<string>();
        sortedRelevant.forEach((item) => {
            if (item.partnerId && (!metricIsWin || item.isWinner)) uniquePartners.add(item.partnerId);
        });
        current = uniquePartners.size;
    } else if (isCleanSheetObjective(record.objective)) {
        current = sortedRelevant.filter((item) => item.isWinner && item.opponentScore === 0).length;
    } else if (isWeekendObjective(record.objective)) {
        const weekendMatches = sortedRelevant.filter((item) => {
            const day = new Date(item.playedAt!).getDay();
            return day === 0 || day === 6;
        });
        current = metricIsWin ? weekendMatches.filter(m => m.isWinner).length : weekendMatches.length;
    } else if (extractBeforeHour(record.objective) !== null) {
        const targetHour = extractBeforeHour(record.objective)!;
        const matches = sortedRelevant.filter(m => new Date(m.playedAt!).getHours() < targetHour);
        current = metricIsWin ? matches.filter(m => m.isWinner).length : matches.length;
    } else if (extractAfterHour(record.objective) !== null) {
        const targetHour = extractAfterHour(record.objective)!;
        const matches = sortedRelevant.filter(m => new Date(m.playedAt!).getHours() >= targetHour);
        current = metricIsWin ? matches.filter(m => m.isWinner).length : matches.length;
    } else if (isThreeSetsObjective(record.objective)) {
        const matches = sortedRelevant.filter(m => (m.myScore! + m.opponentScore!) === 3);
        current = metricIsWin ? matches.filter(m => m.isWinner).length : matches.length;
    } else {
        current = metricIsWin ? sortedRelevant.filter(m => m.isWinner).length : sortedRelevant.length;
    }

    return { current: Math.min(current, target), target };
}

export async function getPlayerChallenges(userId: string): Promise<{ challenges: ChallengeResponse[], isPremiumUser: boolean }> {
    if (!supabaseAdmin) return { challenges: [], isPremiumUser: false };

    const clubId = await resolveClubId(userId);
    const [clubRecords, globalRecords] = await Promise.all([
        clubId ? loadClubChallenges(clubId) : Promise.resolve([]),
        loadGlobalChallenges()
    ]);

    const allRecords = [...clubRecords, ...globalRecords];
    if (allRecords.length === 0) return { challenges: [], isPremiumUser: false };

    const history = await loadPlayerHistory(userId);

    let claimedSet = new Set<string>();
    const { data: claimedRewards } = await supabaseAdmin.from("challenge_rewards").select("challenge_id").eq("user_id", userId);
    if (claimedRewards) claimedSet = new Set(claimedRewards.map(r => r.challenge_id));

    const profile = await supabaseAdmin.from("profiles").select("is_premium").eq("id", userId).maybeSingle();
    const isPremiumUser = profile.data?.is_premium || false;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const challenges: ChallengeResponse[] = allRecords
        .filter((record) => new Date(record.end_date) >= oneDayAgo)
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
            rewardClaimed: claimedSet.has(record.id),
            scope: record.scope || 'club',
            isPremium: record.isPremium
        }));

    return { challenges, isPremiumUser };
}
