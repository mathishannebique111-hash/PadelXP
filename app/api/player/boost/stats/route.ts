import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPlayerBoostStats } from '@/lib/utils/boost-utils';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { MAX_BOOSTS_PER_MONTH } from '@/lib/utils/boost-utils';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.error({ hasAuthError: !!authError }, '[boost/stats] Unauthorized');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const shortUserId = user.id.substring(0, 8) + '...';
    logger.info({ userId: shortUserId }, '[boost/stats] Getting stats for user');

    let directCheckCredits = 0;

    // Vérification directe dans la base (prioritaire)
    if (supabaseAdmin) {
      try {
        logger.info({ userId: shortUserId }, '[boost/stats] Direct DB check start');

        const { data: creditsData, error: creditsError } = await supabaseAdmin
          .from('player_boost_credits')
          .select('id, consumed_at, created_at')
          .eq('user_id', user.id);

        if (creditsError) {
          logger.error({ userId: shortUserId, error: { message: creditsError.message, code: creditsError.code } }, '[boost/stats] Direct DB check error');
        }

        const totalCredits = creditsData?.length || 0;

        if (creditsData && creditsData.length > 0) {
          const availableCredits = creditsData.filter(c =>
            c.consumed_at === null ||
            c.consumed_at === undefined ||
            c.consumed_at === ''
          );
          const consumedCredits = totalCredits - availableCredits.length;
          directCheckCredits = availableCredits.length;

          logger.info({ userId: shortUserId, totalCredits, availableCredits: availableCredits.length, consumedCredits }, '[boost/stats] Direct DB check summary');
        } else {
          logger.info({ userId: shortUserId }, '[boost/stats] Direct DB check: no credits found');
        }

        logger.info({ userId: shortUserId, directCheckCredits }, '[boost/stats] Direct DB check end');
      } catch (error) {
        logger.error({ userId: shortUserId, error: error instanceof Error ? error.message : String(error) }, '[boost/stats] Exception in direct DB check');
      }
    } else {
      logger.error({}, '[boost/stats] supabaseAdmin is null - cannot do direct check');
    }

    // Si on a trouvé des boosts directement, les utiliser même sans profil
    if (directCheckCredits > 0) {
      logger.info({ userId: shortUserId, credits: directCheckCredits }, '[boost/stats] Using credits from direct check');

      let usedThisMonth = 0;

      if (supabaseAdmin) {
        try {
          const now = new Date();
          const monthStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            1,
            0,
            0,
            0,
            0
          );
          const monthStartISO = monthStart.toISOString();

          const { count: usedCount, error: usedError } = await supabaseAdmin
            .from('player_boost_uses')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('applied_at', monthStartISO);

          if (!usedError) {
            usedThisMonth = usedCount || 0;
            logger.info({ userId: shortUserId, usedThisMonth }, '[boost/stats] Direct used count');
          } else {
            logger.error({ userId: shortUserId, error: { message: usedError.message, code: usedError.code } }, '[boost/stats] Error counting used boosts');
          }
        } catch (error) {
          logger.error({ userId: shortUserId, error: error instanceof Error ? error.message : String(error) }, '[boost/stats] Exception counting used boosts');
        }
      }

      const remainingThisMonth = Math.max(0, MAX_BOOSTS_PER_MONTH - usedThisMonth);
      const canUse = directCheckCredits > 0 && usedThisMonth < MAX_BOOSTS_PER_MONTH;

      const response = {
        creditsAvailable: directCheckCredits,
        usedThisMonth,
        remainingThisMonth,
        canUse,
      };

      logger.info({ userId: shortUserId, ...response }, '[boost/stats] Response from direct check');

      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
    }

    // Sinon, vérifier si l'utilisateur a un profil (les comptes club n'ont pas de profil)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      logger.info({ userId: shortUserId }, '[boost/stats] No profile found for user (club account) and no boosts found');
      return NextResponse.json({
        creditsAvailable: 0,
        usedThisMonth: 0,
        remainingThisMonth: 0,
        canUse: false,
      });
    }

    // Utiliser la fonction partagée
    logger.info({ userId: shortUserId }, '[boost/stats] Calling getPlayerBoostStats');
    const stats = await getPlayerBoostStats(user.id);
    logger.info({ userId: shortUserId, creditsAvailable: stats.creditsAvailable, usedThisMonth: stats.usedThisMonth }, '[boost/stats] Stats from getPlayerBoostStats');

    const creditsAvailable =
      directCheckCredits > 0
        ? directCheckCredits
        : Number(stats.creditsAvailable) || 0;

    const usedThisMonth = Number(stats.usedThisMonth) || 0;
    const remainingThisMonth = Math.max(0, MAX_BOOSTS_PER_MONTH - usedThisMonth);
    const canUse = creditsAvailable > 0 && usedThisMonth < MAX_BOOSTS_PER_MONTH;

    const response = {
      creditsAvailable,
      usedThisMonth,
      remainingThisMonth,
      canUse,
    };

    logger.info({ userId: shortUserId, ...response }, '[boost/stats] Final response');

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, '[boost/stats] Error in handler');
    return NextResponse.json({
      creditsAvailable: 0,
      usedThisMonth: 0,
      remainingThisMonth: 0,
      canUse: false,
    });
  }
}
