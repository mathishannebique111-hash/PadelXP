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

        if (error) {
            logger.error("Error updating profile:", error);
            throw error;
        }

        // VERIFICATION: Read back the value
        const { data: check } = await supabaseAdmin
            .from("profiles")
            .select("is_premium")
            .eq("id", user.id)
            .single();

        logger.info(`[activatePremium] VERIFICATION for ${user.id}: is_premium is now ${check?.is_premium}`);

        if (!check?.is_premium) {
            logger.error(`[activatePremium] CRITICAL: Update appeared successful but read-back returned false!`);
            return { success: true, verified: false, warning: "DB Update not persisted immediately" };
        }

        logger.info(`[activatePremium] Successfully updated is_premium to true for user ${user.id}`);

        revalidatePath("/home");
        revalidatePath("/challenges");
        revalidatePath("/badges");
        revalidatePath("/dashboard");
        return { success: true, verified: true };
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

        const emptyStats = {
            evolution: [],
            topVictims: [],
            topNemesis: [],
            topPartners: [],
            insights: {
                luckyDay: { name: "-", winrate: 0 },
                bestMonth: { name: "-", winrate: 0 },
                goldenHour: { name: "-", winrate: 0 },
                currentForm: 0,
                reaction: { opportunities: 0, success: 0, rate: 0 },
                levelPerformance: {
                    stronger: { label: "Plus Forts", wins: 0, total: 0 },
                    weaker: { label: "Plus Faibles", wins: 0, total: 0 },
                    equal: { label: "Niveau Équivalent", wins: 0, total: 0 }
                }
            }
        };

        if (!participations || participations.length === 0) return emptyStats;

        const matchIds = participations.map(p => p.match_id);

        const { data: matches } = await supabaseAdmin
            .from("matches")
            .select("id, played_at, created_at, winner_team_id, team1_id, team2_id, score_team1, score_team2")
            .in("id", matchIds)
            .eq("status", "confirmed")
            .order("played_at", { ascending: true }); // Chronological order

        if (!matches || matches.length === 0) return emptyStats;

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
            .select("id, first_name, last_name, display_name, avatar_url, niveau_padel")
            .in("id", Array.from(allPlayerIds));

        const profileMap = new Map(profiles?.map(p => [p.id, p]));

        // --- CALCULATION LOGIC ---

        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("niveau_padel")
            .eq("id", user.id)
            .single();

        const currentLevel = profile?.niveau_padel || 1;

        // 1. Evolution History (Restored logic)
        let calculatedLevel = currentLevel;
        const evolution: { date: string; points: number; level: number }[] = [];
        const matchesSorted = matches.sort((a, b) => new Date(a.played_at || a.created_at).getTime() - new Date(b.played_at || b.created_at).getTime());
        const reversedMatches = [...matchesSorted].reverse();
        const tempHistory: { date: string; points: number; level: number }[] = [];

        tempHistory.push({
            date: new Date().toISOString(),
            points: 0,
            level: calculatedLevel
        });

        for (const match of reversedMatches) {
            const myPart = allMatchParticipants.find(p => p.match_id === match.id && p.user_id === user.id);
            if (!myPart) continue;

            const myTeam = myPart.team;
            const winningTeam = match.winner_team_id === match.team1_id ? 1 : 2;
            const isWin = myTeam === winningTeam;

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
        evolution.push(...tempHistory.reverse());

        // 2. Maps & Counts
        const partnersMap = new Map<string, { wins: number, total: number }>();
        const opponentsMap = new Map<string, { wins: number, total: number }>();
        const monthStats = new Map<string, { wins: number, total: number }>();

        // NEW: Temporal Analysis (Time of Day)
        const timeOfDayStats = {
            morning: { label: "Matin (<12h)", wins: 0, total: 0 },
            lunch: { label: "Midi (12h-14h)", wins: 0, total: 0 },
            afternoon: { label: "Après-midi (14h-18h)", wins: 0, total: 0 },
            evening: { label: "Soir (>18h)", wins: 0, total: 0 }
        };

        // NEW: Performances vs Level
        const levelStats = {
            stronger: { label: "Plus Forts", wins: 0, total: 0 },
            weaker: { label: "Plus Faibles", wins: 0, total: 0 },
            equal: { label: "Niveau Équivalent", wins: 0, total: 0 }
        };

        // NEW: Reaction Capacity (Lost 1st set but won match)
        let comebackOpportunities = 0;
        let comebacksWon = 0;

        for (const match of matchesSorted) {
            const myPart = allMatchParticipants.find(p => p.match_id === match.id && p.user_id === user.id);
            if (!myPart) continue;

            const myTeam = myPart.team;
            const opponentTeam = myTeam === 1 ? 2 : 1;
            const winningTeam = match.winner_team_id === match.team1_id ? 1 : 2;
            const isWin = myTeam === winningTeam;

            // Update Month Stats
            const date = new Date(match.played_at || match.created_at);
            const key = date.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
            const mStats = monthStats.get(key) || { wins: 0, total: 0 };
            mStats.total++;
            if (isWin) mStats.wins++;
            monthStats.set(key, mStats);

            // Time of Day Analysis
            const hour = date.getHours();
            let timeSlot: keyof typeof timeOfDayStats;
            if (hour < 12) timeSlot = 'morning';
            else if (hour < 14) timeSlot = 'lunch';
            else if (hour < 18) timeSlot = 'afternoon';
            else timeSlot = 'evening';

            timeOfDayStats[timeSlot].total++;
            if (isWin) timeOfDayStats[timeSlot].wins++;

            // Reaction Capacity Analysis (Parsing Score)
            const scoreStr = match.score_team1 || match.score_team2;

            if (typeof scoreStr === 'string' && (scoreStr.includes('-') || scoreStr.includes(' '))) {
                const sets = scoreStr.split(/[\s/]+/).filter(s => s.trim().length > 0 && s.includes('-'));

                // Check if user won match
                if (winningTeam === myTeam) {
                    if (sets.length >= 2) {
                        // We won. Did we lose first set?
                        const firstSet = sets[0];
                        const [s1, s2] = firstSet.split('-').map(Number);

                        if (!isNaN(s1) && !isNaN(s2)) {
                            // Assuming standard format "6-4" means Team 1 (6) - Team 2 (4)
                            const mySetScore = myTeam === 1 ? s1 : s2;
                            const oppSetScore = myTeam === 1 ? s2 : s1;

                            if (mySetScore < oppSetScore) {
                                comebackOpportunities++;
                                comebacksWon++;
                            }
                        }
                    }
                } else {
                    // I lost match. Did I lose first set?
                    if (sets.length >= 2) {
                        const firstSet = sets[0];
                        const [s1, s2] = firstSet.split('-').map(Number);

                        if (!isNaN(s1) && !isNaN(s2)) {
                            const mySetScore = myTeam === 1 ? s1 : s2;
                            const oppSetScore = myTeam === 1 ? s2 : s1;

                            if (mySetScore < oppSetScore) {
                                comebackOpportunities++;
                            }
                        }
                    }
                }
            }

            // Performance vs Level Analysis
            // Calculate average opponent level
            const matchParts = allMatchParticipants.filter(p => p.match_id === match.id);
            const opponents = matchParts.filter(p => p.team !== myTeam && p.player_type === 'user');

            if (opponents.length > 0) {
                let totalOpponentLevel = 0;
                let opponentCount = 0;

                opponents.forEach(op => {
                    const prof = profileMap.get(op.user_id);
                    if (prof && (prof.niveau_padel || prof.niveau_padel === 0)) {
                        totalOpponentLevel += Number(prof.niveau_padel);
                        opponentCount++;
                    }
                });

                if (opponentCount > 0) {
                    const avgOpponentLevel = totalOpponentLevel / opponentCount;

                    // Find level in evolution closest to match date
                    const matchTime = new Date(match.played_at || match.created_at).getTime();
                    const histoEntry = evolution.find(e => new Date(e.date).getTime() >= matchTime);
                    const myLevelAtMatch = histoEntry ? histoEntry.level : currentLevel;

                    const diff = avgOpponentLevel - myLevelAtMatch;

                    // logger.info(`[PremiumStats] Match ${match.id}: AvgOpp=${avgOpponentLevel}, MyLevel=${myLevelAtMatch}, Diff=${diff}`);

                    if (diff > 0.5) {
                        levelStats.stronger.total++;
                        if (isWin) levelStats.stronger.wins++;
                    } else if (diff < -0.5) {
                        levelStats.weaker.total++;
                        if (isWin) levelStats.weaker.wins++;
                    } else {
                        levelStats.equal.total++;
                        if (isWin) levelStats.equal.wins++;
                    }
                }
            }

            // Partners & Opponents Maps
            matchParts.forEach(p => {
                if (p.user_id === user.id) return;
                if (p.team === myTeam) {
                    const stats = partnersMap.get(p.user_id) || { wins: 0, total: 0 };
                    stats.total++;
                    if (isWin) stats.wins++;
                    partnersMap.set(p.user_id, stats);
                } else {
                    const stats = opponentsMap.get(p.user_id) || { wins: 0, total: 0 };
                    stats.total++;
                    if (isWin) stats.wins++;
                    opponentsMap.set(p.user_id, stats);
                }
            });
        }

        // --- FORMATTING RESULTS ---

        const formatList = (map: Map<string, { wins: number, total: number }>, type: 'partner' | 'victim' | 'nemesis') => {
            return Array.from(map.entries())
                .map(([id, stats]) => {
                    const profile = profileMap.get(id);
                    let count = 0;
                    if (type === 'partner') count = stats.total;
                    if (type === 'victim') count = stats.wins;
                    if (type === 'nemesis') count = stats.total - stats.wins;

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
                .slice(0, 5);
        };

        const topPartners = formatList(partnersMap, 'partner');
        const topVictims = formatList(opponentsMap, 'victim');
        const topNemesis = formatList(opponentsMap, 'nemesis');

        // Best Month
        let bestMonth = { name: "-", winrate: 0 };
        monthStats.forEach((stats, name) => {
            if (stats.total >= 2) {
                const wr = (stats.wins / stats.total) * 100;
                if (wr > bestMonth.winrate) {
                    // Capitalize first letter
                    const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
                    bestMonth = { name: capitalized, winrate: Math.round(wr) };
                }
            }
        });

        // Lucky Day
        const dayStats = new Map<number, { wins: number, total: number }>();
        matchesSorted.forEach(match => {
            const date = new Date(match.played_at || match.created_at);
            const day = date.getDay();
            const stats = dayStats.get(day) || { wins: 0, total: 0 };

            const myPart = allMatchParticipants.find(p => p.match_id === match.id && p.user_id === user.id);
            if (myPart) {
                stats.total++;
                const isWin = (match.winner_team_id === match.team1_id ? 1 : 2) === myPart.team;
                if (isWin) stats.wins++;
                dayStats.set(day, stats);
            }
        });

        let luckyDay = { name: "-", winrate: 0 };
        const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
        dayStats.forEach((stats, dayIndex) => {
            if (stats.total >= 2) {
                const wr = (stats.wins / stats.total) * 100;
                if (wr >= luckyDay.winrate) luckyDay = { name: days[dayIndex], winrate: Math.round(wr) };
            }
        });

        // Best Time of Day (Golden Hour)
        let goldenHour = { name: "-", winrate: 0 };
        Object.values(timeOfDayStats).forEach(slot => {
            if (slot.total >= 3) { // Min 3 matches for significance
                const wr = (slot.wins / slot.total) * 100;
                if (wr >= goldenHour.winrate) {
                    goldenHour = { name: slot.label, winrate: Math.round(wr) };
                }
            }
        });

        // Current Form
        const last5 = matchesSorted.slice(-5);
        let recentWins = 0;
        last5.forEach(m => {
            const myPart = allMatchParticipants.find(p => p.match_id === m.id && p.user_id === user.id);
            if (!myPart) return;
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
                luckyDay,
                goldenHour,
                bestMonth,
                currentForm,
                reaction: {
                    opportunities: comebackOpportunities,
                    success: comebacksWon,
                    rate: comebackOpportunities > 0 ? Math.round((comebacksWon / comebackOpportunities) * 100) : 0
                },
                levelPerformance: levelStats
            }
        };

    } catch (error) {
        logger.error("Error fetching premium stats:", error);
        return null;
    }
}
