import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { isAdmin } from '@/lib/admin-auth';
import { createClient } from '@/lib/supabase/server';

const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Verify admin status
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || !isAdmin(user.email)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStart = today.toISOString();

        // Fetch matches played today with club and participants info
        const { data: matches, error } = await supabaseAdmin
            .from("matches")
            .select(`
        id,
        created_at,
        played_at,
        score_team1,
        score_team2,
        score_details,
        team1_id,
        team2_id,
        winner_team_id,
        location_club_id,
        is_registered_club,
        match_participants (
          user_id,
          player_type,
          team,
          profiles (
            full_name,
            display_name
          ),
          guest_players (
            first_name,
            last_name
          )
        ),
        clubs:location_club_id (
          name
        ),
        unregistered_clubs:location_club_id (
          name
        )
      `)
            .gte('played_at', todayStart)
            .order('played_at', { ascending: false });

        if (error) {
            console.error('Error fetching today matches:', error);
            throw error;
        }

        // Format matches for the frontend
        const formattedMatches = (matches || []).map(match => {
            const clubName = match.is_registered_club
                ? (match.clubs as any)?.name
                : (match.unregistered_clubs as any)?.name;

            return {
                id: match.id,
                playedAt: match.played_at,
                clubName: clubName || 'Lieu inconnu',
                score: match.score_details || `${match.score_team1}-${match.score_team2}`,
                winnerTeamId: match.winner_team_id,
                team1_id: match.team1_id,
                team2_id: match.team2_id,
                participants: match.match_participants.map((p: any) => ({
                    name: p.player_type === 'user'
                        ? (p.profiles?.display_name || p.profiles?.full_name || 'Joueur inconnu')
                        : (`${p.guest_players?.first_name || ''} ${p.guest_players?.last_name || ''}`.trim() || 'Invité'),
                    team: p.team
                }))
            };
        });

        return NextResponse.json(formattedMatches);
    } catch (error) {
        console.error('Error fetching admin today matches:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
