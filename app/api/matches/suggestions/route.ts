import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

// Client admin pour bypass RLS
const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const supabase = await createClient();

        // 1. Récupérer l'utilisateur connecté
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ suggestions: [] }, { status: 401 });
        }

        // 2. Récupérer le profil et le partenaire de l'utilisateur
        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id, club_id, niveau_padel, department_code")
            .eq("id", user.id)
            .maybeSingle();

        // Si pas de profil, on ne peut rien suggérer
        if (!profile) {
            return NextResponse.json({ suggestions: [] });
        }

        // Trouver le partenaire habituel (accepté)
        const { data: userPartnership } = await supabaseAdmin
            .from("player_partnerships")
            .select("id, player_id, partner_id")
            .eq("status", "accepted")
            .or(`player_id.eq.${user.id},partner_id.eq.${user.id}`)
            .maybeSingle();

        if (!userPartnership) {
            // Pas de partenaire habituel, pas de suggestions de paires
            return NextResponse.json({ suggestions: [], reason: "no_partner" });
        }

        const userPartnerId = userPartnership.player_id === user.id
            ? userPartnership.partner_id
            : userPartnership.player_id;

        // 3. Identifier toutes les paires acceptées du club (sauf celle de l'utilisateur)
        const { data: allPartnerships } = await supabaseAdmin
            .from("player_partnerships")
            .select("id, player_id, partner_id")
            .eq("status", "accepted")
            .not("id", "eq", (userPartnership as any).id);

        if (!allPartnerships || allPartnerships.length === 0) {
            return NextResponse.json({ suggestions: [] });
        }

        // 4. Identifier tous les IDs de joueurs impliqués (utilisateur + partenaire + toutes les paires du club)
        const involvedUserIds = new Set<string>();
        involvedUserIds.add(user.id);
        involvedUserIds.add(userPartnerId);
        allPartnerships.forEach(p => {
            involvedUserIds.add(p.player_id);
            involvedUserIds.add(p.partner_id);
        });

        // 5. Récupérer les profils avec club_id pour filtrage
        const { data: profiles } = await supabaseAdmin
            .from("profiles")
            .select("id, first_name, last_name, display_name, avatar_url, niveau_padel, club_id, department_code")
            .in("id", Array.from(involvedUserIds));

        const profilesMap = new Map(profiles?.map(p => [p.id, p]));

        // 6. Récupérer les participations pour ces joueurs uniquement (avec une limite plus haute)
        const { data: allParticipants } = await supabaseAdmin
            .from("match_participants")
            .select("user_id, team, match_id")
            .in("user_id", Array.from(involvedUserIds))
            .eq("player_type", "user")
            .limit(10000); // Augmenter la limite pour éviter la troncature

        // 7. Récupérer les détails des matchs séparément pour plus de fiabilité
        const uniqueMatchIds = [...new Set(allParticipants?.map(p => p.match_id) || [])];
        const { data: allMatches } = await supabaseAdmin
            .from("matches")
            .select("id, winner_team_id, team1_id, team2_id")
            .in("id", uniqueMatchIds);

        const matchesMap = new Map(allMatches?.map(m => [m.id, m]));

        // 8. Calculer les winrates réels pour ces joueurs
        const winrateMap = new Map<string, number>();
        if (allParticipants && allMatches) {
            const playerStats = new Map<string, { wins: number, total: number }>();
            allParticipants.forEach((p: any) => {
                const matchData = matchesMap.get(p.match_id);
                if (!matchData || !matchData.winner_team_id) return;

                const stats = playerStats.get(p.user_id) || { wins: 0, total: 0 };
                const winnerTeamNum = matchData.winner_team_id === matchData.team1_id ? 1 : 2;

                if (Number(p.team) === winnerTeamNum) stats.wins++;
                stats.total++;
                playerStats.set(p.user_id, stats);
            });
            playerStats.forEach((stats, userId) => {
                if (stats.total > 0) {
                    winrateMap.set(userId, (stats.wins / stats.total) * 100);
                }
            });
        }

        const getWinrate = (userId: string) => winrateMap.get(userId) || 0;

        // 9. Calculer les moyennes de la paire de l'utilisateur
        const userProfile = profilesMap.get(user.id);
        const partnerProfile = profilesMap.get(userPartnerId);

        if (!userProfile?.niveau_padel || !partnerProfile?.niveau_padel) {
            return NextResponse.json({ suggestions: [], reason: "missing_levels" });
        }

        const userPairAvgLevel = (userProfile.niveau_padel + partnerProfile.niveau_padel) / 2;
        const userPairAvgWinrate = (getWinrate(user.id) + getWinrate(userPartnerId)) / 2;

        const { searchParams } = new URL(req.url);
        const departmentFilter = searchParams.get("department");

        // 10. Calculer la compatibilité pour chaque paire
        const suggestions = allPartnerships.map(p => {
            const p1 = profilesMap.get(p.player_id);
            const p2 = profilesMap.get(p.partner_id);

            if (!p1?.niveau_padel || !p2?.niveau_padel) return null;

            // FILTRAGE
            if (departmentFilter) {
                // Si filtre département actif : on ne garde que si au moins un des deux joueurs est dans le département
                if (p1.department_code !== departmentFilter && p2.department_code !== departmentFilter) {
                    return null;
                }
            } else {
                // Comportement par défaut
                if (profile.club_id) {
                    // FILTRE CLUB : Suggérer uniquement des paires où au moins un joueur est du même club
                    if (p1.club_id !== profile.club_id && p2.club_id !== profile.club_id) return null;
                } else if (profile.department_code) {
                    // Fallback freelance : filtre par département utilisateur
                    if (p1.department_code !== profile.department_code && p2.department_code !== profile.department_code) return null;
                }
            }

            const pairAvgLevel = (p1.niveau_padel + p2.niveau_padel) / 2;
            const pairAvgWinrate = (getWinrate(p.player_id) + getWinrate(p.partner_id)) / 2;

            // Calcul du score de compatibilité
            // 70% basé sur le niveau (différence inverse)
            // 30% basé sur le winrate (différence inverse)

            const levelDiff = Math.abs(userPairAvgLevel - pairAvgLevel);
            const winrateDiff = Math.abs(userPairAvgWinrate - pairAvgWinrate);

            // Score de niveau : 100 si diff=0, 0 si diff >= 3
            const levelScore = Math.max(0, 100 - (levelDiff * 33.3));

            // Score de winrate : 100 si diff=0, 0 si diff >= 50
            const winrateScore = Math.max(0, 100 - (winrateDiff * 2));

            const totalScore = Math.round((levelScore * 0.7) + (winrateScore * 0.3));

            return {
                id: p.id,
                player1: {
                    id: p1.id,
                    name: `${p1.first_name || ''} ${p1.last_name || ''}`.trim() || p1.display_name,
                    avatar_url: p1.avatar_url
                },
                player2: {
                    id: p2.id,
                    name: `${p2.first_name || ''} ${p2.last_name || ''}`.trim() || p2.display_name,
                    avatar_url: p2.avatar_url
                },
                avgLevel: pairAvgLevel,
                avgWinrate: Math.round(pairAvgWinrate),
                compatibilityScore: totalScore
            };
        })
            .filter(s => s !== null && s.compatibilityScore >= 55) // Filtrer les paires peu compatibles (minimum 55%)
            .sort((a, b) => b!.compatibilityScore - a!.compatibilityScore)
            .slice(0, 10);

        return NextResponse.json({ suggestions });
    } catch (error) {
        logger.error("[MatchesSuggestions] Erreur:", error);
        return NextResponse.json({ suggestions: [], error: "Internal Server Error" }, { status: 500 });
    }
}
