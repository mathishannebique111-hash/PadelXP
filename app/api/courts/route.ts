import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// GET /api/courts?club_id=xxx - Récupérer les terrains d'un club
export async function GET(request: NextRequest) {
    try {
        const supabase = createRouteHandlerClient({ cookies });
        const { searchParams } = new URL(request.url);
        const clubId = searchParams.get("club_id");

        if (!clubId) {
            return NextResponse.json({ error: "club_id requis" }, { status: 400 });
        }

        const { data: courts, error } = await supabase
            .from("courts")
            .select("id, name, is_active, created_at")
            .eq("club_id", clubId)
            .eq("is_active", true)
            .order("name", { ascending: true });

        if (error) {
            console.error("Error fetching courts:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ courts });
    } catch (error) {
        console.error("GET /api/courts error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

// POST /api/courts - Créer un nouveau terrain (admin club uniquement)
export async function POST(request: NextRequest) {
    try {
        const supabase = createRouteHandlerClient({ cookies });
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        const body = await request.json();
        const { club_id, name } = body;

        if (!club_id || !name) {
            return NextResponse.json({ error: "club_id et name requis" }, { status: 400 });
        }

        // Vérifier que l'utilisateur est admin du club
        const { data: isAdmin } = await supabase
            .from("club_admins")
            .select("id")
            .eq("club_id", club_id)
            .eq("user_id", user.id)
            .single();

        if (!isAdmin) {
            return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
        }

        const { data: court, error } = await supabase
            .from("courts")
            .insert({ club_id, name, is_active: true })
            .select()
            .single();

        if (error) {
            console.error("Error creating court:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ court }, { status: 201 });
    } catch (error) {
        console.error("POST /api/courts error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
