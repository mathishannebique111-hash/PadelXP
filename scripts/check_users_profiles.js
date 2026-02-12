
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

async function checkTriggers() {
    console.log("🔍 Vérification des triggers sur la table auth.users...");

    // Nous ne pouvons pas facilement lister les triggers via l'API JS standard sauf si nous avons accès aux tables système
    // ou si nous appelons une fonction RPC dédiée.
    // A défaut, nous allons essayer de lire la définition de la fonction handle_new_user via RPC si possible,
    // ou simplement tester la création d'un utilisateur dummy (mais risqué en prod).

    // Alternative : On va vérifier le contenu de la table profiles pour voir si les emails sont là pour les tout derniers users
    // et on va afficher les métadonnées brutes des utilisateurs pour voir si l'email est bien dans auth.users

    const { data: users, error: usersError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 5
    });

    if (usersError) {
        console.error("❌ Erreur récupération users:", usersError);
        return;
    }

    console.log(`✅ ${users.users.length} derniers utilisateurs auth récupérés.`);

    for (const user of users.users) {
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        console.log(`\nUser: ${user.email} (ID: ${user.id})`);
        console.log(`Created At: ${new Date(user.created_at).toLocaleString()}`);

        if (profile) {
            console.log(`✅ Profil trouvé:`);
            console.log(`   - Email dans profil: ${profile.email}`);
            console.log(`   - Display Name: ${profile.display_name}`);
            console.log(`   - Full Name: ${profile.full_name}`);
        } else {
            console.log(`❌ PAS DE PROFIL TROUVÉ !`);
        }
    }
}

checkTriggers();
