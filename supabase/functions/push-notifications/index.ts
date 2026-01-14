import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// Configuration APNs (à remplir plus tard avec les secrets Supabase)
const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID");
const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID");
const APNS_BUNDLE_ID = "com.padelxp.app"; // À confirmer
const APNS_PRIVATE_KEY = Deno.env.get("APNS_PRIVATE_KEY"); // Contenu du .p8

serve(async (req) => {
    try {
        const { record } = await req.json();

        // 1. Extraire les infos de la notification
        const userId = record.user_id;
        const title = record.title;
        const body = record.message;
        const data = record.data;

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // 2. Récupérer les tokens push de l'utilisateur
        const { data: tokens, error: tokensError } = await supabase
            .from("push_tokens")
            .select("token, platform")
            .eq("user_id", userId);

        if (tokensError) throw tokensError;
        if (!tokens || tokens.length === 0) {
            return new Response(JSON.stringify({ message: "No tokens found" }), { status: 200 });
        }

        // 3. Envoyer aux différents tokens (pour l'instant on se concentre sur iOS)
        const results = await Promise.all(tokens.map(async (t) => {
            if (t.platform === "ios") {
                return await sendToAPNs(t.token, title, body, data);
            }
            return { status: "skipped", platform: t.platform };
        }));

        return new Response(JSON.stringify({ results }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});

// Fonction simplifiée pour APNs
async function sendToAPNs(deviceToken: string, title: string, body: string, data: any) {
    // NOTE: L'implémentation complète nécessite la génération d'un JWT avec la clé .p8
    // Cela sera finalisé dès que le fichier .p8 sera disponible.
    console.log(`[APNs] Envoi vers ${deviceToken}: ${title} - ${body}`);

    // Simulation pour l'instant
    return { status: "simulated", token: deviceToken };
}
