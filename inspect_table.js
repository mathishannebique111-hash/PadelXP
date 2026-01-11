const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function inspectTable() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('Missing environment variables');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log('Inspecting information_schema for player_partnerships...');

    // Use a direct RPC call if possible, or just try to query information_schema if enabled (often not exposed to API).
    // Since we can't easily query information_schema via standard client without setup, 
    // we will try to infer properties by checking privileges.

    // NOTE: PostgREST usually exposes 'rpc' functions. We can try to use a function if one exists, 
    // but since we are debugging, let's try to just adding explicit GRANTS which often fixes visibility.

    console.log('Attempting to check table structure via PostgREST introspection (if available)...');

    // Actually, let's just create a SQL file for the user to run that guarantees permissions.
    // Code-side, we can only verify what the API sees.

    const { data, error } = await supabase
        .from('player_partnerships')
        .select('count', { count: 'exact', head: true });

    if (error) {
        console.log('API Error:', error);
    } else {
        console.log('API Success. Table is visible.');
    }
}

inspectTable();
