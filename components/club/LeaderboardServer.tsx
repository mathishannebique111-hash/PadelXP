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
        // 1. Check for active season
        const { data: active } = await supabaseAdmin
            .from("seasons")
            .select("*, season_rewards(*)")
            .eq("status", "active")
            .order("start_date", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (active) {
            activeSeason = active;
            seasonDateRange = { start: active.start_date, end: active.end_date };
        } else {
            // 2. Check for most recent completed season
            const { data: completed } = await supabaseAdmin
                .from("seasons")
                .select("*, season_rewards(*)")
                .eq("status", "completed")
                .order("end_date", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (completed) {
                completedSeason = completed;
                // Fetch top 3 results for user's country
                const { data: results } = await supabaseAdmin
                    .from("season_results")
                    .select("*, profiles:user_id(first_name, last_name, display_name, avatar_url)")
                    .eq("season_id", completed.id)
                    .eq("country", userCountry)
                    .order("final_rank")
                    .limit(3);
                completedSeasonResults = results || [];
            }

            // 3. Check for upcoming season
            const { data: upcoming } = await supabaseAdmin
                .from("seasons")
                .select("*, season_rewards(*)")
                .eq("status", "upcoming")
                .order("start_date", { ascending: true })
                .limit(1)
                .maybeSingle();

            if (upcoming) {
                upcomingSeason = upcoming;
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
