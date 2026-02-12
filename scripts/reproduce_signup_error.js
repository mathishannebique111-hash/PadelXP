
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

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

async function reproduceSignupError() {
    const testEmail = `test_debug_${Date.now()}@example.com`;
    const testPassword = "password123";

    console.log(`🚀 Tentative de création utilisateur: ${testEmail}`);

    try {
        const { data, error } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
            options: {
                data: {
                    full_name: "Test Debug User",
                    // On omet volontairement les autres champs pour tester le comportement par défaut
                },
            },
        });

        if (error) {
            console.error("❌ Échec de l'inscription !");
            console.error("Status:", error.status);
            console.error("Message:", error.message);

            // Essayer d'inspecter plus de détails si disponibles
            if (error && typeof error === 'object') {
                console.log("Détails complets de l'erreur:", JSON.stringify(error, null, 2));
            }
        } else {
            console.log("✅ Inscription réussie !");
            console.log("User ID:", data.user?.id);

            // Vérifier si le profil a été créé
            if (data.user?.id) {
                const { data: profile, error: profileError } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", data.user.id)
                    .single();

                if (profileError) {
                    console.error("❌ Vérification profil échouée:", profileError.message);
                } else {
                    console.log("✅ Profil créé avec succès:");
                    console.log(profile);
                }
            }
        }
    } catch (err) {
        console.error("❌ Erreur inattendue:", err);
    }
}

reproduceSignupError();
