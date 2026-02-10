
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase environment variables");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkColumns() {
    console.log("Checking columns for clubs table...");
    const { data: clubs, error: clubsError } = await supabase.from('clubs').select('*').limit(1);
    if (clubsError) {
        console.error("Error fetching clubs:", clubsError.message);
    } else if (clubs && clubs.length > 0) {
        const club = clubs[0];
        console.log("Columns in clubs:", Object.keys(club));
        if (!('opening_hours' in club)) {
            console.log("MISSING: opening_hours in clubs");
        } else {
            console.log("EXISTS: opening_hours in clubs");
        }
    }

    console.log("\nChecking columns for courts table...");
    const { data: courts, error: courtsError } = await supabase.from('courts').select('*').limit(1);
    if (courtsError) {
        console.error("Error fetching courts:", courtsError.message);
    } else if (courts && courts.length > 0) {
        const court = courts[0];
        console.log("Columns in courts:", Object.keys(court));
        if (!('price_hour' in court)) {
            console.log("MISSING: price_hour in courts");
        } else {
            console.log("EXISTS: price_hour in courts");
        }
        if (!('pricing_rules' in court)) {
            console.log("MISSING: pricing_rules in courts");
        } else {
            console.log("EXISTS: pricing_rules in courts");
        }
    }
}

checkColumns();
