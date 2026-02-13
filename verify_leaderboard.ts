import { calculateGeoLeaderboard } from './lib/utils/geo-leaderboard-utils';
import { logger } from './lib/logger';

async function verifyLeaderboard() {
    // We need a valid user ID to start with, let's try to find one or just use a dummy one
    // to search "national" scope which doesn't depend on the user's geo location as much
    const scope = 'national';
    const dummyUserId = '00000000-0000-0000-0000-000000000000'; // Should work for national scope

    console.log(`Checking leaderboard for scope: ${scope}...`);
    const leaderboard = await calculateGeoLeaderboard(dummyUserId, scope);

    console.log(`Total players in leaderboard: ${leaderboard.length}`);

    // Check for orphans if we can access auth
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { createClient } = require('@supabase/supabase-js');
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    console.log('Checking for orphan profiles...');
    const { data: profiles } = await supabaseAdmin.from('profiles').select('id, email, display_name');

    // We can't easily fetch all auth users to compare via the JS client without pagination,
    // but we can try to find users that don't exist by attempting to get them one by one
    // or just trust that if they are in 'profiles' with a valid email (as the leaderboard filters), they are intended to be there.

    // Better way: Check if any profiles in the leaderboard have NO email? 
    // Wait, the leaderboard already filters: .not("email", "is", null)

    leaderboard.slice(0, 10).forEach(player => {
        console.log(`Rank ${player.rank}: ${player.player_name} (ID: ${player.user_id}, Points: ${player.points})`);
    });

    console.log('\n--- Profiles missing email (would be hidden from leaderboard) ---');
    const { data: missingEmail } = await supabaseAdmin.from('profiles').select('id, display_name').is('email', null);
    console.log(`Found ${missingEmail?.length || 0} profiles without email.`);
}

verifyLeaderboard().catch(err => {
    console.error('Verification failed:', err);
});
