import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

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
    const supabase = createClient();
    
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
    console.log('[RGPD Delete] Début suppression pour utilisateur:', userIdPreview);
    
    // Récupérer le profil pour identifier le club_id
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('club_id')
      .eq('id', user.id)
      .maybeSingle();

    const clubId = profile?.club_id;

    // 1. Supprimer/anonymiser les données personnelles du profil
    // On anonymise plutôt que supprimer pour garder l'intégrité référentielle
    const randomId = randomUUID();
    const anonymizedEmail = `deleted-${randomId}@deleted.local`;
    const anonymizedName = 'Utilisateur supprimé';

    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        display_name: anonymizedName,
        first_name: null,
        last_name: null,
        email: anonymizedEmail,
        avatar_url: null,
        // On garde club_id pour l'intégrité des données du club
      })
      .eq('id', user.id);

    if (profileUpdateError) {
      console.error('[RGPD Delete] Erreur anonymisation profil:', profileUpdateError);
    }

    // 2. Supprimer les participations aux matchs (mais garder les matchs pour l'intégrité)
    // On anonymise les participations
    const { error: matchParticipantsError } = await supabaseAdmin
      .from('match_participants')
      .update({
        user_id: null, // Ou garder pour l'historique mais anonymiser
      })
      .eq('user_id', user.id);

    if (matchParticipantsError) {
      console.error('[RGPD Delete] Erreur suppression participations:', matchParticipantsError);
    }

    // 3. Supprimer les confirmations de matchs
    await supabaseAdmin
      .from('match_confirmations')
      .delete()
      .eq('user_id', user.id);

    // 4. Supprimer les avis
    await supabaseAdmin
      .from('reviews')
      .delete()
      .eq('user_id', user.id);

    // 5. Supprimer les challenges
    await supabaseAdmin
      .from('player_challenges')
      .delete()
      .eq('user_id', user.id);

    // 6. Gérer les droits d'admin du club
    if (clubId) {
      // Supprimer les droits d'admin si l'utilisateur n'est plus membre
      await supabaseAdmin
        .from('club_admins')
        .delete()
        .eq('club_id', clubId)
        .eq('user_id', user.id);
    }

    // 7. IMPORTANT : Ne PAS supprimer les données de facturation (obligation 10 ans)
    // On les anonymise seulement si nécessaire
    // Les données dans la table subscriptions liées au club_id sont conservées

    // 8. Supprimer le compte Auth de Supabase
    // Note : Cela supprime complètement le compte utilisateur
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (authDeleteError) {
      console.error('[RGPD Delete] Erreur suppression compte auth:', authDeleteError);
      // Continuer même en cas d'erreur pour supprimer les autres données
    }

    console.log('[RGPD Delete] Suppression terminée pour utilisateur:', userIdPreview);

    return NextResponse.json({
      success: true,
      message: 'Votre compte et vos données personnelles ont été supprimés.',
      note: 'Les données de facturation sont conservées selon les obligations légales (10 ans).',
    });

  } catch (error: any) {
    console.error('[RGPD Delete] Erreur:', error);
    return NextResponse.json(
      { error: `Erreur lors de la suppression: ${error.message}` },
      { status: 500 }
    );
  }
}

