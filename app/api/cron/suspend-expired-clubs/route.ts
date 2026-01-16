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
 * Cron job to automatically suspend clubs after 48h grace period
 * Should be run every hour
 */
export async function GET() {
    try {
        // Calculate the cutoff time (48h ago)
        const cutoffTime = new Date();
        cutoffTime.setHours(cutoffTime.getHours() - 48);

        // Find clubs that:
        // 1. Have trial expired (trial_current_end_date in the past)
        // 2. No active subscription (subscription_status is not 'active')
        // 3. Not already suspended
        // 4. Trial ended more than 48h ago
        const { data: clubsToSuspend, error: fetchError } = await supabaseAdmin
            .from('clubs')
            .select('id, name, trial_current_end_date, trial_end_date')
            .eq('is_suspended', false)
            .or('subscription_status.is.null,subscription_status.neq.active')
            .not('trial_current_end_date', 'is', null);

        if (fetchError) {
            logger.error({ error: fetchError }, '[suspend-expired-clubs] Error fetching clubs');
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        const suspendedClubs: string[] = [];

        for (const club of clubsToSuspend || []) {
            const trialEndDate = new Date(club.trial_current_end_date || club.trial_end_date);

            // Check if trial ended more than 48h ago
            if (trialEndDate < cutoffTime) {
                // Calculate deletion date (45 days from now)
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

                if (updateError) {
                    logger.error({ clubId: club.id, error: updateError }, '[suspend-expired-clubs] Error suspending club');
                } else {
                    suspendedClubs.push(club.id);
                    logger.info({ clubId: club.id, clubName: club.name }, '[suspend-expired-clubs] Club suspended');
                }
            }
        }

        return NextResponse.json({
            success: true,
            suspendedCount: suspendedClubs.length,
            suspendedClubs,
        });
    } catch (error) {
        logger.error({ error: error instanceof Error ? error.message : String(error) }, '[suspend-expired-clubs] Unexpected error');
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
