const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkClub() {
  const { data, error } = await supabase
    .from('clubs')
    .select('id, name, subdomain, slug, logo_url')
    .or('subdomain.eq.bluepadel,slug.eq.bluepadel90000');
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(JSON.stringify(data, null, 2));
}

checkClub();
