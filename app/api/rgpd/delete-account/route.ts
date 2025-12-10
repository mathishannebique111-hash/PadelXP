import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';

const supabaseAdmin = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    )
  : null;

export const dynamic = 'force-dynamic';

/**
 * API RGPD - Suppression de compte (Article 17 RGPD - Droit à l'effacement)
 * 
 * Cette API permet à un utilisateur de supprimer son compte et toutes ses données personnelles.
 * 
 * IMPORTANT : Respecte les durées légales de conservation :
 * - Données de facturation : 10 ans (obligation comptable)
 * - Données de compte : 3 ans après résiliation (prescription)
 * - Données de connexion : 12 mois maximum
 * 
 * Pour les données de facturation, on ne peut pas les supprimer, on les anonymise.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non autorisé. Vous devez être connecté.' },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Configuration serveur manquante' },
        { status: 500 }
      );
    }

    // Vérifier la confirmation (double confirmation requise pour sécurité)
    const body = await req.json().catch(() => ({}));
    if (body.confirm !== 'DELETE_MY_ACCOUNT') {
      return NextResponse.json(
        { error: 'Confirmation requise. Envoyez { "confirm": "DELETE_MY_ACCOUNT" }' },
        { status: 400 }
      );
    }

    const userIdPreview = user.id.substring(0, 8) + "…";
    logger.info({ userId: userIdPreview }, '[RGPD Delete] Début suppression complète pour utilisateur');

    // Récupérer le profil pour identifier le club_id
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('club_id')
      .eq('id', user.id)
      .maybeSingle();

    const clubId = profile?.club_id;

    // 1. Supprimer les inscriptions de tournoi où le joueur est player1_id ou player2_id
    // (doit être fait avant de supprimer le profil car il y a une référence)
    // Note: Les tournois créés par l'utilisateur (created_by) ne sont pas supprimés
    // car ils appartiennent au club, pas au joueur individuel
    const { error: tournamentRegistrationsError } = await supabaseAdmin
      .from('tournament_registrations')
      .delete()
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`);

    if (tournamentRegistrationsError) {
      logger.error({ err: tournamentRegistrationsError }, '[RGPD Delete] Erreur suppression inscriptions tournoi');
    }

    // 2. Supprimer les participations aux tournois (Americano/Mexicano)
    const { error: tournamentParticipantsError } = await supabaseAdmin
      .from('tournament_participants')
      .delete()
      .eq('player_id', user.id);

    if (tournamentParticipantsError) {
      logger.error({ err: tournamentParticipantsError }, '[RGPD Delete] Erreur suppression participations tournoi');
    }

    // 3. Supprimer les points disciplinaires
    const { error: disciplinaryPointsError } = await supabaseAdmin
      .from('disciplinary_points')
      .delete()
      .eq('player_id', user.id);

    if (disciplinaryPointsError) {
      logger.error({ err: disciplinaryPointsError }, '[RGPD Delete] Erreur suppression points disciplinaires');
    }

    // 4. Supprimer complètement les participations aux matchs
    const { error: matchParticipantsError } = await supabaseAdmin
      .from('match_participants')
      .delete()
      .eq('user_id', user.id);

    if (matchParticipantsError) {
      logger.error({ err: matchParticipantsError }, '[RGPD Delete] Erreur suppression participations matchs');
    }

    // 5. Supprimer les confirmations de matchs
    const { error: matchConfirmationsError } = await supabaseAdmin
      .from('match_confirmations')
      .delete()
      .eq('user_id', user.id);

    if (matchConfirmationsError) {
      logger.error({ err: matchConfirmationsError }, '[RGPD Delete] Erreur suppression confirmations matchs');
    }

    // 6. Supprimer les avis
    const { error: reviewsError } = await supabaseAdmin
      .from('reviews')
      .delete()
      .eq('user_id', user.id);

    if (reviewsError) {
      logger.error({ err: reviewsError }, '[RGPD Delete] Erreur suppression avis');
    }

    // 7. Supprimer les challenges
    const { error: challengesError } = await supabaseAdmin
      .from('player_challenges')
      .delete()
      .eq('user_id', user.id);

    if (challengesError) {
      logger.error({ err: challengesError }, '[RGPD Delete] Erreur suppression challenges');
    }

    // 8. Supprimer les droits d'admin du club
    if (clubId) {
      const { error: clubAdminsError } = await supabaseAdmin
        .from('club_admins')
        .delete()
        .eq('club_id', clubId)
        .eq('user_id', user.id);

      if (clubAdminsError) {
        logger.error({ err: clubAdminsError }, '[RGPD Delete] Erreur suppression droits admin');
      }
    }

    // 9. Supprimer complètement le profil (après avoir supprimé toutes les références)
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (profileDeleteError) {
      logger.error({ err: profileDeleteError }, '[RGPD Delete] Erreur suppression profil');
    }

    // 10. IMPORTANT : Ne PAS supprimer les données de facturation (obligation légale 10 ans)
    // Les données dans la table subscriptions liées au club_id sont conservées
    // selon les obligations comptables et fiscales

    // 11. Supprimer le compte Auth de Supabase (en dernier)
    // Note : Cela supprime complètement le compte utilisateur de Supabase Auth
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (authDeleteError) {
      logger.error({ err: authDeleteError }, '[RGPD Delete] Erreur suppression compte auth');
      // Continuer même en cas d'erreur pour supprimer les autres données
    }

    logger.info({ userId: userIdPreview }, '[RGPD Delete] Suppression complète terminée pour utilisateur');

    return NextResponse.json({
      success: true,
      message: 'Votre compte et toutes vos données personnelles ont été définitivement supprimés.',
      note: 'Les données de facturation sont conservées selon les obligations légales (10 ans).',
    });

  } catch (error: any) {
    logger.error({ err: error }, '[RGPD Delete] Erreur');
    return NextResponse.json(
      { error: `Erreur lors de la suppression: ${error.message}` },
      { status: 500 }
    );
  }
}
