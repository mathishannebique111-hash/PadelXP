const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .ilike('first_name', '%Lilian%')
    .ilike('last_name', '%Richard%')
    .single();
    
  if (profile) {
    console.log("Found Profile:", profile.id, profile.first_name, profile.last_name, profile.points, profile.email);
    
    // Get matches
    const { data: mp } = await supabase
      .from('match_participants')
      .select('match_id, team')
      .eq('user_id', profile.id)
      .eq('player_type', 'user');

    console.log("Total MP:", mp?.length || 0);
  } else {
    console.log("No Lilian Richard found.");
  }
}
run();
