
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
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

    console.log(`🚀 Attempting to create user: ${testEmail}`);

    try {
        const { data, error } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
            options: {
                data: {
                    full_name: "Test Debug User",
                    // Intentionally omitting other fields to test fallback logic
                },
            },
        });

        if (error) {
            console.error("❌ Signup Failed!");
            console.error("Status:", error.status);
            console.error("Message:", error.message);
            console.error("Name:", error.name);
            if ((error as any).cause) {
                console.error("Cause:", (error as any).cause);
            }
        } else {
            console.log("✅ Signup Successful!");
            console.log("User ID:", data.user?.id);

            // Check if profile was created
            if (data.user?.id) {
                const { data: profile, error: profileError } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", data.user.id)
                    .single();

                if (profileError) {
                    console.error("❌ Profile check failed:", profileError.message);
                } else {
                    console.log("✅ Profile created successfully:");
                    console.log(profile);
                }
            }
        }
    } catch (err: any) {
        console.error("❌ Unexpected Error:", err);
    }
}

reproduceSignupError();
