import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const { club_slug, code } = await request.json();

        if (!club_slug || !code) {
            return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
        }

        // 1. Récupérer le club et vérifier le code
        const { data: club, error: clubError } = await supabaseAdmin
            .from("clubs")
            .select("id, name, code_invitation, logo_url")
            .eq("slug", club_slug)
            .maybeSingle();

        if (clubError || !club) {
            return NextResponse.json({ error: "Club non trouvé" }, { status: 404 });
        }

        // Vérification insensible à la casse et aux espaces
        const normalizedInput = code.trim().toUpperCase();
        const normalizedExpected = (club.code_invitation || "").trim().toUpperCase();

        if (normalizedInput !== normalizedExpected) {
            return NextResponse.json({ error: "Code d'invitation incorrect" }, { status: 403 });
        }

        // 2. Mettre à jour le profil du joueur
        const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .update({
                club_id: club.id,
                club_slug: club_slug,
            })
            .eq("id", user.id);

        if (profileError) {
            logger.error("[join-club] Profile update error", profileError);
            throw new Error("Erreur lors de la mise à jour du profil");
        }

        // 3. Ajouter dans user_clubs ( Many-to-Many )
        const { error: membershipError } = await supabaseAdmin
            .from("user_clubs")
            .upsert({
                user_id: user.id,
                club_id: club.id,
                role: 'principal',
                joined_at: new Date().toISOString()
            }, {
                onConflict: 'user_id, club_id'
            });

        if (membershipError) {
            logger.error("[join-club] Membership error", membershipError);
        }

        // 4. Mettre à jour les metadatas Auth (si possible/nécessaire pour la session)
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
            user_metadata: {
                ...user.user_metadata,
                club_id: club.id,
                club_slug: club_slug,
                club_name: club.name,
                club_logo_url: club.logo_url
            }
        });

        logger.info(`[join-club] User ${user.id} joined club ${club.name}`);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        logger.error("[join-club] Error", error);
        return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
    }
}
