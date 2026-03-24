const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const userId = 'd196d41b-bbd8-4270-837c-eeb7f8dc4804';
  const badgeCode = 'FirstWin';
  
  const { data, error } = await supabase
    .from('earned_badges')
    .upsert(
      { user_id: userId, badge_code: badgeCode, earned_at: new Date().toISOString() },
      { onConflict: 'user_id, badge_code' }
    )
    .select();
    
  console.log(JSON.stringify({data, error}, null, 2));
}

run();
