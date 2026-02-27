
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

const emailToCheck = process.argv[2] || "mathis.hannebique111@gmail.com";

async function checkUser() {
    console.log(`🔍 Vérification de l'utilisateur avec l'email : ${emailToCheck}...`);

    // 1. Chercher dans auth.users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
        console.error("❌ Erreur récupération users:", usersError);
        return;
    }

    const user = users.find(u => u.email.toLowerCase() === emailToCheck.toLowerCase());

    if (!user) {
        console.log(`❌ Aucun compte trouvé dans auth.users pour l'email ${emailToCheck}`);

        // On vérifie quand même dans profiles au cas où (mais normalement c'est lié)
        const { data: profileInPublic, error: profilePublicError } = await supabase
            .from("profiles")
            .select("*")
            .eq("email", emailToCheck)
            .maybeSingle();

        if (profileInPublic) {
            console.log(`⚠️ Un profil a été trouvé dans public.profiles mais sans compte auth correspondant !`);
            console.log(`   ID: ${profileInPublic.id}`);
            console.log(`   Display Name: ${profileInPublic.display_name}`);
        } else {
            console.log(`❌ Aucun profil trouvé dans public.profiles.`);
        }
        return;
    }

    console.log(`✅ Compte trouvé dans auth.users :`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Created At: ${new Date(user.created_at).toLocaleString()}`);
    console.log(`   Last Sign In: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Jamais'}`);

    // 2. Chercher dans profiles
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

    if (profile) {
        console.log(`✅ Profil correspondant trouvé dans public.profiles :`);
        console.log(`   Display Name: ${profile.display_name || 'N/A'}`);
        console.log(`   First Name: ${profile.first_name || 'N/A'}`);
        console.log(`   Last Name: ${profile.last_name || 'N/A'}`);
        console.log(`   Club ID: ${profile.club_id || 'N/A'}`);
    } else {
        console.log(`❌ Aucun profil trouvé dans public.profiles pour l'ID ${user.id}`);
    }
}

checkUser();
