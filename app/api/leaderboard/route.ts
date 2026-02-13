import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { calculateGeoLeaderboard, type LeaderboardScope } from '@/lib/utils/geo-leaderboard-utils';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Parse scope from query params
    const { searchParams } = new URL(request.url);
    const scopeParam = searchParams.get('scope') || 'department';
    const scope: LeaderboardScope = ['club', 'department', 'region', 'national'].includes(scopeParam)
      ? (scopeParam as LeaderboardScope)
      : 'department';

    logger.info(`🔍 Fetching geo leaderboard (scope: ${scope})`);

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leaderboard = await calculateGeoLeaderboard(user.id, scope);

    logger.info(
      `✅ Geo leaderboard calculated (scope: ${scope}, players: ${leaderboard.length})`
    );

    return NextResponse.json({ leaderboard, scope }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    logger.error('❌ Unexpected error in geo leaderboard');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
