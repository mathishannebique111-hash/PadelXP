import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPlayerBoostStats } from '@/lib/utils/boost-utils';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { MAX_BOOSTS_PER_MONTH } from '@/lib/utils/boost-utils';

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
      console.error('[boost/stats] Unauthorized', { hasAuthError: !!authError });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const shortUserId = user.id.substring(0, 8) + '...';
    console.log('[boost/stats] Getting stats for user', { userId: shortUserId });

    let directCheckCredits = 0;

    // Vérification directe dans la base (prioritaire)
    if (supabaseAdmin) {
      try {
        console.log('[boost/stats] Direct DB check start', { userId: shortUserId });

        const { data: creditsData, error: creditsError } = await supabaseAdmin
          .from('player_boost_credits')
          .select('id, consumed_at, created_at')
          .eq('user_id', user.id);

        if (creditsError) {
          console.error('[boost/stats] Direct DB check error', {
            userId: shortUserId,
            message: creditsError.message,
            code: creditsError.code,
          });
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

          console.log('[boost/stats] Direct DB check summary', {
            userId: shortUserId,
            totalCredits,
            availableCredits: availableCredits.length,
            consumedCredits,
          });
        } else {
          console.log('[boost/stats] Direct DB check: no credits found', {
            userId: shortUserId,
          });
        }

        console.log('[boost/stats] Direct DB check end', {
          userId: shortUserId,
          directCheckCredits,
        });
      } catch (error) {
        console.error('[boost/stats] Exception in direct DB check', {
          userId: shortUserId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      console.error('[boost/stats] supabaseAdmin is null - cannot do direct check');
    }

    // Si on a trouvé des boosts directement, les utiliser même sans profil
    if (directCheckCredits > 0) {
      console.log('[boost/stats] Using credits from direct check', {
        userId: shortUserId,
        credits: directCheckCredits,
      });

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
            console.log('[boost/stats] Direct used count', {
              userId: shortUserId,
              usedThisMonth,
            });
          } else {
            console.error('[boost/stats] Error counting used boosts', {
              userId: shortUserId,
              message: usedError.message,
              code: usedError.code,
            });
          }
        } catch (error) {
          console.error('[boost/stats] Exception counting used boosts', {
            userId: shortUserId,
            error: error instanceof Error ? error.message : String(error),
          });
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

      console.log('[boost/stats] Response from direct check', {
        userId: shortUserId,
        ...response,
      });

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
      console.log('[boost/stats] No profile found for user (club account) and no boosts found', {
        userId: shortUserId,
      });
      return NextResponse.json({
        creditsAvailable: 0,
        usedThisMonth: 0,
        remainingThisMonth: 0,
        canUse: false,
      });
    }

    // Utiliser la fonction partagée
    console.log('[boost/stats] Calling getPlayerBoostStats', { userId: shortUserId });
    const stats = await getPlayerBoostStats(user.id);
    console.log('[boost/stats] Stats from getPlayerBoostStats', {
      userId: shortUserId,
      creditsAvailable: stats.creditsAvailable,
      usedThisMonth: stats.usedThisMonth,
    });

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

    console.log('[boost/stats] Final response', {
      userId: shortUserId,
      ...response,
    });

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('[boost/stats] Error in handler', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({
      creditsAvailable: 0,
      usedThisMonth: 0,
      remainingThisMonth: 0,
      canUse: false,
    });
  }
}
