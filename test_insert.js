const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testInsert() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('Missing environment variables');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log('Attempting INSERT into player_partnerships...');

    // We need valid UUIDs. Let's fetch 2 users first.
    const { data: users, error: userError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 2 });
    if (userError || users.users.length < 2) {
        console.log('Not enough users to test partnership insert.');
        return;
    }

    const p1 = users.users[0].id;
    const p2 = users.users[1].id;

    // Clean up any existing
    await supabase.from('player_partnerships').delete().or(`player_id.eq.${p1},partner_id.eq.${p1}`);

    const { data, error } = await supabase
        .from('player_partnerships')
        .insert({
            player_id: p1,
            partner_id: p2,
            status: 'pending'
        })
        .select()
        .single();

    if (error) {
        console.log('INSERT Error:', error);
    } else {
        console.log('INSERT Success:', data);
        // clean up
        await supabase.from('player_partnerships').delete().eq('id', data.id);
    }
}

testInsert();
