const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkConstraints() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('Missing environment variables');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log('Fetching a user...');
    // Get a user to link notification to
    const { data: users, error: userError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });

    if (userError || !users.users.length) {
        console.error('Error fetching users or no users found:', userError);
        return;
    }

    const userId = users.users[0].id;
    console.log('Using user ID:', userId);

    console.log('Attempting to insert test notification with type "partnership_request"...');

    const { data, error } = await supabase
        .from('notifications')
        .insert({
            user_id: userId,
            type: 'partnership_request',
            title: 'Test Constraint',
            message: 'Testing partnership_request type support',
            data: {}
        })
        .select()
        .single();

    if (error) {
        console.error('INSERT FAILED. This likely means the CHECK constraint is blocking the new type.');
        console.error('Error details:', error);
    } else {
        console.log('INSERT SUCCESS. The notifications table accepts "partnership_request".');
        console.log('Inserted ID:', data.id);

        // Clean up
        await supabase.from('notifications').delete().eq('id', data.id);
        console.log('Cleaned up test notification.');
    }
}

checkConstraints();
