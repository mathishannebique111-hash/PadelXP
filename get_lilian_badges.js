const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, points, club_id')
    .eq('email', 'capucine@gmail.com')
    .single();
    
  if (!profile) {
    console.log("No profile found.");
    return;
  }
  
  const userId = profile.id;

  const { data: mp } = await supabase
    .from('match_participants')
    .select('match_id, team')
    .eq('user_id', userId)
    .eq('player_type', 'user');

  if (!mp || !mp.length) {
    console.log("No match participants found.");
    return;
  }

  const matchIds = mp.map(m => m.match_id);

  const { data: allMs } = await supabase
    .from('matches')
    .select('id, winner_team_id, team1_id, team2_id, score_team1, score_team2, created_at')
    .in('id', matchIds)
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false });

  if (!allMs) {
      console.log("No matches found.");
      return;
  }

  let wins = 0; let losses = 0; let setsWon = 0; let setsLost = 0;
  const byId = {};
  allMs.forEach(m => {
    byId[m.id] = { winner_team: m.winner_team_id === m.team1_id ? 1 : 2 };
  });

  const filteredMp = mp.filter(p => byId[p.match_id]);
  filteredMp.forEach(p => {
    if (byId[p.match_id].winner_team === p.team) wins++;
    else losses++;
  });

  console.log(`Lilian Stats: | Points: ${profile.points} | Matchs: ${filteredMp.length} | Victoires: ${wins} | Défaites: ${losses}`);
  console.log('Calculating badges requires importing logic from lib/badges.ts which is complex in JS, but I have the core metrics.');
}
run();
