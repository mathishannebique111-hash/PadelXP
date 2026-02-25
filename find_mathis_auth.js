const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findMathisAuth() {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    console.log('--- Mathis in Auth Metadata ---');
    users.forEach(u => {
        const meta = u.user_metadata || {};
        const name = meta.display_name || meta.full_name || `${meta.first_name || ''} ${meta.last_name || ''}`.trim();
        if (name.toLowerCase().includes('mathis hannebique') || u.email?.toLowerCase().includes('mathis')) {
            console.log(`ID: ${u.id} | Email: ${u.email} | Name: ${name} | Created: ${u.created_at}`);
        }
    });
}

findMathisAuth();
