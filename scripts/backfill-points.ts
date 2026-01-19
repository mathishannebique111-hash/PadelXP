
import { createClient } from "@supabase/supabase-js";
import { calculatePointsWithBoosts } from "@/lib/utils/boost-points-utils";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

async function backfillPoints() {
    console.log("Starting points backfill...");

    // 1. Fetch all users
    const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, points, club_id");

    if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        return;
    }

    console.log(`Found ${profiles.length} profiles.`);

    for (const profile of profiles) {
        const userId = profile.id;

        // 2. Fetch all confirmed matches for this user
        const { data: participants, error: mpError } = await supabase
            .from("match_participants")
            .select("match_id, team, player_type")
            .eq("user_id", userId)
            .eq("player_type", "user");

        if (mpError) {
            console.error(`Error fetching participants for ${userId}:`, mpError);
            continue;
        }

        if (!participants || participants.length === 0) {
            console.log(`User ${userId}: No matches.`);
            // Reset points to 0 (or challenge points)
            // await updatePoints(userId, profile.club_id, 0); // Optional: reset if no matches?
            continue;
        }

        const matchIds = participants.map((p) => p.match_id);

        const { data: matches, error: matchesError } = await supabase
            .from("matches")
            .select("id, winner_team_id, team1_id, team2_id, status")
            .in("id", matchIds)
            .eq("status", "confirmed");

        if (matchesError) {
            console.error(`Error fetching matches for ${userId}:`, matchesError);
            continue;
        }

        const matchesMap = new Map(matches?.map((m) => [m.id, m]));

        // Calculate points
        let wins = 0;
        let losses = 0;
        const winMatches = new Set<string>();
        const validMatchIds: string[] = [];

        participants.forEach((p) => {
            const match = matchesMap.get(p.match_id);
            if (!match) return; // Skip unconfirmed or non-existent matches

            // Logic to determine winner
            const winnerTeamId = match.winner_team_id;
            let isWinner = false;
            if (winnerTeamId === match.team1_id && p.team === 1) isWinner = true;
            else if (winnerTeamId === match.team2_id && p.team === 2) isWinner = true;

            if (isWinner) {
                wins++;
                winMatches.add(match.id);
            } else {
                losses++;
            }
            validMatchIds.push(match.id);
        });

        // Challenge points (base)
        // IMPORTANT: profiles.points acts as manual/challenge points base in the App
        // But here we want to update global_points and club_points which represent TOTAL.
        // So we assume global_points = match_points + challenge_points?
        // Based on confirm logic: global_points = global_points + NEW_MATCH_POINTS.
        // So global_points should accumulate everything.
        // However, recreating it means we need: calculated_match_points + (challenge points if they are separate).
        // If profiles.points is challenge points, we use it.

        const challengePoints = typeof profile.points === "number" ? profile.points : 0;

        // Calculate TOTAL MATCH POINTS using the utility
        // We pass 0 as challengePoints to get ONLY the match points contribution?
        // Or we pass challengePoints to get the Grand Total?
        // calculatePointsWithBoosts returns Base + Boost + Bonus + Challenge.

        // Let's get the Grand Total
        const totalPoints = await calculatePointsWithBoosts(
            wins,
            losses,
            validMatchIds,
            winMatches,
            userId,
            0, // Bonus (reviews) - ignored for now or should check?
            0 // We calculate match-only points first
        );

        // Review bonus check (logic from PlayerSummary)
        let reviewsBonus = 0;
        const { data: myReviews } = await supabase.from("reviews").select("rating, comment").eq("user_id", userId);
        if (myReviews && myReviews.length > 0) {
            // Simple check from utils (imports might be tricky in script, reusing basic logic)
            const hasValid = myReviews.some(r => r.rating > 3 || (r.rating <= 3 && (r.comment?.split(/\s+/).length || 0) > 6));
            if (hasValid) reviewsBonus = 10;
        }

        const grandTotal = totalPoints + reviewsBonus + challengePoints;

        console.log(`User ${userId}: Wins=${wins}, Losses=${losses}, MatchPts=${totalPoints}, Challenge=${challengePoints}, Bonus=${reviewsBonus} => Total=${grandTotal}`);

        // Update profiles.global_points
        await supabase.from("profiles").update({ global_points: grandTotal }).eq("id", userId);

        // Update user_clubs.club_points (only for primary club)
        if (profile.club_id) {
            // Upsert user_clubs? Or Update?
            // Check if exists
            const { data: uc } = await supabase.from("user_clubs").select("*").eq("user_id", userId).eq("club_id", profile.club_id).maybeSingle();
            if (uc) {
                await supabase.from("user_clubs").update({ club_points: grandTotal }).eq("id", uc.id);
                console.log(`Updated user_clubs for ${userId} (Club ${profile.club_id})`);
            } else {
                // Create if missing?
                await supabase.from("user_clubs").insert({
                    user_id: userId,
                    club_id: profile.club_id,
                    role: 'principal',
                    club_points: grandTotal
                });
                console.log(`Created user_clubs for ${userId} (Club ${profile.club_id})`);
            }
        }
    }

    console.log("Backfill complete.");
}

backfillPoints();
