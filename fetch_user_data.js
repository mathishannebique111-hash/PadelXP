const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: userAuth, error: authError } = await supabase.auth.admin?.listUsers() || {};
  
  // if no admin access, let's just query profiles table directly if we know email is linked
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*, stats(*), match_participants(*, matches(*))')
    .eq('email', 'capucine@gmail.com')
    .single();
    
  if (error) {
     const { data: profile2, error2 } = await supabase
        .from('profiles')
        .select('*')
        // let's search by name
        .ilike('first_name', 'Lilian')
        .ilike('last_name', 'Richard');
     console.log('Search by name:', profile2);
  } else {
     console.log('Profile:', profile);
  }
}
run();
