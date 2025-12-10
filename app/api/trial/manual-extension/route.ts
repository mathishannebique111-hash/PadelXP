import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { grantManualExtension } from '@/lib/trial-hybrid';
import { logger } from '@/lib/logger';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

export const dynamic = 'force-dynamic';

const manualExtensionSchema = z.object({
  clubId: z.string().uuid(),
  days: z.number().int().min(1).max(365),
  notes: z.string().max(1000).nullable().optional(),
});

/**
 * Route pour accorder une extension manuelle (admin uniquement)
 */
export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 });
    }

    // Vérifier l'authentification
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // TODO: Vérifier que l'utilisateur est admin
    // Pour l'instant, on autorise tous les utilisateurs authentifiés
    // const isAdmin = await checkIsAdmin(user.id);
    // if (!isAdmin) {
    //   return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    // }

    // Valider le body
    const body = await req.json();
    const parsed = manualExtensionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { clubId, days, notes } = parsed.data;

    // Vérifier que le club existe
    const { data: club } = await supabaseAdmin
      .from('clubs')
      .select('id')
      .eq('id', clubId)
      .single();

    if (!club) {
      return NextResponse.json({ error: 'Club non trouvé' }, { status: 404 });
    }

    // Accorder l'extension
    const result = await grantManualExtension(clubId, days, notes || null, user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Erreur lors de l\'extension' }, { status: 500 });
    }

    logger.info({ clubId: clubId.substring(0, 8) + '…', days, adminId: user.id.substring(0, 8) + '…' }, '[trial/manual-extension] Manual extension granted');

    return NextResponse.json({
      success: true,
      message: `Extension de ${days} jours accordée avec succès`,
    });
  } catch (error) {
    logger.error({ error }, '[trial/manual-extension] Unexpected error');
    return NextResponse.json({ error: 'Erreur inattendue' }, { status: 500 });
  }
}

