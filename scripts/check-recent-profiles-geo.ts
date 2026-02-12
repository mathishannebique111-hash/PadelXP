
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";

// Charger les variables d'environnement
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("❌ Les variables d'environnement SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requises.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkRecentProfiles() {
    console.log("🔍 Vérification des 20 derniers profils créés...");

    const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, display_name, email, created_at, postal_code, city, department_code, region_code, has_completed_onboarding")
        .order("created_at", { ascending: false })
        .limit(20);

    if (error) {
        console.error("❌ Erreur lors de la récupération des profils:", error);
        return;
    }

    if (!profiles || profiles.length === 0) {
        console.log("⚠️ Aucun profil trouvé.");
        return;
    }

    console.log(`✅ ${profiles.length} profils récupérés.\n`);

    let missingGeoCount = 0;

    profiles.forEach((p) => {
        const hasGeo = p.department_code && p.region_code;
        const status = hasGeo ? "✅ OK" : "❌ MANQUANT";

        if (!hasGeo) missingGeoCount++;

        console.log(`${status} | ${p.display_name} (${p.email})`);
        console.log(`      Created: ${new Date(p.created_at).toLocaleString()}`);
        console.log(`      Onboarding: ${p.has_completed_onboarding ? "OUI" : "NON"}`);
        console.log(`      Postal: ${p.postal_code || "N/A"} | Dept: ${p.department_code || "N/A"} | Region: ${p.region_code || "N/A"}`);
        console.log("---------------------------------------------------");
    });

    if (missingGeoCount > 0) {
        console.log(`\n⚠️ ${missingGeoCount} profils sur ${profiles.length} n'ont pas de données géographiques complètes.`);
    } else {
        console.log("\n✅ Tous les profils récents ont des données géographiques.");
    }
}

checkRecentProfiles();
