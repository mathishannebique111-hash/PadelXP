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

export default async function ChallengesContent() {
    const requestHeaders = headers();
    const cookieStore = cookies();
    const cookieHeader = cookieStore
        .getAll()
        .map(({ name, value }) => `${name}=${value}`)
        .join("; ");
    const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
    const host = requestHeaders.get("host");

    if (!host) {
        return (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 font-normal">
                <p>Erreur de chargement des challenges.</p>
            </div>
        );
    }

    const timestamp = Date.now();
    const response = await fetch(`${protocol}://${host}/api/player/challenges?t=${timestamp}`, {
        headers: {
            ...(cookieHeader ? { cookie: cookieHeader } : {}),
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
        },
        credentials: "include",
        cache: "no-store",
        next: { revalidate: 0 },
    }).catch((error) => {
        logger.error("[ChallengesContent] fetch error", error);
        return null;
    });

    if (!response) {
        return (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 font-normal">
                <p>Impossible de charger les challenges.</p>
            </div>
        );
    }

    let challenges: PlayerChallenge[] = [];
    let responseStatus = response.status;
    if (responseStatus === 200) {
        try {
            const raw = await response.text();
            if (raw && raw.trim().length > 0) {
                const payload = JSON.parse(raw);
                challenges = Array.isArray(payload?.challenges) ? payload.challenges : [];
            }
        } catch (error) {
            logger.error("[ChallengesContent] parse error", error);
        }
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fallback: charger depuis Supabase Storage
    if (challenges.length === 0 && user) {
        try {
            const { data: profile } = await supabaseAdmin
                .from("profiles")
                .select("club_id, club_slug")
                .eq("id", user.id)
                .maybeSingle();

            let clubId: string | null = profile?.club_id || null;

            if (!clubId && profile?.club_slug) {
                const { data: clubBySlug } = await supabaseAdmin
                    .from("clubs")
                    .select("id")
                    .eq("slug", profile.club_slug)
                    .maybeSingle();
                if (clubBySlug?.id) {
                    clubId = clubBySlug.id;
                }
            }

            if (clubId) {
                const BUCKET_NAME = "club-challenges";
                const { data: challengeFile, error: storageError } = await supabaseAdmin
                    .storage
                    .from(BUCKET_NAME)
                    .download(`${clubId}.json`);

                if (!storageError && challengeFile) {
                    try {
                        const text = await challengeFile.text();
                        if (text && text.trim().length > 0) {
                            const parsed = JSON.parse(text);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                const now = new Date();
                                challenges = parsed.map((record: any) => {
                                    const start = new Date(record.start_date);
                                    const end = new Date(record.end_date);
                                    let status: "active" | "upcoming" | "completed" = "active";
                                    if (now < start) status = "upcoming";
                                    else if (now > end) status = "completed";

                                    const target = Math.max(1, extractTarget(record.objective));
                                    return {
                                        id: record.id,
                                        title: record.title,
                                        startDate: record.start_date,
                                        endDate: record.end_date,
                                        objective: record.objective,
                                        rewardType: record.reward_type,
                                        rewardLabel: record.reward_label,
                                        status,
                                        progress: { current: 0, target },
                                        rewardClaimed: false,
                                    };
                                });
                            }
                        }
                    } catch (parseError) {
                        logger.error("[ChallengesContent] Error parsing challenge file", parseError);
                    }
                }
            }
        } catch (fallbackError) {
            logger.error("[ChallengesContent] Error in fallback loading", fallbackError);
        }
    }

    let challengePoints = 0;
    let challengeBadgesCount = 0;

    if (user) {
        const { data: userProfile } = await supabase
            .from("profiles")
            .select("points")
            .eq("id", user.id)
            .maybeSingle();

        challengePoints = typeof userProfile?.points === 'number'
            ? userProfile.points
            : (typeof userProfile?.points === 'string' ? parseInt(userProfile.points, 10) || 0 : 0);

        const { data: challengeBadges } = await supabaseAdmin
            .from("challenge_badges")
            .select("id")
            .eq("user_id", user.id);

        challengeBadgesCount = challengeBadges?.length || 0;
    }

    return (
        <div className="space-y-6">
            {(challengePoints > 0 || challengeBadgesCount > 0) && (
                <div className="flex justify-center">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 border border-white/20">
                        <span className="text-sm font-semibold text-white">
                            <span className="text-yellow-300 tabular-nums">{challengePoints}</span>
                            <span className="ml-1">point{challengePoints > 1 ? "s" : ""} et </span>
                            <span className="text-yellow-300 tabular-nums">{challengeBadgesCount}</span>
                            <span className="ml-1">badge{challengeBadgesCount > 1 ? "s" : ""} débloqué{challengeBadgesCount > 1 ? "s" : ""}</span>
                        </span>
                    </div>
                </div>
            )}

            <ChallengesList challenges={challenges} />
        </div>
    );
}
