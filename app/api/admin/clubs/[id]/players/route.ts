import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { isAdmin } from '@/lib/admin-auth';
import { createClient } from '@/lib/supabase/server';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clubId = params.id;

    // Get club email to exclude it from players list
    const { data: clubDataForEmail, error: clubEmailError } = await supabaseAdmin
      .from('clubs')
      .select('email')
      .eq('id', clubId)
      .single();

    if (clubEmailError) {
      console.error('Error fetching club email for exclusion:', clubEmailError);
    }
    const clubEmail = clubDataForEmail?.email?.toLowerCase() || null;

    // Fetch players using admin client to bypass RLS
    let playersQuery = supabaseAdmin
      .from('profiles')
      .select('id, display_name, first_name, last_name, email, avatar_url, created_at')
      .eq('club_id', clubId)
      .not('email', 'is', null);

    // Exclude club admin email if it exists
    if (clubEmail) {
      playersQuery = playersQuery.neq('email', clubEmail);
    }

    const { data: playersData, error: playersError } = await playersQuery
      .order('created_at', { ascending: false });

    if (playersError) {
      console.error('Error fetching players from API:', playersError);
      return NextResponse.json({ error: playersError.message }, { status: 500 });
    }

    return NextResponse.json({ players: playersData });
  } catch (error) {
    console.error('Unexpected error in players API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
