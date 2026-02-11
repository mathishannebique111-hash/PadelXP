/**
 * Geo-based leaderboard utility
 * Replaces club-based leaderboard with department/region/national scope
 */
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { filterMatchesByDailyLimit } from "@/lib/utils/match-limit-utils";
import { MAX_MATCHES_PER_DAY } from "@/lib/match-constants";
import { calculatePointsForMultiplePlayers } from "@/lib/utils/boost-points-utils";
import { getPlayerDisplayName } from "@/lib/utils/player-utils";
import { isReviewValidForBonus } from "@/lib/utils/review-utils";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
    ? createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    })
    : null;

export type LeaderboardScope = "department" | "region" | "national";

export type GeoLeaderboardEntry = {
    rank: number;
    user_id: string;
    player_name: string;
    points: number;
    wins: number;
    losses: number;
    matches: number;
    badges: any[];
    isGuest: boolean;
    avatar_url: string | null;
    is_premium?: boolean;
};

/**
 * French department → region mapping
 * Départements are derived from postal_code (first 2 digits, or first 3 for DOM-TOM)
 */
const DEPARTMENT_TO_REGION: Record<string, string> = {
    // Île-de-France
    "75": "IDF", "77": "IDF", "78": "IDF", "91": "IDF", "92": "IDF", "93": "IDF", "94": "IDF", "95": "IDF",
    // Auvergne-Rhône-Alpes
    "01": "ARA", "03": "ARA", "07": "ARA", "15": "ARA", "26": "ARA", "38": "ARA", "42": "ARA", "43": "ARA", "63": "ARA", "69": "ARA", "73": "ARA", "74": "ARA",
    // Bourgogne-Franche-Comté
    "21": "BFC", "25": "BFC", "39": "BFC", "58": "BFC", "70": "BFC", "71": "BFC", "89": "BFC", "90": "BFC",
    // Bretagne
    "22": "BRE", "29": "BRE", "35": "BRE", "56": "BRE",
    // Centre-Val de Loire
    "18": "CVL", "28": "CVL", "36": "CVL", "37": "CVL", "41": "CVL", "45": "CVL",
    // Corse
    "2A": "COR", "2B": "COR", "20": "COR",
    // Grand Est
    "08": "GES", "10": "GES", "51": "GES", "52": "GES", "54": "GES", "55": "GES", "57": "GES", "67": "GES", "68": "GES", "88": "GES",
    // Hauts-de-France
    "02": "HDF", "59": "HDF", "60": "HDF", "62": "HDF", "80": "HDF",
    // Normandie
    "14": "NOR", "27": "NOR", "50": "NOR", "61": "NOR", "76": "NOR",
    // Nouvelle-Aquitaine
    "16": "NAQ", "17": "NAQ", "19": "NAQ", "23": "NAQ", "24": "NAQ", "33": "NAQ", "40": "NAQ", "47": "NAQ", "64": "NAQ", "79": "NAQ", "86": "NAQ", "87": "NAQ",
    // Occitanie
    "09": "OCC", "11": "OCC", "12": "OCC", "30": "OCC", "31": "OCC", "32": "OCC", "34": "OCC", "46": "OCC", "48": "OCC", "65": "OCC", "66": "OCC", "81": "OCC", "82": "OCC",
    // Pays de la Loire
    "44": "PDL", "49": "PDL", "53": "PDL", "72": "PDL", "85": "PDL",
    // Provence-Alpes-Côte d'Azur
    "04": "PAC", "05": "PAC", "06": "PAC", "13": "PAC", "83": "PAC", "84": "PAC",
    // DOM-TOM
    "971": "DOM", "972": "DOM", "973": "DOM", "974": "DOM", "976": "DOM",
};

export const REGION_LABELS: Record<string, string> = {
    "IDF": "Île-de-France",
    "ARA": "Auvergne-Rhône-Alpes",
    "BFC": "Bourgogne-Franche-Comté",
    "BRE": "Bretagne",
    "CVL": "Centre-Val de Loire",
    "COR": "Corse",
    "GES": "Grand Est",
    "HDF": "Hauts-de-France",
    "NOR": "Normandie",
    "NAQ": "Nouvelle-Aquitaine",
    "OCC": "Occitanie",
    "PDL": "Pays de la Loire",
    "PAC": "Provence-Alpes-Côte d'Azur",
    "DOM": "Outre-Mer",
};

/**
 * Derives department code from a French postal code
 */
export function getDepartmentFromPostalCode(postalCode: string): string | null {
    if (!postalCode || postalCode.length < 2) return null;
    const trimmed = postalCode.trim();
    // Corse: 20000-20999 → split into 2A/2B
    if (trimmed.startsWith("20")) {
        const num = parseInt(trimmed, 10);
        if (num >= 20000 && num <= 20190) return "2A"; // Corse-du-Sud
        if (num >= 20200 && num <= 20999) return "2B"; // Haute-Corse
        return "20"; // fallback
    }
    // DOM-TOM: 3 digit prefix
    if (trimmed.startsWith("97")) {
        return trimmed.substring(0, 3);
    }
    // Standard: first 2 digits
    return trimmed.substring(0, 2);
}

/**
 * Derives region code from department code
 */
export function getRegionFromDepartment(departmentCode: string): string | null {
    return DEPARTMENT_TO_REGION[departmentCode] || null;
}

/**
 * Calculates a geo-based leaderboard
 * @param userId - The requesting user's ID (to determine their geo scope)
 * @param scope - "department" | "region" | "national"
 */
export async function calculateGeoLeaderboard(
    userId: string,
    scope: LeaderboardScope
): Promise<GeoLeaderboardEntry[]> {
    if (!supabaseAdmin) {
        logger.warn("[calculateGeoLeaderboard] Supabase admin client not configured");
        return [];
    }

    logger.info("[calculateGeoLeaderboard] Starting", { userId: userId.substring(0, 8) + "…", scope });

    try {
        // 1. Get requesting user's geo info
        const { data: userProfile } = await supabaseAdmin
            .from("profiles")
            .select("department_code, region_code")
            .eq("id", userId)
            .maybeSingle();

        // 2. Build the profiles query based on scope
        let query = supabaseAdmin
            .from("profiles")
            .select("id, first_name, last_name, display_name, points, avatar_url, is_premium, department_code, region_code");

        if (scope === "department" && userProfile?.department_code) {
            query = query.eq("department_code", userProfile.department_code);
        } else if (scope === "region" && userProfile?.region_code) {
            query = query.eq("region_code", userProfile.region_code);
        }
        // "national" = no geo filter

        const { data: profiles, error: profilesError } = await query;

        if (profilesError || !profiles || profiles.length === 0) {
            if (profilesError) logger.error("[calculateGeoLeaderboard] Error fetching profiles", { error: profilesError.message });
            return [];
        }

        logger.info("[calculateGeoLeaderboard] Profiles found", { count: profiles.length, scope });

        // 3. Fetch all match_participants for these users
        const userIds = profiles.map(p => p.id);
        const { data: allParticipants, error: participantsError } = await supabaseAdmin
            .from("match_participants")
            .select("user_id, player_type, team, match_id")
            .in("user_id", userIds)
            .eq("player_type", "user");

        if (participantsError) {
            logger.error("[calculateGeoLeaderboard] Error fetching participants", { error: participantsError.message });
            return [];
        }

        // 4. Fetch all unique matches
        const uniqueMatchIds = [...new Set((allParticipants || []).map(p => p.match_id))];

        if (uniqueMatchIds.length === 0) {
            // No matches: return players with challenge points only
            const allPlayers = profiles.map(p => ({
                first_name: p.first_name || (p.display_name ? p.display_name.split(/\s+/)[0] : ""),
                last_name: p.last_name || (p.display_name ? p.display_name.split(/\s+/).slice(1).join(" ") : ""),
            }));

            return profiles.map((profile, index) => {
                const challengePoints = typeof profile.points === 'number' ? profile.points : (parseInt(profile.points, 10) || 0);
                const firstName = profile.first_name || (profile.display_name ? profile.display_name.split(/\s+/)[0] : "");
                const lastName = profile.last_name || (profile.display_name ? profile.display_name.split(/\s+/).slice(1).join(" ") : "");
                return {
                    rank: index + 1,
                    user_id: profile.id,
                    player_name: getPlayerDisplayName({ first_name: firstName, last_name: lastName }, allPlayers),
                    points: challengePoints,
                    wins: 0, losses: 0, matches: 0, badges: [], isGuest: false,
                    avatar_url: profile.avatar_url || null,
                    is_premium: profile.is_premium || false,
                };
            }).sort((a, b) => b.points - a.points).map((e, i) => ({ ...e, rank: i + 1 }));
        }

        const { data: allMatches, error: matchesError } = await supabaseAdmin
            .from("matches")
            .select("id, winner_team_id, team1_id, team2_id, played_at, created_at")
            .in("id", uniqueMatchIds)
            .eq("status", "confirmed");

        if (matchesError) {
            logger.error("[calculateGeoLeaderboard] Error fetching matches", { error: matchesError.message });
            return [];
        }

        const matchesMap = new Map<string, { winner_team_id: string; team1_id: string; team2_id: string; played_at: string }>();
        (allMatches || []).forEach(m => {
            if (m.winner_team_id && m.team1_id && m.team2_id) {
                matchesMap.set(m.id, {
                    winner_team_id: m.winner_team_id,
                    team1_id: m.team1_id,
                    team2_id: m.team2_id,
                    played_at: m.played_at || m.created_at || new Date().toISOString(),
                });
            }
        });

        // 5. Calculate stats per player
        const playersStats = new Map<string, { wins: number; losses: number; matches: number; winMatches: Set<string> }>();

        for (const profile of profiles) {
            const pid = profile.id;
            const playerParticipants = (allParticipants || []).filter(p => p.user_id === pid);

            if (playerParticipants.length === 0) {
                playersStats.set(pid, { wins: 0, losses: 0, matches: 0, winMatches: new Set() });
                continue;
            }

            const playerMatchIds = playerParticipants.map(p => p.match_id);
            const playerMatches = playerMatchIds
                .map(id => { const m = matchesMap.get(id); return m ? { id, ...m } : null; })
                .filter(Boolean) as Array<{ id: string; winner_team_id: string; team1_id: string; team2_id: string; played_at: string }>;

            const validMatchIdsForPoints = filterMatchesByDailyLimit(
                playerParticipants.map(p => ({ match_id: p.match_id, user_id: pid })),
                playerMatches.map(m => ({ id: m.id, played_at: m.played_at })),
                MAX_MATCHES_PER_DAY
            );

            const filteredParticipants = playerParticipants.filter(p =>
                validMatchIdsForPoints.has(p.match_id) && matchesMap.has(p.match_id)
            );

            let wins = 0, losses = 0, matches = 0;
            const winMatches = new Set<string>();
            filteredParticipants.forEach(p => {
                const match = matchesMap.get(p.match_id);
                if (!match) return;
                matches += 1;
                const winner_team = match.winner_team_id === match.team1_id ? 1 : 2;
                if (winner_team === p.team) { wins += 1; winMatches.add(p.match_id); }
                else { losses += 1; }
            });

            playersStats.set(pid, { wins, losses, matches, winMatches });
        }

        // 6. Review bonuses
        const bonusMap = new Map<string, number>();
        const { data: allReviews } = await supabaseAdmin
            .from("reviews")
            .select("user_id, rating, comment")
            .in("user_id", userIds);
        if (allReviews) {
            allReviews.forEach((r: any) => {
                if (isReviewValidForBonus(r.rating || 0, r.comment || null) && !bonusMap.has(r.user_id)) {
                    bonusMap.set(r.user_id, 10);
                }
            });
        }

        // 7. Calculate points with boosts
        const playersForBoost = Array.from(playersStats.entries()).map(([uid, stats]) => {
            const profile = profiles.find(p => p.id === uid);
            const challengePoints = profile && typeof profile.points === 'number'
                ? profile.points
                : (profile ? parseInt(profile.points, 10) || 0 : 0);
            return {
                userId: uid,
                wins: stats.wins,
                losses: stats.losses,
                winMatches: stats.winMatches,
                bonus: bonusMap.get(uid) || 0,
                challengePoints,
            };
        });
        const pointsWithBoosts = await calculatePointsForMultiplePlayers(playersForBoost);

        // 8. Build leaderboard
        const allPlayers = profiles.map(p => ({
            first_name: p.first_name || (p.display_name ? p.display_name.split(/\s+/)[0] : ""),
            last_name: p.last_name || (p.display_name ? p.display_name.split(/\s+/).slice(1).join(" ") : ""),
        }));

        const leaderboard: GeoLeaderboardEntry[] = profiles.map(profile => {
            const stats = playersStats.get(profile.id) || { wins: 0, losses: 0, matches: 0, winMatches: new Set() };
            const points = pointsWithBoosts.get(profile.id) || 0;
            const firstName = profile.first_name || (profile.display_name ? profile.display_name.split(/\s+/)[0] : "");
            const lastName = profile.last_name || (profile.display_name ? profile.display_name.split(/\s+/).slice(1).join(" ") : "");

            return {
                rank: 0,
                user_id: profile.id,
                player_name: getPlayerDisplayName({ first_name: firstName, last_name: lastName }, allPlayers),
                points,
                wins: stats.wins,
                losses: stats.losses,
                matches: stats.matches,
                badges: [],
                isGuest: false,
                avatar_url: profile.avatar_url || null,
                is_premium: profile.is_premium || false,
            };
        });

        const sorted = leaderboard
            .sort((a, b) => b.points !== a.points ? b.points - a.points : a.player_name.localeCompare(b.player_name))
            .map((entry, index) => ({ ...entry, rank: index + 1 }));

        logger.info("[calculateGeoLeaderboard] Done", { count: sorted.length, scope });
        return sorted;
    } catch (error) {
        logger.error("[calculateGeoLeaderboard] Unexpected error", { error: error instanceof Error ? error.message : String(error) });
        return [];
    }
}
