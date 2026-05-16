import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { calculateGeoLeaderboard, getCountryFromRegion, type LeaderboardScope } from '@/lib/utils/geo-leaderboard-utils';
import { createClient as createServiceClient } from '@supabase/supabase-js';
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

    // Determine user's country for the frontend label
    let userCountry: "FR" | "BE" = "FR";
    if (scope === "national") {
      const supabaseAdmin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("region_code")
        .eq("id", user.id)
        .maybeSingle();
      userCountry = getCountryFromRegion(profile?.region_code || null);
    }

    logger.info(
      `✅ Geo leaderboard calculated (scope: ${scope}, players: ${leaderboard.length})`
    );

    return NextResponse.json({ leaderboard, scope, userCountry }, {
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
