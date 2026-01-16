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
 * Cron job to delete suspended club data after 45 days
 * Should be run daily
 */
export async function GET() {
    try {
        const now = new Date();

        // Find clubs where deletion is due
        const { data: clubsToDelete, error: fetchError } = await supabaseAdmin
            .from('clubs')
            .select('id, name')
            .eq('is_suspended', true)
            .lt('scheduled_deletion_at', now.toISOString());

        if (fetchError) {
            logger.error({ error: fetchError }, '[delete-suspended-clubs] Error fetching clubs');
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        const deletedClubs: string[] = [];
        const errors: { clubId: string; error: string }[] = [];

        for (const club of clubsToDelete || []) {
            try {
                // Delete in order to respect foreign key constraints
                // 1. Delete match participants
                await supabaseAdmin
                    .from('match_participants')
                    .delete()
                    .in('match_id',
                        supabaseAdmin.from('matches').select('id').eq('club_id', club.id)
                    );

                // 2. Delete matches
                await supabaseAdmin
                    .from('matches')
                    .delete()
                    .eq('club_id', club.id);

                // 3. Delete challenges
                await supabaseAdmin
                    .from('challenges')
                    .delete()
                    .eq('club_id', club.id);

                // 4. Delete team challenges
                await supabaseAdmin
                    .from('team_challenges')
                    .delete()
                    .eq('club_id', club.id);

                // 5. Delete match invitations
                await supabaseAdmin
                    .from('match_invitations')
                    .delete()
                    .eq('club_id', club.id);

                // 6. Delete partnerships
                await supabaseAdmin
                    .from('partnerships')
                    .delete()
                    .eq('club_id', club.id);

                // 7. Delete notifications for club players
                const { data: clubProfiles } = await supabaseAdmin
                    .from('profiles')
                    .select('id')
                    .eq('club_id', club.id);

                if (clubProfiles && clubProfiles.length > 0) {
                    const profileIds = clubProfiles.map(p => p.id);

                    await supabaseAdmin
                        .from('notifications')
                        .delete()
                        .in('user_id', profileIds);

                    await supabaseAdmin
                        .from('push_tokens')
                        .delete()
                        .in('user_id', profileIds);
                }

                // 8. Delete player profiles (set club_id to null or delete)
                await supabaseAdmin
                    .from('profiles')
                    .update({ club_id: null })
                    .eq('club_id', club.id);

                // 9. Delete players table entries
                await supabaseAdmin
                    .from('players')
                    .delete()
                    .eq('club_id', club.id);

                // 10. Delete club admins
                await supabaseAdmin
                    .from('club_admins')
                    .delete()
                    .eq('club_id', club.id);

                // 11. Delete club conversations
                await supabaseAdmin
                    .from('club_conversations')
                    .delete()
                    .eq('club_id', club.id);

                // 12. Finally, delete the club itself
                const { error: deleteClubError } = await supabaseAdmin
                    .from('clubs')
                    .delete()
                    .eq('id', club.id);

                if (deleteClubError) {
                    throw deleteClubError;
                }

                deletedClubs.push(club.id);
                logger.info({ clubId: club.id, clubName: club.name }, '[delete-suspended-clubs] Club data deleted');
            } catch (e) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                errors.push({ clubId: club.id, error: errorMessage });
                logger.error({ clubId: club.id, error: errorMessage }, '[delete-suspended-clubs] Error deleting club data');
            }
        }

        return NextResponse.json({
            success: true,
            deletedCount: deletedClubs.length,
            deletedClubs,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (error) {
        logger.error({ error: error instanceof Error ? error.message : String(error) }, '[delete-suspended-clubs] Unexpected error');
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
