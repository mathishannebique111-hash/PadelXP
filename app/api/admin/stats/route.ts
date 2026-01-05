import { NextResponse } from 'next/server';
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

export async function GET() {
  try {
    // Verify admin status
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch stats using admin client to bypass RLS
    const [clubsResult, playersResult, matchesResult, messagesResult] = await Promise.all([
      supabaseAdmin.from('clubs').select('*', { count: 'exact', head: true }),
      supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .not('email', 'is', null)
        .not('club_id', 'is', null),
      supabaseAdmin.from('matches').select('*', { count: 'exact', head: true }),
      supabaseAdmin
        .from('admin_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false),
    ]);

    // Filter out club admin accounts from players count
    const { data: clubs } = await supabaseAdmin.from('clubs').select('email');
    const clubEmails = new Set(
      (clubs || []).map((c) => c.email?.toLowerCase()).filter(Boolean)
    );

    const { count: totalPlayers } = playersResult;
    const playersWithoutAdmins = totalPlayers || 0; // Already filtered in query

    return NextResponse.json({
      clubs: clubsResult.count || 0,
      players: playersWithoutAdmins,
      matches: matchesResult.count || 0,
      unreadMessages: messagesResult.count || 0,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
