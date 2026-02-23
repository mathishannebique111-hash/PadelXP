import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generateInviteCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Sans I,O,0,1 pour éviter la confusion
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        const body = await req.json();
        const { name, duration_weeks, max_matches_per_player, max_players } = body;

        // Validation
        if (!name || !name.trim()) {
            return NextResponse.json({ error: "Le nom de la ligue est requis" }, { status: 400 });
        }
        if (![2, 3, 4, 5, 6].includes(duration_weeks)) {
            return NextResponse.json({ error: "Durée invalide" }, { status: 400 });
        }
        if (![5, 10, 15].includes(max_matches_per_player)) {
            return NextResponse.json({ error: "Nombre de matchs invalide" }, { status: 400 });
        }
        if (!max_players || max_players < 4 || max_players > 15) {
            return NextResponse.json({ error: "Nombre de joueurs invalide (4-15)" }, { status: 400 });
        }

        // Générer un code unique
        let invite_code = generateInviteCode();
        let attempts = 0;
        while (attempts < 10) {
            const { data: existing } = await supabaseAdmin
                .from("leagues")
                .select("id")
                .eq("invite_code", invite_code)
                .maybeSingle();
            if (!existing) break;
            invite_code = generateInviteCode();
            attempts++;
        }

        // Calculer la date de fin
        const starts_at = new Date();
        const ends_at = new Date(starts_at.getTime() + duration_weeks * 7 * 24 * 60 * 60 * 1000);

        // Créer la ligue
        const { data: league, error: leagueError } = await supabaseAdmin
            .from("leagues")
            .insert({
                name: name.trim(),
                created_by: user.id,
                invite_code,
                max_matches_per_player,
                max_players,
                duration_weeks,
                starts_at: starts_at.toISOString(),
                ends_at: ends_at.toISOString(),
                status: "active",
            })
            .select()
            .single();

        if (leagueError || !league) {
            console.error("[leagues/create] Error:", leagueError);
            return NextResponse.json({ error: "Erreur lors de la création de la ligue" }, { status: 500 });
        }

        // Inscrire le créateur automatiquement
        const { error: joinError } = await supabaseAdmin
            .from("league_players")
            .insert({
                league_id: league.id,
                player_id: user.id,
            });

        if (joinError) {
            console.error("[leagues/create] Join error:", joinError);
        }

        return NextResponse.json({ league, invite_code }, { status: 201 });
    } catch (error: any) {
        console.error("[leagues/create] Unexpected error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
