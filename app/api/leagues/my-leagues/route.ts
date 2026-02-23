import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        // Récupérer les ligues du joueur
        const { data: memberships, error: memberError } = await supabaseAdmin
            .from("league_players")
            .select("league_id")
            .eq("player_id", user.id);

        if (memberError) {
            console.error("[leagues/my-leagues] Error:", memberError);
            return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
        }

        if (!memberships || memberships.length === 0) {
            return NextResponse.json({ leagues: [] });
        }

        const leagueIds = memberships.map(m => m.league_id);

        // Récupérer les données des ligues
        const { data: leagues, error: leaguesError } = await supabaseAdmin
            .from("leagues")
            .select("*")
            .in("id", leagueIds)
            .order("created_at", { ascending: false });

        if (leaguesError) {
            console.error("[leagues/my-leagues] Leagues error:", leaguesError);
            return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
        }

        // Pour chaque ligue, récupérer le nombre de joueurs et si l'utilisateur est le créateur
        const enrichedLeagues = await Promise.all(
            (leagues || []).map(async (league) => {
                const { count } = await supabaseAdmin
                    .from("league_players")
                    .select("id", { count: "exact", head: true })
                    .eq("league_id", league.id);

                // Récupérer les stats du joueur courant dans cette ligue
                const { data: myStats } = await supabaseAdmin
                    .from("league_players")
                    .select("matches_played, points")
                    .eq("league_id", league.id)
                    .eq("player_id", user.id)
                    .maybeSingle();

                return {
                    ...league,
                    player_count: count || 0,
                    is_creator: league.created_by === user.id,
                    my_matches_played: myStats?.matches_played || 0,
                    my_points: myStats?.points || 0,
                };
            })
        );

        return NextResponse.json({ leagues: enrichedLeagues });
    } catch (error: any) {
        console.error("[leagues/my-leagues] Unexpected error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
