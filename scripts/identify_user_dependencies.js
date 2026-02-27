
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

// Charger les variables d'environnement
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("❌ Les variables d'environnement SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requises.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const userId = "f8ddb587-6037-4cad-a0d9-107bd02d1338";

const tablesToCheck = [
    "match_participants",
    "match_invitations",
    "notifications",
    "challenge_rewards",
    "challenge_badges",
    "user_clubs",
    "club_admins",
    "club_members",
    "conversations",
    "messages",
    "team_challenge_participants",
    "partnerships",
    "subscriptions",
    "support_chat_messages",
    "support_chat_conversations",
    "match_points_history",
    "player_points_history",
    "push_tokens"
];

async function listUserData() {
    console.log(`🔍 Recherche des données liées à l'ID : ${userId}...`);

    for (const table of tablesToCheck) {
        try {
            // On essaie de chercher par user_id ou sender_id ou receiver_id
            let query = supabase.from(table).select("*", { count: "exact", head: true });

            // On tente plusieurs colonnes communes
            const columns = ["user_id", "sender_id", "receiver_id", "player_id", "owner_id"];
            let found = false;

            for (const col of columns) {
                const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true }).eq(col, userId);
                if (!error && count > 0) {
                    console.log(`✅ [${table}] : ${count} entrées trouvées (colonne: ${col})`);
                    found = true;
                    break;
                }
            }

            if (!found) {
                // console.log(`ℹ️ [${table}] : 0 entrée`);
            }
        } catch (e) {
            // console.log(`❌ [${table}] : Table probablement inexistante ou erreur : ${e.message}`);
        }
    }
}

listUserData();
