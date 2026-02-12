
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function repairUsers() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // List of known affected users (from our research)
    const affectedUsers = [
        { id: 'b7f53b83-602e-4581-8fd6-ad31afd1774a', email: 'sarah@gmail.com' }
    ];

    const supabase = createClient(supabaseUrl, serviceRole);

    console.log(`Repairing ${affectedUsers.length} users...`);

    for (const user of affectedUsers) {
        console.log(`- Repairing ${user.email} (${user.id})...`);
        const { error } = await supabase
            .from('profiles')
            .update({ is_premium: true })
            .eq('id', user.id);

        if (error) {
            console.error(`  ❌ Error:`, error);
        } else {
            console.log(`  ✅ Success`);
        }
    }
}

repairUsers();
