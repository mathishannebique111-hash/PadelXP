import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPlayerBoostStats } from '@/lib/utils/boost-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[boost/stats] Unauthorized:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const stats = await getPlayerBoostStats(user.id);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[boost/stats] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


