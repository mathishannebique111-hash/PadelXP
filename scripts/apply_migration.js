
const postgres = require("postgres");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// Charger les variables d'environnement
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// Construction de la connection string
// Format: postgres://user:password@host:port/database
// On utilise SUPABASE_SERVICE_ROLE_KEY pour l'auth API mais ici on a besoin de la connection string DB directe
// Souvent c'est DATABASE_URL dans .env.local

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("❌ La variable d'environnement DATABASE_URL (connection string) est requise pour appliquer la migration.");
    console.log("ℹ️  Veuillez l'ajouter dans .env.local sous la forme: postgres://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres");
    process.exit(1);
}

const sql = postgres(DATABASE_URL, {
    ssl: { rejectUnauthorized: false }, // Nécessaire pour Supabase transaction pooler parfois
    max: 1
});

async function applyMigration() {
    const migrationFile = path.resolve(__dirname, "../supabase/migrations/20260212000002_fix_email_sync_and_backfill.sql");
    console.log(`📂 Lecture du fichier de migration: ${migrationFile}`);

    try {
        const migrationSql = fs.readFileSync(migrationFile, "utf8");
        console.log("🚀 Exécution de la migration...");

        await sql.unsafe(migrationSql);

        console.log("✅ Migration appliquée avec succès !");
        console.log("   - Trigger handle_new_user mis à jour.");
        console.log("   - Emails manquants backfillés.");
    } catch (err) {
        console.error("❌ Erreur lors de la migration:", err);
    } finally {
        await sql.end();
    }
}

applyMigration();
