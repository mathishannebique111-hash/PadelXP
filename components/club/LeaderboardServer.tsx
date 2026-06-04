import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { calculatePlayerLeaderboard } from "@/lib/utils/player-leaderboard-utils";
import { calculateGeoLeaderboard } from "@/lib/utils/geo-leaderboard-utils";
import { canSeeSeasons } from "@/lib/feature-flags";
import { getCountryFromRegion } from "@/lib/utils/geo-leaderboard-utils";
import LeaderboardContent from "@/components/LeaderboardContent";

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

interface LeaderboardServerProps {
    userId: string;
    clubId: string | null;
}

export default async function LeaderboardServer({ userId, clubId }: LeaderboardServerProps) {
    // Check if user can see seasons
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const showSeasons = canSeeSeasons(user?.email);

    // Determine user's country
    let userCountry: "FR" | "BE" = "FR";
    if (showSeasons) {
        const { data: userProfile } = await supabaseAdmin
            .from("profiles")
            .select("region_code")
            .eq("id", userId)
            .maybeSingle();
        userCountry = getCountryFromRegion(userProfile?.region_code || null);
    }

    // Fetch season data (active, or most recent completed, or upcoming)
    let activeSeason = null;
    let completedSeason = null;
    let upcomingSeason = null;
    let seasonDateRange: { start: string; end: string } | undefined;
    let completedSeasonResults: any[] = [];

    if (showSeasons) {
        // Helper to find a season: try club-specific first, then global
        async function findSeason(status: string, order: { col: string; asc: boolean }) {
            if (clubId) {
                const { data: clubSeason } = await supabaseAdmin
                    .from("seasons")
                    .select("*, season_rewards(*)")
                    .eq("status", status)
                    .eq("club_id", clubId)
                    .order(order.col, { ascending: order.asc })
                    .limit(1)
                    .maybeSingle();
                if (clubSeason) return clubSeason;
            }
            const { data: globalSeason } = await supabaseAdmin
                .from("seasons")
                .select("*, season_rewards(*)")
                .eq("status", status)
                .is("club_id", null)
                .order(order.col, { ascending: order.asc })
                .limit(1)
                .maybeSingle();
            return globalSeason;
        }

        // 1. Check for active season
        const active = await findSeason("active", { col: "start_date", asc: false });

        if (active) {
            activeSeason = active;
            seasonDateRange = { start: active.start_date, end: active.end_date };
        } else {
            // 2. Check for most recent completed season
            const completed = await findSeason("completed", { col: "end_date", asc: false });

            // 3. Check for upcoming season
            const upcoming = await findSeason("upcoming", { col: "start_date", asc: true });

            if (upcoming) {
                upcomingSeason = upcoming;
            }

            if (completed) {
                const endedAt = new Date(completed.end_date + 'T23:59:59').getTime();
                const hoursSinceEnd = (Date.now() - endedAt) / (1000 * 60 * 60);
                const showCompleted = hoursSinceEnd < 24 || !upcomingSeason;

                if (showCompleted) {
                    completedSeason = completed;
                    const { data: results } = await supabaseAdmin
                        .from("season_results")
                        .select("*, profiles:user_id(first_name, last_name, display_name, avatar_url)")
                        .eq("season_id", completed.id)
                        .order("final_rank")
                        .limit(10);
                    completedSeasonResults = results || [];

                    const userInResults = completedSeasonResults.some((r: any) => r.user_id === userId);
                    if (!userInResults) {
                        const { data: userResult } = await supabaseAdmin
                            .from("season_results")
                            .select("*, profiles:user_id(first_name, last_name, display_name, avatar_url)")
                            .eq("season_id", completed.id)
                            .eq("user_id", userId)
                            .maybeSingle();
                        if (userResult) completedSeasonResults.push(userResult);
                    }
                }
            }
        }
    }

    // Récupérer le leaderboard approprié (Club ou Département)
    const leaderboardRaw = clubId
        ? await calculatePlayerLeaderboard(clubId, seasonDateRange)
        : await calculateGeoLeaderboard(userId, "department");

    const leaderboard = leaderboardRaw.map((player, index) => ({
        ...player,
        rank: index + 1,
    }));

    // Récupérer les profils pour les noms
    const profilesFirstNameMap: Record<string, string> = {};
    const profilesLastNameMap: Record<string, string> = {};

    if (leaderboard.length > 0) {
        const userIds = leaderboard.filter(p => !p.isGuest).map(p => p.user_id);
        if (userIds.length > 0) {
            const { data: profiles } = await supabaseAdmin
                .from("profiles")
                .select("id, first_name, last_name")
                .in("id", userIds);

            if (profiles) {
                profiles.forEach(p => {
                    if (p.first_name) profilesFirstNameMap[p.id] = p.first_name;
                    if (p.last_name) profilesLastNameMap[p.id] = p.last_name;
                });
            }
        }
    }

    return (
        <LeaderboardContent
            initialLeaderboard={leaderboard}
            initialProfilesFirstNameMap={profilesFirstNameMap}
            initialProfilesLastNameMap={profilesLastNameMap}
            currentUserId={userId}
            userClubId={clubId}
            activeSeason={activeSeason}
            completedSeason={completedSeason}
            completedSeasonResults={completedSeasonResults}
            upcomingSeason={upcomingSeason}
            userCountry={userCountry}
        />
    );
}
