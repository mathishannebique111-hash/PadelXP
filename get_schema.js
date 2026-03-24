const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase
    .from('earned_badges')
    .select('*, badges(*)');
    
  console.log(JSON.stringify({data: data?.slice(0, 1), error}, null, 2));
}

run();
