import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { calculatePlayerLeaderboard } from '@/lib/utils/player-leaderboard-utils';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    logger.info({}, '🔍 Fetching full leaderboard');
    
    // Récupérer le club_id de l'utilisateur authentifié
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("club_id")
      .eq("id", user.id)
      .maybeSingle();
    
    const userClubId = userProfile?.club_id || null;
    // NE PLUS bloquer si pas de club_id - retourner un leaderboard vide au lieu de 403
    // Cela permet aux nouveaux joueurs d'accéder à l'interface même sans club_id
    if (!userClubId) {
      logger.info({ userId: user.id.substring(0, 8) + "…" }, 'ℹ️ User without club fetching leaderboard - returning empty array');
      return NextResponse.json({ leaderboard: [] }, { status: 200 });
    }

    // Utiliser calculatePlayerLeaderboard pour garantir la cohérence avec PlayerSummary et la page /home
    // Cette fonction utilise exactement la même logique que PlayerSummary (calculatePointsWithBoosts via calculatePointsForMultiplePlayers)
    const leaderboard = await calculatePlayerLeaderboard(userClubId);

    logger.info({ userId: user.id.substring(0, 8) + "…", clubId: userClubId.substring(0, 8) + "…", playersCount: leaderboard.length }, '✅ Leaderboard calculated');

    // Désactiver le cache pour garantir des données à jour
    return NextResponse.json({ leaderboard }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    logger.error({ error }, '❌ Unexpected error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
