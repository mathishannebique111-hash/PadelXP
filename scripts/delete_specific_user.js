
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

const emailToDelete = process.argv[2] || "mathis.hannebique111@gmail.com";

async function deleteUser() {
    console.log(`🔍 Recherche de l'utilisateur à supprimer : ${emailToDelete}...`);

    // 1. Chercher dans auth.users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
        console.error("❌ Erreur récupération users:", usersError);
        return;
    }

    const user = users.find(u => u.email.toLowerCase() === emailToDelete.toLowerCase());

    if (!user) {
        console.log(`❌ Aucun compte trouvé pour l'email ${emailToDelete}`);
        return;
    }

    const userId = user.id;
    console.log(`✅ Compte trouvé (ID: ${userId}). Suppression en cours...`);

    // 2. Supprimer les dépendances connues
    console.log(`⏳ Nettoyage des notifications et conversations...`);
    await supabase.from("notifications").delete().eq("user_id", userId);
    await supabase.from("conversations").delete().eq("user_id", userId);

    // 3. Supprimer de public.profiles d'abord
    const { error: profileDeleteError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

    if (profileDeleteError) {
        console.warn(`⚠️ Erreur lors de la suppression du profil : ${profileDeleteError.message}`);
    } else {
        console.log(`✅ Profil supprimé (ou inexistant).`);
    }

    // 4. Supprimer de auth.users
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);

    if (authDeleteError) {
        console.error(`❌ Erreur lors de la suppression du compte auth : ${authDeleteError.message}`);
    } else {
        console.log(`✅ Compte auth supprimé avec succès !`);
    }
}

deleteUser();
