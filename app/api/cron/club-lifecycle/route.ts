import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// Force dynamic pour éviter le cache
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * Combined cron job for club lifecycle management:
 * 1. Suspend clubs after 48h grace period
 * 2. Delete suspended club data after 45 days
 * Should be run daily
 */
export async function GET() {
    const results = {
        suspended: { count: 0, clubs: [] as string[] },
        deleted: { count: 0, clubs: [] as string[], errors: [] as { clubId: string; error: string }[] },
    };

    try {
        // =============================================
        // PART 1: SUSPEND EXPIRED CLUBS (48h grace)
        // =============================================
        const cutoffTime = new Date();
        cutoffTime.setHours(cutoffTime.getHours() - 48);

        const { data: clubsToSuspend, error: fetchSuspendError } = await supabaseAdmin
            .from('clubs')
            .select('id, name, trial_current_end_date, trial_end_date')
            .eq('is_suspended', false)
            .or('subscription_status.is.null,subscription_status.neq.active')
            .not('trial_current_end_date', 'is', null);

        if (fetchSuspendError) {
            logger.error({ error: fetchSuspendError }, '[club-lifecycle] Error fetching clubs to suspend');
        } else {
            for (const club of clubsToSuspend || []) {
                const trialEndDate = new Date(club.trial_current_end_date || club.trial_end_date);

                if (trialEndDate < cutoffTime) {
                    const scheduledDeletionAt = new Date();
                    scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + 45);

                    const { error: updateError } = await supabaseAdmin
                        .from('clubs')
                        .update({
                            is_suspended: true,
                            suspended_at: new Date().toISOString(),
                            scheduled_deletion_at: scheduledDeletionAt.toISOString(),
                        })
                        .eq('id', club.id);

                    if (!updateError) {
                        results.suspended.clubs.push(club.id);
                        results.suspended.count++;
                        logger.info({ clubId: club.id, clubName: club.name }, '[club-lifecycle] Club suspended');
                    }
                }
            }
        }

        // =============================================
        // PART 2: DELETE SUSPENDED CLUBS (45 days)
        // =============================================
        const now = new Date();

        const { data: clubsToDelete, error: fetchDeleteError } = await supabaseAdmin
            .from('clubs')
            .select('id, name')
            .eq('is_suspended', true)
            .lt('scheduled_deletion_at', now.toISOString());

        if (fetchDeleteError) {
            logger.error({ error: fetchDeleteError }, '[club-lifecycle] Error fetching clubs to delete');
        } else {
            for (const club of clubsToDelete || []) {
                try {
                    // Delete in order to respect foreign key constraints
                    await supabaseAdmin.from('match_participants').delete()
                        .in('match_id', supabaseAdmin.from('matches').select('id').eq('club_id', club.id));
                    await supabaseAdmin.from('matches').delete().eq('club_id', club.id);
                    await supabaseAdmin.from('challenges').delete().eq('club_id', club.id);
                    await supabaseAdmin.from('team_challenges').delete().eq('club_id', club.id);
                    await supabaseAdmin.from('match_invitations').delete().eq('club_id', club.id);
                    await supabaseAdmin.from('partnerships').delete().eq('club_id', club.id);

                    const { data: clubProfiles } = await supabaseAdmin
                        .from('profiles')
                        .select('id')
                        .eq('club_id', club.id);

                    if (clubProfiles && clubProfiles.length > 0) {
                        const profileIds = clubProfiles.map(p => p.id);
                        await supabaseAdmin.from('notifications').delete().in('user_id', profileIds);
                        await supabaseAdmin.from('push_tokens').delete().in('user_id', profileIds);
                    }

                    await supabaseAdmin.from('profiles').update({ club_id: null }).eq('club_id', club.id);
                    await supabaseAdmin.from('players').delete().eq('club_id', club.id);
                    await supabaseAdmin.from('club_admins').delete().eq('club_id', club.id);
                    await supabaseAdmin.from('club_conversations').delete().eq('club_id', club.id);

                    const { error: deleteClubError } = await supabaseAdmin
                        .from('clubs')
                        .delete()
                        .eq('id', club.id);

                    if (!deleteClubError) {
                        results.deleted.clubs.push(club.id);
                        results.deleted.count++;
                        logger.info({ clubId: club.id, clubName: club.name }, '[club-lifecycle] Club data deleted');
                    }
                } catch (e) {
                    const errorMessage = e instanceof Error ? e.message : String(e);
                    results.deleted.errors.push({ clubId: club.id, error: errorMessage });
                    logger.error({ clubId: club.id, error: errorMessage }, '[club-lifecycle] Error deleting club data');
                }
            }
        }

        return NextResponse.json({
            success: true,
            ...results,
        });
    } catch (error) {
        logger.error({ error: error instanceof Error ? error.message : String(error) }, '[club-lifecycle] Unexpected error');
        return NextResponse.json({ error: 'Internal server error', partial: results }, { status: 500 });
    }
}
