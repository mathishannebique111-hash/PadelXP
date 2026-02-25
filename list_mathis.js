const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listMathis() {
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, display_name, email, created_at')
        .or('first_name.ilike.Mathis,last_name.ilike.Hannebique,display_name.ilike.%Mathis Hannebique%');

    console.log('--- Mathis Profiles ---');
    profiles.forEach(p => {
        console.log(`${p.id} | ${p.email} | ${p.display_name} | Created: ${p.created_at}`);
    });
}

listMathis();
