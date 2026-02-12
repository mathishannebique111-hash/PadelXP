
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function fixExistingNames() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, serviceRole);

    console.log("Searching for profiles with potentially email-based names...");

    // Find users who have first_name and last_name but display_name might be old/email-based
    // or simply fix ALL users who have names to ensure display_name matches
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, display_name')
        .not('first_name', 'is', null)
        .not('last_name', 'is', null);

    if (error) {
        console.error("Error fetching profiles:", error);
        return;
    }

    console.log(`Checking ${profiles.length} profiles...`);

    for (const profile of profiles) {
        const expectedName = `${profile.first_name} ${profile.last_name}`.trim();
        if (profile.display_name !== expectedName) {
            console.log(`- Updating ${profile.email || profile.id}: "${profile.display_name}" -> "${expectedName}"`);
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ display_name: expectedName })
                .eq('id', profile.id);

            if (updateError) {
                console.error(`  ❌ Error updating ${profile.id}:`, updateError);
            } else {
                console.log(`  ✅ Fixed`);
            }
        }
    }
}

fixExistingNames();
