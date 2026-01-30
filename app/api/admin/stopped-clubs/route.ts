import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { isAdmin } from '@/lib/admin-auth';
import { logger } from '@/lib/logger';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

const GRACE_PERIOD_DAYS = 7;

/**
 * GET /api/admin/stopped-clubs
 * Récupère la liste des clubs dont la période de grâce est terminée
 * avec les statistiques du sondage des joueurs
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }

        // Vérifier que l'utilisateur est admin
        if (!isAdmin(user.email)) {
            return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
        }

        const now = new Date();

        // Calculer la date limite (aujourd'hui - 7 jours de grâce)
        // Un club est "stopped" si trial_end_date < (now - 7 jours) ET pas d'abonnement actif
        const graceLimitDate = new Date(now);
        graceLimitDate.setDate(graceLimitDate.getDate() - GRACE_PERIOD_DAYS);

        // Récupérer les clubs dont l'essai est terminé + grâce expirée + pas d'abonnement actif
        const { data: stoppedClubs, error: clubsError } = await supabaseAdmin
            .from('clubs')
            .select(`
        id,
        name,
        slug,
        trial_end_date,
        trial_current_end_date,
        subscription_status,
        created_at
      `)
            .or('subscription_status.is.null,subscription_status.neq.active')
            .order('trial_end_date', { ascending: false });

        if (clubsError) {
            logger.error('[admin/stopped-clubs] Error fetching clubs', { error: clubsError.message });
            return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
        }

        // Filtrer pour ne garder que les clubs dont la grâce est terminée
        const filteredClubs = (stoppedClubs || []).filter(club => {
            const trialEnd = club.trial_current_end_date || club.trial_end_date;
            if (!trialEnd) return false;

            const trialEndDate = new Date(trialEnd);
            const daysSinceExpiration = Math.floor((now.getTime() - trialEndDate.getTime()) / (1000 * 60 * 60 * 24));

            // Grâce terminée = plus de 7 jours après expiration
            return daysSinceExpiration > GRACE_PERIOD_DAYS;
        });

        // Pour chaque club, récupérer les stats du sondage et le nombre de joueurs
        const clubsWithStats = await Promise.all(
            filteredClubs.map(async (club) => {
                // Compter les réponses du sondage
                const { data: surveyResponses } = await supabaseAdmin
                    .from('club_stop_survey_responses')
                    .select('response')
                    .eq('club_id', club.id);

                const yesCount = (surveyResponses || []).filter(r => r.response === 'yes').length;
                const noCount = (surveyResponses || []).filter(r => r.response === 'no').length;

                // Compter le nombre total de joueurs du club
                const { count: totalPlayers } = await supabaseAdmin
                    .from('profiles')
                    .select('id', { count: 'exact', head: true })
                    .eq('club_id', club.id);

                // Calculer les jours depuis l'expiration
                const trialEnd = club.trial_current_end_date || club.trial_end_date;
                const trialEndDate = new Date(trialEnd);
                const daysSinceExpiration = Math.floor((now.getTime() - trialEndDate.getTime()) / (1000 * 60 * 60 * 24));

                return {
                    id: club.id,
                    name: club.name,
                    slug: club.slug,
                    trialEndDate: trialEnd,
                    daysSinceExpiration,
                    subscriptionStatus: club.subscription_status,
                    totalPlayers: totalPlayers || 0,
                    survey: {
                        yesCount,
                        noCount,
                        totalResponses: yesCount + noCount,
                    },
                };
            })
        );

        // Trier par nombre de jours depuis expiration (les plus récents d'abord)
        clubsWithStats.sort((a, b) => a.daysSinceExpiration - b.daysSinceExpiration);

        logger.info('[admin/stopped-clubs] Fetched stopped clubs', { count: clubsWithStats.length });

        return NextResponse.json({
            clubs: clubsWithStats,
            totalCount: clubsWithStats.length,
        });

    } catch (error) {
        logger.error('[admin/stopped-clubs] Unexpected error', { error: (error as Error).message });
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
