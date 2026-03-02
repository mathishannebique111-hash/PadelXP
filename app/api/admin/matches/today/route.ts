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

        // 1. Fetch matches played today
        const { data: matches, error: matchesError } = await supabaseAdmin
            .from("matches")
            .select(`
                id,
                played_at,
                score_team1,
                score_team2,
                score_details,
                team1_id,
                team2_id,
                winner_team_id,
                location_club_id,
                is_registered_club
            `)
            .gte('played_at', todayStart)
            .order('played_at', { ascending: false });

        if (matchesError) {
            console.error('Error fetching today matches:', matchesError);
            throw matchesError;
        }

        if (!matches || matches.length === 0) {
            return NextResponse.json([]);
        }

        const matchIds = matches.map(m => m.id);

        // 2. Fetch participants for these matches separately
        const { data: participants, error: participantsError } = await supabaseAdmin
            .from("match_participants")
            .select(`
                match_id,
                user_id,
                player_type,
                team,
                guest_player_id
            `)
            .in('match_id', matchIds);

        if (participantsError) {
            console.error('Error fetching participants:', participantsError);
        }

        const matchParticipants = participants || [];
        const participantUserIds = Array.from(new Set(matchParticipants.filter(p => p.player_type === 'user' && p.user_id).map(p => p.user_id)));
        const participantGuestIds = Array.from(new Set(matchParticipants.filter(p => p.player_type === 'guest' && p.guest_player_id).map(p => p.guest_player_id)));

        // 2.1 Fetch profiles separately
        const { data: profiles } = participantUserIds.length > 0
            ? await supabaseAdmin.from('profiles').select('id, full_name, display_name').in('id', participantUserIds)
            : { data: [] };

        // 2.2 Fetch guests separately
        const { data: guests } = participantGuestIds.length > 0
            ? await supabaseAdmin.from('guest_players').select('id, first_name, last_name').in('id', participantGuestIds)
            : { data: [] };

        const profilesMap = new Map((profiles || []).map(p => [p.id, p]));
        const guestsMap = new Map((guests || []).map(g => [g.id, g]));

        // 3. Fetch clubs and unregistered clubs
        const clubIds = Array.from(new Set(matches.filter(m => m.is_registered_club && m.location_club_id).map(m => m.location_club_id)));
        const unregClubIds = Array.from(new Set(matches.filter(m => !m.is_registered_club && m.location_club_id).map(m => m.location_club_id)));

        const [{ data: clubs }, { data: unregClubs }] = await Promise.all([
            clubIds.length > 0 ? supabaseAdmin.from('clubs').select('id, name').in('id', clubIds) : Promise.resolve({ data: [] }),
            unregClubIds.length > 0 ? supabaseAdmin.from('unregistered_clubs').select('id, name').in('id', unregClubIds) : Promise.resolve({ data: [] })
        ]);

        const clubsMap = new Map((clubs || []).map(c => [c.id, c.name]));
        const unregClubsMap = new Map((unregClubs || []).map(c => [c.id, c.name]));

        // 4. Format matches for the frontend
        const formattedMatches = matches.map(match => {
            const currentMatchParticipants = matchParticipants.filter(p => p.match_id === match.id);

            const clubName = match.is_registered_club
                ? clubsMap.get(match.location_club_id!)
                : unregClubsMap.get(match.location_club_id!);

            return {
                id: match.id,
                playedAt: match.played_at,
                clubName: clubName || 'Lieu inconnu',
                score: match.score_details || `${match.score_team1}-${match.score_team2}`,
                winnerTeamId: match.winner_team_id,
                team1_id: match.team1_id,
                team2_id: match.team2_id,
                participants: currentMatchParticipants.map((p: any) => {
                    let name = 'Joueur inconnu';
                    if (p.player_type === 'user') {
                        const profile = profilesMap.get(p.user_id);
                        name = profile?.display_name || profile?.full_name || 'Joueur inconnu';
                    } else if (p.player_type === 'guest') {
                        const guest = guestsMap.get(p.guest_player_id);
                        name = guest ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim() : 'Invité';
                        if (!name) name = 'Invité';
                    }

                    return {
                        name,
                        team: p.team
                    };
                })
            };
        });

        return NextResponse.json(formattedMatches);
    } catch (error) {
        console.error('Error fetching admin today matches:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
