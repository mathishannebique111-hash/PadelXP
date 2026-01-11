import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { ids } = await request.json();

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'Invalid IDs array' }, { status: 400 });
        }

        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, avatar_url, niveau_padel')
            .in('id', ids);

        if (error) {
            console.error('Error fetching profiles:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ profiles: profiles || [] });
    } catch (error) {
        console.error('Error in profiles batch route:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
