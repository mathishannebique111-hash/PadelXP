const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findActiveMathis() {
    // Search for Mathis Hannebique in profiles
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, display_name, created_at')
        .or('display_name.ilike.%Mathis Hannebique%,and(first_name.ilike.Mathis,last_name.ilike.Hannebique)');

    console.log('--- Profiles found for Mathis Hannebique ---');
    for (const p of profiles) {
        // Check for activity (matches)
        const { count: matchesCount } = await supabase
            .from('match_participants')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', p.id);

        console.log(`ID: ${p.id} | Email: ${p.email} | Created: ${p.created_at} | Matches: ${matchesCount}`);
    }
}

findActiveMathis();
