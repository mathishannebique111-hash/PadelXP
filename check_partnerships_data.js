const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function listPartnerships() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('Missing environment variables');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log('Listing partnerships...');

    const { data, error } = await supabase
        .from('player_partnerships')
        .select('*');

    if (error) {
        console.error('Error listing partnerships:', error);
    } else {
        console.log('Partnerships found:', data.length);
        console.log(JSON.stringify(data, null, 2));
    }
}

listPartnerships();
