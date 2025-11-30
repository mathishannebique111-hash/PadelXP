import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
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
 * API RGPD - Export des données personnelles (Article 20 RGPD - Droit à la portabilité)
 * 
 * Cette API permet à un utilisateur d'exporter toutes ses données personnelles
 * dans un format structuré (JSON).
 */
export async function GET(req: NextRequest) {
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

    const userIdPreview = user.id.substring(0, 8) + "…";
    logger.info({ userId: userIdPreview }, '[RGPD Export] Début export pour utilisateur');

    // Récupérer toutes les données de l'utilisateur
    const userData: any = {
      exportDate: new Date().toISOString(),
      userId: user.id,
      email: user.email,
    };

    // 1. Profil utilisateur
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    
    if (profileError) {
      logger.error({ err: profileError }, '[RGPD Export] Erreur récupération profil');
    } else {
      userData.profile = profile;
    }

    // 2. Données du club (si admin du club)
    if (profile?.club_id) {
      const { data: clubAdmins } = await supabaseAdmin
        .from('club_admins')
        .select('*')
        .eq('club_id', profile.club_id)
        .eq('user_id', user.id);
      
      userData.clubAdmin = clubAdmins?.[0] || null;

      if (clubAdmins && clubAdmins.length > 0) {
        const { data: club } = await supabaseAdmin
          .from('clubs')
          .select('*')
          .eq('id', profile.club_id)
          .maybeSingle();
        userData.club = club;
      }
    }

    // 3. Abonnement
    if (profile?.club_id) {
      const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('club_id', profile.club_id)
        .maybeSingle();
      userData.subscription = subscription;
    }

    // 4. Historique des matchs (match_participants)
    const { data: matchParticipants } = await supabaseAdmin
      .from('match_participants')
      .select('*')
      .eq('user_id', user.id);
    userData.matchParticipants = matchParticipants || [];

    // 5. Matchs où l'utilisateur a participé (détails)
    if (matchParticipants && matchParticipants.length > 0) {
      const matchIds = matchParticipants.map(mp => mp.match_id);
      const { data: matches } = await supabaseAdmin
        .from('matches')
        .select('*')
        .in('id', matchIds);
      userData.matches = matches || [];
    }

    // 6. Confirmations de matchs
    const { data: confirmations } = await supabaseAdmin
      .from('match_confirmations')
      .select('*')
      .eq('user_id', user.id);
    userData.matchConfirmations = confirmations || [];

    // 7. Reviews/avis
    const { data: reviews } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('user_id', user.id);
    userData.reviews = reviews || [];

    // 8. Challenges et récompenses
    const { data: playerChallenges } = await supabaseAdmin
      .from('player_challenges')
      .select('*')
      .eq('user_id', user.id);
    userData.challenges = playerChallenges || [];

    // 9. Badges (si une table badges existe)
    // À adapter selon votre schéma de badges

    // Retourner les données en JSON
    return NextResponse.json(userData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="padelxp-export-${user.id}-${Date.now()}.json"`,
      },
    });

  } catch (error: any) {
    logger.error({ err: error }, '[RGPD Export] Erreur');
    return NextResponse.json(
      { error: `Erreur lors de l'export: ${error.message}` },
      { status: 500 }
    );
  }
}
