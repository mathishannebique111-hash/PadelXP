const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteUser(userIdentifier, isEmail = true) {
    console.log(`\n--- Processing: ${userIdentifier} ---`);

    let userId;

    if (isEmail) {
        const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
        const user = users.find(u => u.email === userIdentifier);
        if (!user) {
            console.log(`User with email ${userIdentifier} not found in Auth.`);
            // Check in profiles as fallback
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', userIdentifier)
                .maybeSingle();
            if (profile) userId = profile.id;
        } else {
            userId = user.id;
        }
    } else {
        // Search by name in profiles
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, display_name, first_name, last_name')
            .or(`display_name.ilike.%${userIdentifier}%,and(first_name.ilike.%${userIdentifier.split(' ')[0]}%,last_name.ilike.%${userIdentifier.split(' ')[1] || ''}%)`);

        if (profileError) {
            console.error('Error searching profiles:', profileError);
            return;
        }

        if (!profiles || profiles.length === 0) {
            console.log(`Profile with name ${userIdentifier} not found.`);
            return;
        }

        if (profiles.length > 1) {
            console.log(`Multiple profiles found for ${userIdentifier}:`, profiles.map(p => `${p.id} (${p.display_name})`));
            console.log('Please specify ID.');
            return;
        }

        userId = profiles[0].id;
    }

    if (!userId) {
        console.log('No User ID found.');
        return;
    }

    console.log(`Found User ID: ${userId}. Starting deletion...`);

    // Deletion logic (derived from /api/rgpd/delete-account)
    const tables = [
        'tournament_registrations', // player1_id or player2_id
        'tournament_participants',   // player_id
        'disciplinary_points',      // player_id
        'match_participants',       // user_id
        'match_confirmations',      // user_id
        'reviews',                  // user_id
        'player_challenges',        // user_id
        'club_admins',              // user_id
        'profiles'                  // id (last)
    ];

    // Specific deletes for tournament_registrations
    await supabase.from('tournament_registrations').delete().or(`player1_id.eq.${userId},player2_id.eq.${userId}`);

    // Generic deletes
    for (const table of tables.slice(1, -1)) {
        const col = (table === 'club_admins') ? 'user_id' : (table.includes('player') ? 'player_id' : 'user_id');
        const { error } = await supabase.from(table).delete().eq(col, userId);
        if (error) console.error(`Error deleting from ${table}:`, error.message);
        else console.log(`Deleted from ${table}`);
    }

    // Delete profile
    const { error: profErr } = await supabase.from('profiles').delete().eq('id', userId);
    if (profErr) console.error('Error deleting profile:', profErr.message);
    else console.log('Deleted profile');

    // Delete auth user
    const { error: authErr } = await supabase.auth.admin.deleteUser(userId);
    if (authErr) console.error('Error deleting auth user:', authErr.message);
    else console.log('Deleted Auth user successfully.');
}

async function run() {
    await deleteUser('erwannfifa05@gmail.com', true);
    await deleteUser('Mathis Hannebique', false);
}

run();
