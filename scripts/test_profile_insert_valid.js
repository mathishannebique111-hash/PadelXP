
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

async function testValidProfileInsert() {
    const testId = "00000000-0000-0000-0000-0000000000" + Math.floor(10 + Math.random() * 89); // UUID-ish
    const testEmail = `debug_valid_${Date.now()}@example.com`;

    console.log("🚀 Testing VALID INSERT into profiles...");
    console.log(`Test ID: ${testId}`);

    // Create a payload that satisfies ALL constraints we know of:
    // - display_name NOT NULL
    // - email (for good measure)
    // - id
    const payload = {
        id: testId,
        email: testEmail,
        display_name: "Test User",
        full_name: "Test Full Name",
        updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("profiles").insert(payload);

    if (error) {
        console.error("❌ VALID Insert failed! usage of other triggers suspected.");
        console.error(JSON.stringify(error, null, 2));
    } else {
        console.log("✅ VALID Insert succeeded!");
        console.log("This means the 'profiles' table and its triggers are fine.");
        console.log("The issue MUST be in the handle_new_user function logic itself.");

        // Cleanup
        await supabase.from("profiles").delete().eq("id", testId);
    }
}

testValidProfileInsert();
