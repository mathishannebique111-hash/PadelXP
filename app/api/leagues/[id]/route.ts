import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        const { id } = await params;

        // Récupérer la ligue
        const { data: league, error: leagueError } = await supabaseAdmin
            .from("leagues")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (leagueError || !league) {
            return NextResponse.json({ error: "Ligue introuvable" }, { status: 404 });
        }

        // Vérifier que le joueur est membre
        const { data: membership } = await supabaseAdmin
            .from("league_players")
            .select("id")
            .eq("league_id", id)
            .eq("player_id", user.id)
            .maybeSingle();

        if (!membership) {
            return NextResponse.json({ error: "Vous n'êtes pas membre de cette ligue" }, { status: 403 });
        }

        // Récupérer tous les joueurs avec leurs profils
        const { data: players, error: playersError } = await supabaseAdmin
            .from("league_players")
            .select("player_id, matches_played, points, joined_at")
            .eq("league_id", id)
            .order("points", { ascending: false });

        if (playersError) {
            console.error("[leagues/[id]] Players error:", playersError);
            return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
        }

        // Récupérer les profils des joueurs
        const playerIds = (players || []).map(p => p.player_id);
        const { data: profiles } = await supabaseAdmin
            .from("profiles")
            .select("id, first_name, last_name, display_name")
            .in("id", playerIds);

        const profilesMap = new Map(
            (profiles || []).map(p => [p.id, p])
        );

        // Construire le classement
        const standings = (players || []).map((p, index) => {
            const profile = profilesMap.get(p.player_id);
            return {
                rank: index + 1,
                player_id: p.player_id,
                display_name: profile?.display_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || "Joueur",
                matches_played: p.matches_played,
                points: p.points,
                is_current_user: p.player_id === user.id,
            };
        });

        // Calculer le temps restant
        let remainingDays = null;
        let isExpired = false;

        if (league.status !== "pending" && league.ends_at) {
            const now = new Date();
            const endsAt = new Date(league.ends_at);
            const remainingMs = Math.max(0, endsAt.getTime() - now.getTime());
            remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
            isExpired = remainingMs <= 0;
        }

        return NextResponse.json({
            league: {
                ...league,
                remaining_days: remainingDays,
                is_expired: isExpired,
            },
            standings,
        });
    } catch (error: any) {
        console.error("[leagues/[id]] Unexpected error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
