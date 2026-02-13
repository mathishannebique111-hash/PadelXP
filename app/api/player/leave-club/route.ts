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

        logger.info(`[leave-club] User ${user.id} is leaving their club`);

        // 1. Mettre à jour le profil (reset club fields)
        const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .update({
                club_id: null,
                club_slug: null,
            })
            .eq("id", user.id);

        if (profileError) {
            logger.error("[leave-club] Profile reset error", profileError);
            throw new Error("Erreur lors de la réinitialisation du profil");
        }

        // 2. Supprimer de user_clubs
        const { error: membershipError } = await supabaseAdmin
            .from("user_clubs")
            .delete()
            .eq("user_id", user.id);

        if (membershipError) {
            logger.error("[leave-club] Membership deletion error", membershipError);
        }

        // 3. Mettre à jour les metadatas Auth
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
            user_metadata: {
                ...user.user_metadata,
                club_id: null,
                club_slug: null,
                club_name: null,
                club_logo_url: null
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        logger.error("[leave-club] Error", error);
        return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
    }
}
