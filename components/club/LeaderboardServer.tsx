import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { calculatePlayerLeaderboard } from "@/lib/utils/player-leaderboard-utils";
import { calculateGeoLeaderboard } from "@/lib/utils/geo-leaderboard-utils";
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
    // Récupérer le leaderboard approprié (Club ou Département)
    const leaderboardRaw = clubId
        ? await calculatePlayerLeaderboard(clubId)
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
        />
    );
}
