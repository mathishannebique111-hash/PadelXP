import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const { leagueId } = await req.json();

        if (!leagueId) {
            return NextResponse.json({ error: "ID de la ligue manquant" }, { status: 400 });
        }

        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        // 1. Vérifier que la ligue existe et appartient à l'utilisateur (ou qu'il est admin du club créateur)
        const { data: league, error: fetchError } = await supabaseAdmin
            .from("leagues")
            .select("id, created_by, club_id")
            .eq("id", leagueId)
            .single();

        if (fetchError || !league) {
            return NextResponse.json({ error: "Ligue introuvable" }, { status: 404 });
        }

        // Vérifier les droits (soit créateur, soit admin du club associé)
        let isAuthorized = league.created_by === user.id;
        
        if (!isAuthorized && league.club_id) {
            const { data: adminEntry } = await supabaseAdmin
                .from("club_admins")
                .select("id")
                .eq("club_id", league.club_id)
                .eq("user_id", user.id)
                .maybeSingle();
            
            if (adminEntry) isAuthorized = true;
        }

        if (!isAuthorized) {
            return NextResponse.json({ error: "Vous n'avez pas les droits pour supprimer cette ligue" }, { status: 403 });
        }

        // 2. Supprimer les données liées (Supabase gère normalement via ON DELETE CASCADE si configuré, 
        // sinon on le fait manuellement pour être sûr)
        
        // Matchs de la ligue
        await supabaseAdmin.from("matches").delete().eq("league_id", leagueId);
        
        // Joueurs de la ligue
        await supabaseAdmin.from("league_players").delete().eq("league_id", leagueId);

        // 3. Supprimer la ligue
        const { error: deleteError } = await supabaseAdmin
            .from("leagues")
            .delete()
            .eq("id", leagueId);

        if (deleteError) {
            console.error("[api/leagues/delete] Error deleting league:", deleteError);
            return NextResponse.json({ error: "Erreur lors de la suppression de la ligue" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[api/leagues/delete] Unexpected error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
