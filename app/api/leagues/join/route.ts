import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        const body = await req.json();
        const { invite_code } = body;

        if (!invite_code || typeof invite_code !== "string") {
            return NextResponse.json({ error: "Code d'invitation requis" }, { status: 400 });
        }

        const code = invite_code.trim().toUpperCase();

        // Trouver la ligue
        const { data: league, error: leagueError } = await supabaseAdmin
            .from("leagues")
            .select("*")
            .eq("invite_code", code)
            .maybeSingle();

        if (leagueError || !league) {
            return NextResponse.json({ error: "Code d'invitation invalide" }, { status: 404 });
        }

        // Vérifier que la ligue est en attente de joueurs
        if (league.status !== "pending") {
            return NextResponse.json({ error: "Cette ligue est déjà démarrée ou terminée" }, { status: 400 });
        }

        // Vérifier si déjà membre
        const { data: existing } = await supabaseAdmin
            .from("league_players")
            .select("id")
            .eq("league_id", league.id)
            .eq("player_id", user.id)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ error: "Vous êtes déjà membre de cette ligue" }, { status: 400 });
        }

        // Vérifier le nombre max de joueurs
        const { count } = await supabaseAdmin
            .from("league_players")
            .select("id", { count: "exact", head: true })
            .eq("league_id", league.id);

        if (count !== null && count >= league.max_players) {
            return NextResponse.json({ error: "Cette ligue est complète" }, { status: 400 });
        }

        // Rejoindre
        const { error: joinError } = await supabaseAdmin
            .from("league_players")
            .insert({
                league_id: league.id,
                player_id: user.id,
            });

        if (joinError) {
            console.error("[leagues/join] Error:", joinError);
            return NextResponse.json({ error: "Erreur lors de l'inscription" }, { status: 500 });
        }

        // Vérifier si la ligue est maintenant pleine
        if (count !== null && count + 1 >= league.max_players) {
            const starts_at = new Date();
            const ends_at = new Date(starts_at.getTime() + league.duration_weeks * 7 * 24 * 60 * 60 * 1000);

            const { error: updateError } = await supabaseAdmin
                .from("leagues")
                .update({
                    status: "active",
                    starts_at: starts_at.toISOString(),
                    ends_at: ends_at.toISOString()
                })
                .eq("id", league.id);

            if (updateError) {
                console.error("[leagues/join] Update league status error:", updateError);
            }
        }

        return NextResponse.json({ success: true, league_name: league.name }, { status: 200 });
    } catch (error: any) {
        console.error("[leagues/join] Unexpected error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
