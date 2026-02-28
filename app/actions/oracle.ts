"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { calculateWinProbability, calculateLevelDelta, simulateNewLevel } from "@/lib/utils/elo-utils";
import { getDepartmentFromPostalCode, getRegionFromDepartment, REGION_LABELS } from "@/lib/utils/geo-leaderboard-utils";

const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface PlayerInsight {
    userId: string;
    displayName: string;
    luckyDay: string | null; // e.g., "Mardi"
    goldenHour: string | null; // e.g., "18h-21h"
    strengths: string[];
    weaknesses: string[];
    form: number; // 0-100
}

export interface RankProgression {
    scope: "National" | "Régional" | "Départemental" | "Club";
    currentRank: number;
    newRankWin: number;
    newRankLoss: number;
    totalPlayers: number;
}

export interface OraclePredictionResult {
    team1: {
        players: any[];
        winProbability: number;
        avgLevel: number;
        synergy: { score: number; reason: string };
    };
    team2: {
        players: any[];
        winProbability: number;
        avgLevel: number;
        synergy: { score: number; reason: string };
    };
    playerStakes: {
        [userId: string]: {
            currentLevel: number;
            ifWin: { delta: number; newLevel: number; pointsDelta: number; ranks: RankProgression[] };
            ifLoss: { delta: number; newLevel: number; pointsDelta: number; ranks: RankProgression[] };
        };
    };
    playerInsights: PlayerInsight[];
    suggestedBalancedTeams?: string[];
    tacticalTarget?: {
        team1Target: { userId: string; reason: string } | null;
        team2Target: { userId: string; reason: string } | null;
    };
}

async function calculateSynergy(p1Id: string, p2Id: string): Promise<{ score: number; reason: string }> {
    const { data: p1Matches } = await supabaseAdmin.from("match_participants").select("match_id, team").eq("user_id", p1Id).limit(50);
    const { data: p2Matches } = await supabaseAdmin.from("match_participants").select("match_id, team").eq("user_id", p2Id).limit(50);

    if (!p1Matches || !p2Matches) return { score: 50, reason: "Données insuffisantes pour évaluer la synergie." };

    const p2Map = new Map(p2Matches.map(m => [m.match_id, m.team]));
    const commonIds = p1Matches.filter(m => p2Map.has(m.match_id) && p2Map.get(m.match_id) === m.team).map(m => m.match_id);

    if (commonIds.length < 3) return { score: 50, reason: "Peu de matchs joués ensemble (besoin de 3 matchs min)." };

    const { data: matches } = await supabaseAdmin.from("matches").select("id, winner_team_id, team1_id").in("id", commonIds).eq("status", "confirmed");
    if (!matches || matches.length === 0) return { score: 50, reason: "Analyse des duos en cours..." };

    let wins = 0;
    matches.forEach(m => {
        const team = p1Matches.find(p => p.match_id === m.id)!.team;
        const winnerTeam = m.winner_team_id === m.team1_id ? 1 : 2;
        if (team === winnerTeam) wins++;
    });

    const duoWinRate = wins / matches.length;
    const score = Math.round(20 + (duoWinRate * 70));

    let reason = "Basé sur votre historique commun.";
    if (score > 75) reason = `Excellente complicité (${Math.round(duoWinRate * 100)}% de victoires ensemble). Automatismes naturels détectés.`;
    else if (score > 55) reason = `Bonne entente sur le terrain. Duo équilibré avec un rythme de croisière positif.`;
    else if (score < 45) reason = `Duo peu habitué à jouer ensemble. Recherche de repères et de communication nécessaire.`;

    return { score, reason };
}

async function getPlayerInsights(userId: string, profile: any): Promise<PlayerInsight> {
    const now = new Date();
    const currentDay = now.getDay();

    // 1. Analyse du Questionnaire (Forces/Faiblesses techniques)
    const qStrengths: string[] = [];
    const qWeaknesses: string[] = [];

    if (profile.niveau_breakdown) {
        const breakdown = profile.niveau_breakdown;
        const responses = breakdown.responses as Record<string, number> | undefined;

        if (responses) {
            // Priorité 1 : Réponses détaillées du questionnaire
            const skillMap: Record<string, string> = {
                "1": "Jeu après vitre",
                "2": "Régularité fond court",
                "3": "Service",
                "4": "Volée",
                "5": "Smash/Bandeja",
                "6": "Lobs",
                "8": "Positionnement",
                "9": "Lecture de jeu",
                "10": "Communication",
                "11": "Contrôle du tempo",
                "12": "Construction des points",
                "19": "Endurance",
                "20": "Gestion pression",
                "21": "Double vitre"
            };

            Object.entries(responses).forEach(([qId, score]) => {
                const skill = skillMap[qId];
                if (skill) {
                    if (Number(score) >= 8) qStrengths.push(skill);
                    else if (Number(score) <= 3) qWeaknesses.push(skill);
                }
            });
        } else {
            // Priorité 2 (Fallback) : Moyennes par catégories (anciens profils)
            const categoryMap: Record<string, string> = {
                "technique": "Bagage technique",
                "tactique": "Sens tactique",
                "experience": "Expérience de jeu",
                "physique": "Condition physique",
                "situations": "Gestion des situations"
            };

            Object.entries(breakdown).forEach(([cat, score]) => {
                const label = categoryMap[cat];
                if (label && typeof score === 'number') {
                    if (score >= 7.5) qStrengths.push(label);
                    else if (score <= 4) qWeaknesses.push(label);
                }
            });
        }
    }

    // 2. Analyse Historique (Matchs)
    const { data: participations } = await supabaseAdmin
        .from("match_participants")
        .select("match_id, team")
        .eq("user_id", userId)
        .eq("player_type", "user")
        .limit(20);

    const defaultInsight: PlayerInsight = {
        userId,
        displayName: profile.first_name || profile.display_name,
        luckyDay: null,
        goldenHour: null,
        strengths: qStrengths,
        weaknesses: qWeaknesses.length > 0 ? qWeaknesses : (qStrengths.length === 0 ? ["Données techniques manquantes"] : []),
        form: 0
    };

    if (!participations || participations.length === 0) return defaultInsight;

    const matchIds = participations.map(p => p.match_id);
    const { data: matches } = await supabaseAdmin
        .from("matches")
        .select("id, played_at, created_at, winner_team_id, team1_id, team2_id, score_team1, score_team2")
        .in("id", matchIds)
        .eq("status", "confirmed")
        .order("played_at", { ascending: false });

    if (!matches || matches.length === 0) return defaultInsight;

    const dayWins = new Map<number, { w: number, t: number }>();
    const hourWins = new Map<number, { w: number, t: number }>();
    let recentWins = 0;
    let comebackWins = 0;
    let comebackOpps = 0;

    matches.forEach((m, idx) => {
        const part = participations.find(p => p.match_id === m.id)!;
        const isWin = (m.winner_team_id === m.team1_id ? 1 : 2) === part.team;

        if (idx < 5 && isWin) recentWins++;

        const date = new Date(m.played_at || m.created_at);
        const day = date.getDay();
        const dStat = dayWins.get(day) || { w: 0, t: 0 };
        dStat.t++;
        if (isWin) dStat.w++;
        dayWins.set(day, dStat);

        const hourSlot = Math.floor(date.getHours() / 3); // 3h slots
        const hStat = hourWins.get(hourSlot) || { w: 0, t: 0 };
        hStat.t++;
        if (isWin) hStat.w++;
        hourWins.set(hourSlot, hStat);

        // Comeback analysis
        const score = m.score_team1 || m.score_team2;
        if (typeof score === 'string' && score.includes('/')) {
            const sets = score.split('/').map(s => s.trim());
            if (sets.length >= 2) {
                const [s1, s2] = sets[0].split('-').map(Number);
                const myFirstSetScore = part.team === 1 ? s1 : s2;
                const oppFirstSetScore = part.team === 1 ? s2 : s1;
                if (myFirstSetScore < oppFirstSetScore) {
                    comebackOpps++;
                    if (isWin) comebackWins++;
                }
            }
        }
    });

    // Determine Lucky Day (Best Win Rate with min 3 matches)
    let bestDay = -1;
    let maxWR = 0.5;
    dayWins.forEach((s, d) => {
        const wr = s.w / s.t;
        if (s.t >= 3 && wr > maxWR) {
            maxWR = wr;
            bestDay = d;
        }
    });

    // Determine Golden Hour
    let bestHourSlot = -1;
    let maxHWR = 0.5;
    hourWins.forEach((s, h) => {
        const wr = s.w / s.t;
        if (s.t >= 3 && wr > maxHWR) {
            maxHWR = wr;
            bestHourSlot = h;
        }
    });

    const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const hourSlots = ["0h-3h", "3h-6h", "6h-9h", "9h-12h", "12h-15h", "15h-18h", "18h-21h", "21h-0h"];

    const finalStrengths = [...qStrengths];
    if (recentWins >= 4) finalStrengths.push("Grande forme actuelle");
    if (comebackOpps >= 2 && (comebackWins / comebackOpps) >= 0.5) finalStrengths.push("Mental d'acier (Remontadas)");

    return {
        userId,
        displayName: profile.first_name || profile.display_name,
        luckyDay: bestDay !== -1 ? dayNames[bestDay] : null,
        goldenHour: bestHourSlot !== -1 ? hourSlots[bestHourSlot] : null,
        strengths: finalStrengths,
        weaknesses: qWeaknesses,
        form: Math.round((recentWins / Math.min(5, matches.length)) * 100)
    };
}

async function getRanks(userId: string, points: number, profile: any): Promise<RankProgression[]> {
    const scopes: { name: "National" | "Régional" | "Départemental" | "Club", filter: any }[] = [];

    // Order requested: Département, Région, National, Club
    if (profile.department_code) scopes.push({ name: "Départemental", filter: { department_code: profile.department_code } });
    if (profile.region_code) scopes.push({ name: "Régional", filter: { region_code: profile.region_code } });
    scopes.push({ name: "National", filter: {} });
    if (profile.club_id) scopes.push({ name: "Club", filter: { club_id: profile.club_id } });

    const results: RankProgression[] = [];

    for (const scope of scopes) {
        let query = supabaseAdmin.from("profiles").select("global_points", { count: 'exact' });
        for (const [k, v] of Object.entries(scope.filter)) {
            query = query.eq(k, v);
        }

        const { data, count } = await query;
        if (!data) continue;

        const pointsList = data.map(p => p.global_points || 0).sort((a, b) => b - a);

        const findRank = (p: number) => {
            let r = 1;
            for (const val of pointsList) {
                if (val > p) r++;
                else break;
            }
            return r;
        };

        results.push({
            scope: scope.name,
            currentRank: findRank(profile.global_points || 0),
            newRankWin: findRank(points + 15), // Win estimation
            newRankLoss: findRank(points + 2),  // Loss estimation (small gain for playing)
            totalPlayers: count || data.length
        });
    }

    return results;
}

function getTacticalTarget(insights: PlayerInsight[], teamIndices: number[]): { userId: string; reason: string } | null {
    const attackers = teamIndices.map(i => insights[i]);
    const defenders = insights.filter((_, i) => !teamIndices.includes(i));

    // Stratégie technique : Force vs Faiblesse
    for (const attacker of attackers) {
        for (const defender of defenders) {
            const commonSkill = attacker.strengths.find(s => defender.weaknesses.includes(s));
            if (commonSkill) {
                return {
                    userId: defender.userId,
                    reason: `${attacker.displayName}, exploitez votre ${commonSkill.toLowerCase()} sur le côté de ${defender.displayName}. C'est votre point fort et sa zone de fragilité actuelle.`
                };
            }
        }
    }

    // Stratégie de pression : Ciblage du maillon faible moral/forme
    const weakDefender = defenders.sort((a, b) => (b.weaknesses.length - a.weaknesses.length) || (a.form - b.form))[0];
    if (weakDefender.form < 50) {
        return {
            userId: weakDefender.userId,
            reason: `Mettez la pression sur ${weakDefender.displayName} dès le début du match. Sa forme actuelle est basse, testez sa régularité sur les échanges longs.`
        };
    }

    return {
        userId: weakDefender.userId,
        reason: `Fixez ${weakDefender.displayName} au fond du court pour l'empêcher de monter à la volée, zone où il semble moins à l'aise techniquement.`
    };
}

export async function getOraclePrediction(playerIds: string[]): Promise<OraclePredictionResult | { error: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Non authentifié" };

    const { data: currentUserProfile } = await supabaseAdmin.from("profiles").select("is_premium").eq("id", user.id).single();
    if (!currentUserProfile?.is_premium) return { error: "Accès réservé aux membres Premium" };
    if (playerIds.length !== 4) return { error: "L'Oracle nécessite exactement 4 joueurs" };

    try {
        const { data: profiles } = await supabaseAdmin
            .from("profiles")
            .select("id, display_name, first_name, last_name, avatar_url, niveau_padel, matchs_joues, global_points, club_id, department_code, region_code, niveau_breakdown")
            .in("id", playerIds);

        if (!profiles || profiles.length < 4) return { error: "Profils introuvables" };

        const profileMap = new Map(profiles.map(p => [p.id, p]));
        const p1 = profileMap.get(playerIds[0])!;
        const p2 = profileMap.get(playerIds[1])!;
        const p3 = profileMap.get(playerIds[2])!;
        const p4 = profileMap.get(playerIds[3])!;

        // 1. Synergie & Probabilités
        const [synergy1, synergy2] = await Promise.all([
            calculateSynergy(playerIds[0], playerIds[1]),
            calculateSynergy(playerIds[2], playerIds[3])
        ]);

        const team1Avg = ((p1.niveau_padel || 5) + (p2.niveau_padel || 5)) / 2;
        const team2Avg = ((p3.niveau_padel || 5) + (p4.niveau_padel || 5)) / 2;
        const winProb1 = Math.round(calculateWinProbability(team1Avg, team2Avg) * 100);

        // 2. Rééquilibrage
        let suggestedBalancedTeams = [playerIds[0], playerIds[1], playerIds[2], playerIds[3]];
        let minDiff = Math.abs(50 - winProb1);
        const options = [
            [playerIds[0], playerIds[2], playerIds[1], playerIds[3]],
            [playerIds[0], playerIds[3], playerIds[1], playerIds[2]]
        ];

        options.forEach(opt => {
            const t1 = ((profileMap.get(opt[0])?.niveau_padel || 5) + (profileMap.get(opt[1])?.niveau_padel || 5)) / 2;
            const t2 = ((profileMap.get(opt[2])?.niveau_padel || 5) + (profileMap.get(opt[3])?.niveau_padel || 5)) / 2;
            const wp = calculateWinProbability(t1, t2);
            if (Math.abs(50 - wp) < minDiff) {
                minDiff = Math.abs(50 - wp);
                suggestedBalancedTeams = opt;
            }
        });

        const playerStakes: any = {};
        const insightPromises = playerIds.map(pid => getPlayerInsights(pid, profileMap.get(pid)!));
        const allInsights = await Promise.all(insightPromises);

        // 3. Ciblage Tactique
        const team1Target = getTacticalTarget(allInsights, [0, 1]);
        const team2Target = getTacticalTarget(allInsights, [2, 3]);

        for (let i = 0; i < 4; i++) {
            const userId = playerIds[i];
            const p = profileMap.get(userId)!;
            const ranks = await getRanks(userId, p.global_points || 0, p);

            const currentLevel = p.niveau_padel || 5;
            const oppAvg = i < 2 ? team2Avg : team1Avg;

            const deltaWin = calculateLevelDelta(currentLevel, oppAvg, p.matchs_joues || 0, true);
            const deltaLoss = calculateLevelDelta(currentLevel, oppAvg, p.matchs_joues || 0, false);

            playerStakes[userId] = {
                currentLevel: currentLevel,
                ifWin: {
                    delta: deltaWin,
                    newLevel: simulateNewLevel(currentLevel, deltaWin),
                    pointsDelta: 15,
                    ranks
                },
                ifLoss: {
                    delta: deltaLoss,
                    newLevel: simulateNewLevel(currentLevel, deltaLoss),
                    pointsDelta: 2,
                    ranks
                }
            };
        }

        return {
            team1: { players: [p1, p2], winProbability: winProb1, avgLevel: team1Avg, synergy: synergy1 },
            team2: { players: [p3, p4], winProbability: 100 - winProb1, avgLevel: team2Avg, synergy: synergy2 },
            playerStakes,
            playerInsights: allInsights,
            suggestedBalancedTeams,
            tacticalTarget: { team1Target, team2Target }
        };
    } catch (error) {
        logger.error("Erreur Oracle Prediction", { error });
        return { error: "Une erreur est survenue lors de l'analyse" };
    }
}
