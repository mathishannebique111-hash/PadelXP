
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkUser() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const userId = 'b7f53b83-602e-4581-8fd6-ad31afd1774a'; // Sarah's ID from previous log

    const supabase = createClient(supabaseUrl, serviceRole);

    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, is_premium, full_name')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching user:', error);
        return;
    }

    console.log('User status:');
    console.log(JSON.stringify(data, null, 2));
}

checkUser();
