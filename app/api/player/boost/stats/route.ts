import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPlayerBoostStats, getPlayerBoostCreditsAvailable, getPlayerBoostsUsedThisMonth } from '@/lib/utils/boost-utils';
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
      console.error('[boost/stats] Unauthorized:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[boost/stats] Getting stats for user:', user.id);

    // VÉRIFICATION DIRECTE DANS LA BASE DE DONNÉES EN PREMIER (PRIORITAIRE)
    // Les boosts sont liés à user_id, pas au profil, donc on vérifie directement
    let directCheckCredits = 0;
    if (supabaseAdmin) {
      try {
        console.log('[boost/stats] ===== DIRECT DB CHECK START =====');
        console.log('[boost/stats] User ID:', user.id);
        
        const { data: creditsData, error: creditsError } = await supabaseAdmin
          .from("player_boost_credits")
          .select("id, user_id, consumed_at, created_at")
          .eq("user_id", user.id);
        
        console.log('[boost/stats] Query result - Error:', creditsError);
        console.log('[boost/stats] Query result - Data count:', creditsData?.length || 0);
        console.log('[boost/stats] Query result - Data:', JSON.stringify(creditsData, null, 2));
        
        if (!creditsError && creditsData) {
          // Filtrer les boosts disponibles (consumed_at est null ou undefined)
          const availableCredits = creditsData.filter(c => 
            c.consumed_at === null || 
            c.consumed_at === undefined || 
            c.consumed_at === ''
          );
          // Filtrer les boosts consommés (consumed_at n'est pas null/undefined/vide)
          const consumedCredits = creditsData.filter(c => 
            c.consumed_at !== null && 
            c.consumed_at !== undefined && 
            c.consumed_at !== ''
          );
          directCheckCredits = availableCredits.length;
          
          console.log('[boost/stats] Direct DB check - Total credits:', creditsData.length);
          console.log('[boost/stats] Direct DB check - Available credits:', directCheckCredits);
          console.log('[boost/stats] Direct DB check - Consumed credits:', consumedCredits.length);
          console.log('[boost/stats] Available credits details:', availableCredits.map(c => ({
            id: c.id,
            consumed_at: c.consumed_at,
            created_at: c.created_at
          })));
          console.log('[boost/stats] Consumed credits details:', consumedCredits.map(c => ({
            id: c.id,
            consumed_at: c.consumed_at,
            created_at: c.created_at
          })));
          
          // Vérification supplémentaire : vérifier tous les boosts pour debug
          console.log('[boost/stats] All credits raw data:', creditsData.map(c => ({
            id: c.id,
            user_id: c.user_id?.substring(0, 8),
            consumed_at: c.consumed_at,
            consumed_at_type: typeof c.consumed_at,
            consumed_at_null: c.consumed_at === null,
            consumed_at_undefined: c.consumed_at === undefined,
            created_at: c.created_at
          })));
        } else {
          console.error('[boost/stats] ❌ Error in direct DB check:', creditsError);
        }
        console.log('[boost/stats] ===== DIRECT DB CHECK END =====');
      } catch (error) {
        console.error('[boost/stats] ❌ Exception in direct DB check:', error);
      }
    } else {
      console.error('[boost/stats] ❌ supabaseAdmin is null - cannot do direct check');
    }

      // Si on a trouvé des boosts directement, les utiliser même sans profil
      if (directCheckCredits > 0) {
        console.log('[boost/stats] ✅ Found', directCheckCredits, 'boosts via direct check - using them');
      
      // Compter les boosts utilisés ce mois-ci
      let usedThisMonth = 0;
      if (supabaseAdmin) {
        try {
          const now = new Date();
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          const monthStartISO = monthStart.toISOString();
          
          // D'abord récupérer tous les boosts utilisés ce mois-ci pour debug
          const { data: usedBoostsData, error: usedDataError } = await supabaseAdmin
            .from("player_boost_uses")
            .select("id, user_id, match_id, applied_at, points_after_boost")
            .eq("user_id", user.id)
            .gte("applied_at", monthStartISO);

          console.log('[boost/stats] Used boosts data:', {
            count: usedBoostsData?.length || 0,
            error: usedDataError,
            data: usedBoostsData?.map(b => ({
              id: b.id?.substring(0, 8),
              match_id: b.match_id?.substring(0, 8),
              applied_at: b.applied_at,
              points_after_boost: b.points_after_boost
            })) || []
          });

          const { count: usedCount, error: usedError } = await supabaseAdmin
            .from("player_boost_uses")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .gte("applied_at", monthStartISO);

          if (!usedError) {
            usedThisMonth = usedCount || 0;
            console.log('[boost/stats] Direct used count:', usedThisMonth);
          } else {
            console.error('[boost/stats] Error counting used boosts:', usedError);
          }
        } catch (error) {
          console.error('[boost/stats] Error counting used boosts:', error);
        }
      }
      
      const remainingThisMonth = Math.max(0, MAX_BOOSTS_PER_MONTH - usedThisMonth);
      const canUse = directCheckCredits > 0 && usedThisMonth < MAX_BOOSTS_PER_MONTH;

      const response = {
        creditsAvailable: directCheckCredits,
        usedThisMonth: usedThisMonth,
        remainingThisMonth: remainingThisMonth,
        canUse: canUse,
      };

      console.log('[boost/stats] ===== RESPONSE FROM DIRECT CHECK =====');
      console.log('[boost/stats] Response:', JSON.stringify(response, null, 2));

      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }
    
    // Sinon, vérifier si l'utilisateur a un profil (les comptes club n'ont pas de profil)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    // Si l'utilisateur n'a pas de profil (compte club), retourner des stats par défaut
    if (!profile) {
      console.log('[boost/stats] No profile found for user (club account) and no boosts found');
      return NextResponse.json({
        creditsAvailable: 0,
        usedThisMonth: 0,
        remainingThisMonth: 0,
        canUse: false,
      });
    }

    // UTILISER EXACTEMENT LA MÊME FONCTION QUE LA PAGE BOOST
    console.log('[boost/stats] ===== CALLING getPlayerBoostStats =====');
    console.log('[boost/stats] Calling getPlayerBoostStats for user:', user.id);
    const stats = await getPlayerBoostStats(user.id);
    console.log('[boost/stats] Stats from getPlayerBoostStats:', JSON.stringify(stats, null, 2));
    console.log('[boost/stats] ===== getPlayerBoostStats END =====');

    // UTILISER LA VALEUR LA PLUS ÉLEVÉE ENTRE LA FONCTION ET LA VÉRIFICATION DIRECTE
    // Si la vérification directe trouve des boosts, l'utiliser en priorité
    const creditsAvailable = directCheckCredits > 0 ? directCheckCredits : (Number(stats.creditsAvailable) || 0);
    
    console.log('[boost/stats] ===== FINAL CALCULATION =====');
    console.log('[boost/stats] From getPlayerBoostStats:', stats.creditsAvailable);
    console.log('[boost/stats] From direct DB check:', directCheckCredits);
    console.log('[boost/stats] Using maximum:', creditsAvailable);
    
    // Recalculer les autres valeurs si nécessaire
    const usedThisMonth = Number(stats.usedThisMonth) || 0;
    const remainingThisMonth = Math.max(0, MAX_BOOSTS_PER_MONTH - usedThisMonth);
    const canUse = creditsAvailable > 0 && usedThisMonth < MAX_BOOSTS_PER_MONTH;

    const response = {
      creditsAvailable: creditsAvailable,
      usedThisMonth: usedThisMonth,
      remainingThisMonth: remainingThisMonth,
      canUse: canUse,
    };

    console.log('[boost/stats] ===== FINAL RESPONSE =====');
    console.log('[boost/stats] Response being sent:', JSON.stringify(response, null, 2));
    console.log('[boost/stats] creditsAvailable:', response.creditsAvailable, 'type:', typeof response.creditsAvailable);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('[boost/stats] Error:', error);
    // En cas d'erreur, retourner des stats par défaut au lieu d'une erreur HTTP
    return NextResponse.json({
      creditsAvailable: 0,
      usedThisMonth: 0,
      remainingThisMonth: 0,
      canUse: false,
    });
  }
}


