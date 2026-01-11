const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkTable() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('Missing environment variables');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log('Checking if player_partnerships table exists...');

    const { data, error } = await supabase
        .from('player_partnerships')
        .select('count', { count: 'exact', head: true });

    if (error) {
        console.error('Error accessing player_partnerships table:', error.message);
        console.error('Error details:', error);
    } else {
        console.log('Table player_partnerships exists and is accessible.');
        console.log('Row count:', data); // Note: data is null for head:true with count, but we check specific count property if returned or just error absence
    }

    // Also check if we can insert a test record if needed, but select is enough for existence
}

checkTable();
