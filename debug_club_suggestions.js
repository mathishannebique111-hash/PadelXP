const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkClubSuggestions(clubId, targetUserId) {
    console.log(`Checking suggestions for club: ${clubId}`);

    // 1. Get current user profile
    const { data: targetProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

    if (!targetProfile) {
        console.error('Target user profile not found');
        return;
    }

    // 2. Get target user partner
    const { data: targetPartnership } = await supabase
        .from('player_partnerships')
        .select('*')
        .eq('status', 'accepted')
        .or(`player_id.eq.${targetUserId},partner_id.eq.${targetUserId}`)
        .maybeSingle();

    const targetPartnerId = targetPartnership?.player_id === targetUserId ? targetPartnership.partner_id : targetPartnership?.player_id;
    const { data: targetPartnerProfile } = targetPartnerId ? await supabase.from('profiles').select('*').eq('id', targetPartnerId).single() : { data: null };

    if (!targetProfile.niveau_padel || !targetPartnerProfile?.niveau_padel) {
        console.log(`Target user or partner missing level. User: ${targetProfile.niveau_padel}, Partner: ${targetPartnerProfile?.niveau_padel}`);
    }

    const userPairAvgLevel = ((targetProfile.niveau_padel || 0) + (targetPartnerProfile?.niveau_padel || 0)) / 2;

    // 3. Get all profiles in the club
    const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('club_id', clubId);

    const profilesMap = new Map(profiles?.map(p => [p.id, p]));
    const playerIds = profiles?.map(p => p.id) || [];

    // 4. Get all accepted partnerships in the club
    const { data: partnerships } = await supabase
        .from('player_partnerships')
        .select('*')
        .eq('status', 'accepted');

    console.log(`Total accepted partnerships in DB: ${partnerships?.length}`);

    let matchFound = 0;
    partnerships.forEach(p => {
        // Check if at least one is in club
        const p1 = profilesMap.get(p.player_id);
        const p2 = profilesMap.get(p.partner_id);

        // If both null (none in club), skip unless they are in the profile map from previous query
        // Wait, the previous query only got profiles FROM the club. 
        // If a pair is [Club A, Club B], p1 will be found but p2 might not.

        if (!p1 && !p2) return;

        // Get profiles even if not in club (for levels)
        // For simplicity in debug script, we'll fetch them separately if missing
    });

    // Re-fetch ALL involved profiles to be sure
    const allInvolvedIds = [...new Set(partnerships.flatMap(p => [p.player_id, p.partner_id]))];
    const { data: allProfiles } = await supabase.from('profiles').select('*').in('id', allInvolvedIds);
    const allProfilesMap = new Map(allProfiles.map(p => [p.id, p]));

    partnerships.forEach(p => {
        const prof1 = allProfilesMap.get(p.player_id);
        const prof2 = allProfilesMap.get(p.partner_id);

        if (!prof1 || !prof2) return;

        const inClub = (prof1.club_id === clubId || prof2.club_id === clubId);
        if (!inClub) return;

        if (p.id === targetPartnership?.id) return; // Skip self

        const level1 = prof1.niveau_padel;
        const level2 = prof2.niveau_padel;

        if (!level1 || !level2) {
            console.log(`Pair ${prof1.display_name} & ${prof2.display_name} EXCLUDED: Missing Level (${level1}, ${level2})`);
            return;
        }

        const pairAvgLevel = (level1 + level2) / 2;
        const levelDiff = Math.abs(userPairAvgLevel - pairAvgLevel);
        const levelScore = Math.max(0, 100 - (levelDiff * 33.3));
        const totalScore = Math.round(levelScore * 1); // Winrate ignored for debug simplicity

        console.log(`Pair: ${prof1.display_name} (${level1}) & ${prof2.display_name} (${level2}) | Score: ${totalScore}% | Diff: ${levelDiff.toFixed(2)}`);

        if (totalScore < 55) {
            console.log(`   -> WOULD BE HIDDEN (Score < 55%)`);
        } else {
            matchFound++;
        }
    });

    console.log(`\nFound ${matchFound} visible suggestions.`);
}

const args = process.argv.slice(2);
const clubId = args[0] || '50ffcad9-9fa4-44e7-b1e0-868765be76bb';
const targetUserId = args[1] || 'd7e5d8a0-7b6e-4b4e-8f9d-123456789012'; // Need a real ID from the club
checkClubSuggestions(clubId, targetUserId);
