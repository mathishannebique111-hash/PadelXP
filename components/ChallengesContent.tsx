import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import ChallengesList from "@/components/challenges/ChallengesList";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from '@/lib/logger';

interface PlayerChallenge {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    objective: string;
    rewardType: "points" | "badge";
    rewardLabel: string;
    status: "active" | "upcoming" | "completed";
    progress: {
        current: number;
        target: number;
    };
    rewardClaimed: boolean;
    scope: 'global' | 'club';
}

const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

function extractTarget(objective: string): number {
    const match = objective.match(/(\d+)/);
    if (!match) return 1;
    const value = parseInt(match[1], 10);
    if (!Number.isFinite(value) || value <= 0) return 1;
    return value;
}

export default async function ChallengesContent({
    userId,
    clubId: providedClubId
}: {
    userId?: string;
    clubId?: string | null;
}) {
    const requestHeaders = await headers();
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
        .getAll()
        .map(({ name, value }) => `${name}=${value}`)
        .join("; ");
    const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
    const host = requestHeaders.get("host");

    if (!host) {
        return (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 font-normal">
                <p>Erreur de l'hôte.</p>
            </div>
        );
    }

    const timestamp = Date.now();
    const supabase = await createClient();

    // 1. Démarrer les requêtes indépendantes en parallèle
    const [response, userResult, playerStatsResult] = await Promise.all([
        fetch(`${protocol}://${host}/api/player/challenges?t=${timestamp}`, {
            headers: {
                ...(cookieHeader ? { cookie: cookieHeader } : {}),
                "Cache-Control": "no-cache, no-store, must-revalidate",
            },
            credentials: "include",
            cache: "no-store",
            next: { revalidate: 0 },
        }).catch(() => null),
        userId ? Promise.resolve({ data: { user: { id: userId } } }) : supabase.auth.getUser(),
        supabase
            .from("profiles")
            .select("points, is_premium, club_id")
            .eq("id", userId || "dummy")
            .maybeSingle()
    ]);

    const user = userId ? { id: userId } : userResult?.data?.user;
    const userProfile = playerStatsResult?.data;
    const isPremium = userProfile?.is_premium || false;
    const challengePoints = typeof userProfile?.points === 'number'
        ? userProfile.points
        : (typeof userProfile?.points === 'string' ? parseInt(userProfile.points, 10) || 0 : 0);

    let challenges: PlayerChallenge[] = [];
    if (response?.status === 200) {
        try {
            const payload = await response.json();
            challenges = Array.isArray(payload?.challenges) ? payload.challenges : [];
        } catch (e) { }
    }

    // 2. Fetch badges et clubId si nécessaire en parallèle
    const [badgesResult, clubCheckResult] = await Promise.all([
        user ? supabaseAdmin.from("challenge_badges").select("id").eq("user_id", user.id) : Promise.resolve({ data: null }),
        (providedClubId || userProfile?.club_id)
            ? Promise.resolve({ data: { club_id: providedClubId || userProfile?.club_id } })
            : (user ? supabaseAdmin.from("profiles").select("club_id").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }))
    ]);

    const challengeBadgesCount = badgesResult?.data?.length || 0;
    const clubId = providedClubId || userProfile?.club_id || clubCheckResult?.data?.club_id;
    const hasClub = !!clubId;

    // Fallback Storage si challenges vides
    if (challenges.length === 0 && clubId) {
        try {
            const BUCKET_NAME = "club-challenges";
            const { data: challengeFile } = await supabaseAdmin.storage.from(BUCKET_NAME).download(`${clubId}.json`);
            if (challengeFile) {
                const text = await challengeFile.text();
                const parsed = JSON.parse(text);
                const now = new Date();
                challenges = parsed.map((record: any) => {
                    const start = new Date(record.start_date);
                    const end = new Date(record.end_date);
                    let status: "active" | "upcoming" | "completed" = "active";
                    if (now < start) status = "upcoming";
                    else if (now > end) status = "completed";
                    return {
                        id: record.id,
                        title: record.title,
                        startDate: record.start_date,
                        endDate: record.end_date,
                        objective: record.objective,
                        rewardType: record.reward_type,
                        rewardLabel: record.reward_label,
                        status,
                        progress: { current: 0, target: Math.max(1, extractTarget(record.objective)) },
                        rewardClaimed: false,
                        scope: 'club'
                    } as PlayerChallenge;
                });
            }
        } catch (e) { }
    }

    return (
        <div className="space-y-6">
            {(challengePoints > 0 || challengeBadgesCount > 0) && (
                <div className="flex justify-center">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 border border-white/20">
                        <span className="text-sm font-semibold text-white">
                            <span className="text-padel-green tabular-nums">{challengePoints}</span>
                            <span className="ml-1">point{challengePoints > 1 ? "s" : ""} et </span>
                            <span className="text-padel-green tabular-nums">{challengeBadgesCount}</span>
                            <span className="ml-1">badge{challengeBadgesCount > 1 ? "s" : ""} débloqué{challengeBadgesCount > 1 ? "s" : ""}</span>
                        </span>
                    </div>
                </div>
            )}
            <ChallengesList challenges={challenges} isPremiumUser={isPremium} hasClub={hasClub} />
        </div>
    );
}
