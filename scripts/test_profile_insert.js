
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function testProfileInsert() {
    const testId = "00000000-0000-0000-0000-00000000000" + Math.floor(Math.random() * 9); // UUID format-ish
    const testEmail = `debug_insert_${Date.now()}@example.com`;

    console.log("🚀 Testing direct INSERT into profiles to check constraints...");

    // Mimic what the trigger tries to insert
    const payload = {
        id: testId, // This will likely fail with FK constraint if user doesn't exist in auth.users
        // BUT we want to see IF it fails on THAT, or on something else (like display_name)
        email: testEmail,
        display_name: null, // Let's try NULL to see if it explodes (it should, if NOT NULL)
        full_name: "",
        updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("profiles").insert(payload);

    if (error) {
        console.error("❌ Insert failed (Expected for FK, but checking message):");
        console.error(JSON.stringify(error, null, 2));
    } else {
        console.log("✅ Insert succeeded (Unexpected! Means no FK constraint on ID?)");
    }
}

testProfileInsert();
