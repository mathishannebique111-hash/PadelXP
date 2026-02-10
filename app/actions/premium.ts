"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function activatePremium() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    try {
        const { error } = await supabaseAdmin
            .from("profiles")
            .update({ is_premium: true })
            .eq("id", user.id);

        if (error) throw error;

        revalidatePath("/home");
        return { success: true };
    } catch (error) {
        logger.error("Error activating premium:", error);
        return { success: false, error: "Failed to activate premium" };
    }
}

export async function getPremiumStatsData() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    try {
        // 1. Fetch all confirmed matches for the user
        const { data: participations } = await supabaseAdmin
            .from("match_participants")
            .select("match_id, team")
            .eq("user_id", user.id)
            .eq("player_type", "user");

        if (!participations || participations.length === 0) return { evolution: [], victims: [], nemesis: [], partners: [], insights: [] };

        const matchIds = participations.map(p => p.match_id);

        const { data: matches } = await supabaseAdmin
            .from("matches")
            .select("id, played_at, created_at, winner_team_id, team1_id, team2_id")
            .in("id", matchIds)
            .eq("status", "confirmed")
            .order("played_at", { ascending: true }); // Chronological order

        if (!matches) return { evolution: [], victims: [], nemesis: [], partners: [], insights: [] };

        // 2. Fetch all unique player profiles involved in these matches to display names/avatars
        const allPlayerIds = new Set<string>();

        const { data: allMatchParticipants } = await supabaseAdmin
            .from("match_participants")
            .select("match_id, user_id, team, player_type")
            .in("match_id", matchIds)
            .eq("player_type", "user"); // Only interested in real users for now

        if (!allMatchParticipants) return { evolution: [], victims: [], nemesis: [], partners: [], insights: [] };

        // Collect all user IDs to fetch profiles
        allMatchParticipants.forEach(p => allPlayerIds.add(p.user_id));
        allPlayerIds.delete(user.id); // Remove self

        const { data: profiles } = await supabaseAdmin
            .from("profiles")
            .select("id, first_name, last_name, display_name, avatar_url")
            .in("id", Array.from(allPlayerIds));

        const profileMap = new Map(profiles?.map(p => [p.id, p]));

        // --- CALCULATION LOGIC ---

        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("niveau_padel")
            .eq("id", user.id)
            .single();

        const currentLevel = profile?.niveau_padel || 1;

        // 1. Evolution History (Level over time)
        // Since we don't have historical level data, we will reconstruct it backwards from the current level
        // Assumed logic: +0.02 for a win, -0.01 for a loss (simplified simulation reversed)

        let calculatedLevel = currentLevel;
        const evolution: { date: string; points: number; level: number }[] = [];
        const matchesSorted = matches.sort((a, b) => new Date(a.played_at || a.created_at).getTime() - new Date(b.played_at || b.created_at).getTime());
        const reversedMatches = [...matchesSorted].reverse();

        // We build the history backwards
        const tempHistory: { date: string; points: number; level: number }[] = [];

        // Push current state
        tempHistory.push({
            date: new Date().toISOString(),
            points: 0, // Legacy field, might remove later
            level: calculatedLevel
        });

        for (const match of reversedMatches) {
            const myPart = allMatchParticipants.find(p => p.match_id === match.id && p.user_id === user.id);
            if (!myPart) continue;

            const myTeam = myPart.team;
            const winningTeam = match.winner_team_id === match.team1_id ? 1 : 2;
            const isWin = myTeam === winningTeam;

            // Reverse calculation: if I won today, it means yesterday I had LESS
            if (isWin) {
                calculatedLevel = Math.max(1, calculatedLevel - 0.05);
            } else {
                calculatedLevel = Math.min(10, calculatedLevel + 0.025);
            }

            tempHistory.push({
                date: match.played_at || match.created_at,
                points: 0,
                level: calculatedLevel
            });
        }

        // Reverse back to chronological order
        evolution.push(...tempHistory.reverse());

        // 2. Tops Lists Maps
        const partnersMap = new Map<string, { wins: number, total: number }>();
        const opponentsMap = new Map<string, { wins: number, total: number }>();

        let currentStreak = 0;
        let maxStreak = 0;

        // Best Month Calculation
        const monthStats = new Map<string, { wins: number, total: number }>();

        for (const match of matchesSorted) {
            // Determine user's team and result
            const myPart = allMatchParticipants.find(p => p.match_id === match.id && p.user_id === user.id);
            if (!myPart) continue;

            const myTeam = myPart.team;
            const winningTeam = match.winner_team_id === match.team1_id ? 1 : 2;
            const isWin = myTeam === winningTeam;

            // Update Streak
            if (isWin) {
                currentStreak++;
                if (currentStreak > maxStreak) maxStreak = currentStreak;
            } else {
                currentStreak = 0;
            }

            // Update Month Stats
            const date = new Date(match.played_at || match.created_at);
            const key = date.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
            const stats = monthStats.get(key) || { wins: 0, total: 0 };
            stats.total++;
            if (isWin) stats.wins++;
            monthStats.set(key, stats);

            // Analyze Partners and Opponents
            const matchParts = allMatchParticipants.filter(p => p.match_id === match.id);

            matchParts.forEach(p => {
                if (p.user_id === user.id) return; // Skip self

                if (p.team === myTeam) {
                    // It's a partner
                    const stats = partnersMap.get(p.user_id) || { wins: 0, total: 0 };
                    stats.total++;
                    if (isWin) stats.wins++;
                    partnersMap.set(p.user_id, stats);
                } else {
                    // It's an opponent
                    const stats = opponentsMap.get(p.user_id) || { wins: 0, total: 0 };
                    stats.total++;
                    if (isWin) stats.wins++; // I won against them
                    opponentsMap.set(p.user_id, stats);
                }
            });
        }

        // --- FORMATTING RESULTS ---

        // Helper to format list
        const formatList = (map: Map<string, { wins: number, total: number }>, type: 'partner' | 'victim' | 'nemesis') => {
            return Array.from(map.entries())
                .map(([id, stats]) => {
                    const profile = profileMap.get(id);
                    let count = 0;
                    if (type === 'partner') count = stats.total; // Most played with
                    if (type === 'victim') count = stats.wins; // Most wins against
                    if (type === 'nemesis') count = stats.total - stats.wins; // Most losses against

                    return {
                        id,
                        name: profile ? (profile.first_name || profile.display_name) : "Inconnu",
                        avatar_url: profile?.avatar_url,
                        count,
                        total: stats.total,
                        winrate: Math.round((stats.wins / stats.total) * 100)
                    };
                })
                .sort((a, b) => b.count - a.count)
                .slice(0, 5); // Top 5
        };

        const topPartners = formatList(partnersMap, 'partner');
        const topVictims = formatList(opponentsMap, 'victim');
        const topNemesis = formatList(opponentsMap, 'nemesis');

        // Best Month Result
        let bestMonth = { name: "-", winrate: 0 };
        monthStats.forEach((stats, name) => {
            if (stats.total >= 2) { // Minimum 2 matches to be significant
                const wr = (stats.wins / stats.total) * 100;
                if (wr > bestMonth.winrate) {
                    bestMonth = { name, winrate: Math.round(wr) };
                }
            }
        });

        // Current Form (Last 5)
        const last5 = matchesSorted.slice(-5);
        let recentWins = 0;
        last5.forEach(m => {
            const myPart = allMatchParticipants.find(p => p.match_id === m.id && p.user_id === user.id);
            if (!myPart) return; // Should not happen
            const isWin = (m.winner_team_id === m.team1_id ? 1 : 2) === myPart.team;
            if (isWin) recentWins++;
        });
        const currentForm = last5.length > 0 ? Math.round((recentWins / last5.length) * 100) : 0;

        return {
            evolution,
            topVictims,
            topNemesis,
            topPartners,
            insights: {
                maxStreak,
                bestMonth,
                currentForm
            }
        };

    } catch (error) {
        logger.error("Error fetching premium stats:", error);
        return null;
    }
}
