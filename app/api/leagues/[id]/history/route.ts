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
        const { searchParams } = new URL(req.url);
        const phase = searchParams.get("phase");

        if (phase === null) {
            return NextResponse.json({ error: "Phase requise" }, { status: 400 });
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

        // Fetch history
        const { data: history, error } = await supabaseAdmin
            .from("league_phase_history")
            .select("player_id, division, rank, matches_played, points")
            .eq("league_id", id)
            .eq("phase_number", parseInt(phase))
            .order("division", { ascending: true })
            .order("rank", { ascending: true });

        if (error) {
            console.error("[leagues/[id]/history] Error:", error);
            return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
        }

        // Fetch profiles
        const playerIds = (history || []).map(h => h.player_id);
        const { data: profiles } = await supabaseAdmin
            .from("profiles")
            .select("id, first_name, last_name, display_name")
            .in("id", playerIds);

        const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

        // Construct standings
        const standings = (history || []).map(h => {
            const profile = profilesMap.get(h.player_id);
            return {
                rank: h.rank,
                player_id: h.player_id,
                display_name: profile?.display_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || "Joueur",
                matches_played: h.matches_played,
                points: h.points,
                division: h.division,
                is_current_user: h.player_id === user.id,
            };
        });

        return NextResponse.json({ standings });

    } catch (error: any) {
        console.error("[leagues/[id]/history] Unexpected error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
