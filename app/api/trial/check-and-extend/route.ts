import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { updateEngagementMetrics, checkAutoExtensionEligibility, grantAutoExtension } from "@/lib/trial-hybrid";
import { revalidatePath } from "next/cache";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

/**
 * Route API pour vérifier et déclencher l'extension automatique pour un club spécifique
 * 
 * POST /api/trial/check-and-extend
 * Body: { "clubId": "uuid-du-club" }
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.SUBSCRIPTION_CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Configuration Supabase manquante" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { clubId } = body;

    if (!clubId || typeof clubId !== 'string') {
      return NextResponse.json(
        { error: "clubId requis (UUID)" },
        { status: 400 }
      );
    }

    // Vérifier que le club existe et n'a pas déjà l'extension débloquée
    const { data: club, error: clubError } = await supabaseAdmin
      .from('clubs')
      .select('id, auto_extension_unlocked, trial_current_end_date')
      .eq('id', clubId)
      .single();

    if (clubError || !club) {
      logger.error({ clubId: clubId.substring(0, 8) + '…', error: clubError }, '[trial/check-and-extend] Error fetching club');
      return NextResponse.json(
        { error: "Club introuvable" },
        { status: 404 }
      );
    }

    if (club.auto_extension_unlocked) {
      return NextResponse.json({
        success: true,
        alreadyExtended: true,
        message: "Extension déjà débloquée"
      });
    }

    if (!club.trial_current_end_date) {
      return NextResponse.json(
        { error: "Le club n'a pas de période d'essai active" },
        { status: 400 }
      );
    }

    // Recalculer les métriques et vérifier l'éligibilité
    logger.info({ clubId: clubId.substring(0, 8) + '…' }, '[trial/check-and-extend] Checking eligibility');
    await updateEngagementMetrics(clubId);
    const eligibility = await checkAutoExtensionEligibility(clubId);

    if (!eligibility.eligible || !eligibility.reason) {
      return NextResponse.json({
        success: true,
        extended: false,
        message: "Seuils non atteints",
        metrics: eligibility.metrics
      });
    }

    // Accorder l'extension
    logger.info({ clubId: clubId.substring(0, 8) + '…', reason: eligibility.reason }, '[trial/check-and-extend] Granting extension');
    const grantResult = await grantAutoExtension(clubId, eligibility.reason);

    if (!grantResult.success) {
      logger.error({ clubId: clubId.substring(0, 8) + '…', error: grantResult.error }, '[trial/check-and-extend] Extension grant failed');
      return NextResponse.json(
        { error: grantResult.error || "Erreur lors de l'extension" },
        { status: 500 }
      );
    }

    // Rafraîchir les pages frontend
    try {
      revalidatePath('/dashboard');
      revalidatePath('/dashboard/facturation');
      revalidatePath('/dashboard/page');
      logger.info({ clubId: clubId.substring(0, 8) + '…' }, '[trial/check-and-extend] Frontend pages revalidated');
    } catch (revalidateError) {
      logger.warn({ clubId: clubId.substring(0, 8) + '…', error: (revalidateError as Error).message }, '[trial/check-and-extend] Error revalidating pages');
    }

    return NextResponse.json({
      success: true,
      extended: true,
      reason: eligibility.reason,
      message: "Extension automatique accordée avec succès"
    });
  } catch (error: any) {
    logger.error({ error: error?.message || String(error) }, '[trial/check-and-extend] Unexpected error');
    return NextResponse.json(
      { error: `Erreur inattendue: ${error?.message || String(error)}` },
      { status: 500 }
    );
  }
}

