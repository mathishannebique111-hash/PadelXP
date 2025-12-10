import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserClubInfo } from '@/lib/utils/club-utils';
import { acceptProposedExtension } from '@/lib/trial-hybrid';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Route pour accepter l'extension proposée (+15 jours)
 */
export async function POST(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer le club de l'utilisateur
    const { clubId } = await getUserClubInfo();
    if (!clubId) {
      return NextResponse.json({ error: 'Club non trouvé' }, { status: 404 });
    }

    // Accepter l'extension
    const result = await acceptProposedExtension(clubId);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Erreur lors de l\'acceptation' }, { status: 500 });
    }

    logger.info({ clubId: clubId.substring(0, 8) + '…' }, '[trial/accept-proposed] Extension accepted');

    return NextResponse.json({
      success: true,
      message: 'Extension de 15 jours accordée avec succès',
    });
  } catch (error) {
    logger.error({ error }, '[trial/accept-proposed] Unexpected error');
    return NextResponse.json({ error: 'Erreur inattendue' }, { status: 500 });
  }
}

