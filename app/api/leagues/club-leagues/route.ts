import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const club_id = searchParams.get("club_id");

        if (!club_id) {
            return NextResponse.json({ leagues: [] });
        }

        // Récupérer les ligues liées à ce club
        const { data: leagues, error } = await supabaseAdmin
            .from("leagues")
            .select("*")
            .eq("club_id", club_id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("[leagues/club-leagues] Error:", error);
            return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
        }

        // Pour chaque ligue, récupérer le nombre de joueurs
        const enrichedLeagues = await Promise.all(
            (leagues || []).map(async (league) => {
                const { count } = await supabaseAdmin
                    .from("league_players")
                    .select("id", { count: "exact", head: true })
                    .eq("league_id", league.id);

                return {
                    ...league,
                    player_count: count || 0,
                };
            })
        );

        return NextResponse.json({ leagues: enrichedLeagues });
    } catch (error: any) {
        console.error("[leagues/club-leagues] Unexpected error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
