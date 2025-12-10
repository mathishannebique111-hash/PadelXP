import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

const resetClubSchema = z.object({
  clubId: z.string().uuid().optional(),
  email: z.string().email().optional(),
});

export const dynamic = 'force-dynamic';

/**
 * Route API pour réinitialiser un club pour les tests
 * Permet de réinitialiser l'état d'abonnement et la période d'essai
 */
export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Configuration serveur manquante' },
        { status: 500 }
      );
    }

    // Vérifier l'authentification (optionnel, vous pouvez ajouter une vérification admin)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = resetClubSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Paramètres invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { clubId, email } = parsed.data;

    // Trouver le club à réinitialiser
    let targetClubId: string | null = null;

    if (clubId) {
      targetClubId = clubId;
    } else if (email) {
      // Trouver le club par email de l'admin
      const { data: clubAdmin } = await supabaseAdmin
        .from('club_admins')
        .select('club_id')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (!clubAdmin) {
        return NextResponse.json(
          { error: 'Aucun club trouvé pour cet email' },
          { status: 404 }
        );
      }

      targetClubId = clubAdmin.club_id;
    } else {
      // Si aucun paramètre, utiliser le club de l'utilisateur connecté
      const { data: clubAdmin } = await supabaseAdmin
        .from('club_admins')
        .select('club_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!clubAdmin) {
        return NextResponse.json(
          { error: 'Aucun club trouvé pour cet utilisateur' },
          { status: 404 }
        );
      }

      targetClubId = clubAdmin.club_id;
    }

    if (!targetClubId) {
      return NextResponse.json(
        { error: 'Club non trouvé' },
        { status: 404 }
      );
    }

    // Réinitialiser le club
    const now = new Date();
    const trialEndDate = new Date(now);
    trialEndDate.setDate(trialEndDate.getDate() + 14);

    const { error: updateError } = await supabaseAdmin
      .from('clubs')
      .update({
        // Réinitialiser les IDs Stripe
        stripe_customer_id: null,
        stripe_subscription_id: null,
        
        // Réinitialiser les champs d'abonnement
        selected_plan: null,
        plan_selected_at: null,
        subscription_status: 'trialing',
        subscription_started_at: null,
        
        // Réinitialiser la période d'essai (14 jours)
        trial_start_date: now.toISOString(),
        trial_end_date: trialEndDate.toISOString(),
        trial_base_end_date: trialEndDate.toISOString(),
        trial_current_end_date: trialEndDate.toISOString(),
        trial_status: 'active',
        
        // Réinitialiser les extensions
        auto_extension_unlocked: false,
        auto_extension_reason: null,
        proposed_extension_sent: false,
        proposed_extension_sent_date: null,
        proposed_extension_accepted: null,
        manual_extension_granted: false,
        manual_extension_date: null,
        manual_extension_days: null,
        manual_extension_notes: null,
        manual_extension_by_user_id: null,
        last_engagement_check_date: null,
      })
      .eq('id', targetClubId);

    if (updateError) {
      logger.error({ error: updateError, clubId: targetClubId.substring(0, 8) + "…" }, '[reset-club] Error resetting club');
      return NextResponse.json(
        { error: 'Erreur lors de la réinitialisation du club' },
        { status: 500 }
      );
    }

    // Récupérer les informations du club réinitialisé
    const { data: club } = await supabaseAdmin
      .from('clubs')
      .select('id, name, slug, trial_start_date, trial_end_date, trial_current_end_date, subscription_status')
      .eq('id', targetClubId)
      .single();

    logger.info({ 
      clubId: targetClubId.substring(0, 8) + "…",
      clubName: club?.name,
      trialEndDate: club?.trial_current_end_date
    }, '[reset-club] Club reset successfully');

    return NextResponse.json({
      success: true,
      message: 'Club réinitialisé avec succès',
      club: {
        id: club?.id,
        name: club?.name,
        slug: club?.slug,
        trialStartDate: club?.trial_start_date,
        trialEndDate: club?.trial_current_end_date,
        subscriptionStatus: club?.subscription_status,
      },
    });
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, '[reset-club] Unexpected error');

    return NextResponse.json(
      { error: 'Erreur lors de la réinitialisation du club' },
      { status: 500 }
    );
  }
}

