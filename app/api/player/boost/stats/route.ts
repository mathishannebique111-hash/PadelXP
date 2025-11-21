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

    // Vérifier si l'utilisateur a un profil (les comptes club n'ont pas de profil)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    // Si l'utilisateur n'a pas de profil (compte club), retourner des stats par défaut
    if (!profile) {
      return NextResponse.json({
        creditsAvailable: 0,
        usedThisMonth: 0,
        remainingThisMonth: 0,
        canUse: false,
      });
    }

    const stats = await getPlayerBoostStats(user.id);

    return NextResponse.json(stats);
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


