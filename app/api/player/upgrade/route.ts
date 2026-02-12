import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin client to bypass RLS for profile updates if needed
const supabaseAdmin = createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        logger.info("[api/player/upgrade] User requesting premium upgrade", { userId: user.id });

        // Update profile to set is_premium = true
        const { error } = await supabaseAdmin
            .from("profiles")
            .update({ is_premium: true })
            .eq("id", user.id);

        if (error) {
            logger.error("[api/player/upgrade] Database error", { error });
            return NextResponse.json({ error: "Erreur lors de la mise à jour du profil" }, { status: 500 });
        }

        logger.info("[api/player/upgrade] User upgraded to premium successfully", { userId: user.id });

        return NextResponse.json({ success: true, message: "Félicitations ! Vous êtes maintenant Premium." });

    } catch (error) {
        logger.error("[api/player/upgrade] Unexpected error", { error });
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
