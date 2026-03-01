import { createClient as createAdminClient } from '@supabase/supabase-js';
import PlayersListClient from './PlayersListClient';

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

export default async function AdminPlayersPage({
  searchParams,
}: {
  searchParams?: { club?: string; search?: string };
}) {
  // Fetch all clubs for filter
  const { data: clubs } = await supabaseAdmin
    .from('clubs')
    .select('id, name, email')
    .order('name', { ascending: true });

  const clubEmails = new Set(
    (clubs || []).map((club) => club.email?.toLowerCase()).filter(Boolean)
  );

  // Build query
  let playersQuery = supabaseAdmin
    .from('profiles')
    .select('id, display_name, first_name, last_name, email, avatar_url, club_id, created_at, matchs_joues, clubs(name), push_tokens(id)');

  // Filter by club if specified
  if (searchParams?.club && searchParams.club !== 'all') {
    playersQuery = playersQuery.eq('club_id', searchParams.club);
  }

  // Search filter will be handled client-side
  const { data: players, error } = await playersQuery
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching players:', error);
  }

  // Filter out club admin accounts
  const filteredPlayers = (players || []).filter((player) => {
    const playerEmail = player.email?.toLowerCase();
    return playerEmail && !clubEmails.has(playerEmail);
  }).map(player => ({
    ...player,
    clubs: Array.isArray(player.clubs) ? player.clubs[0] : player.clubs
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Joueurs</h1>
        <p className="text-slate-400 mt-2">Gestion de tous les joueurs de la plateforme.</p>
      </div>

      <PlayersListClient
        initialPlayers={filteredPlayers}
        clubs={clubs || []}
        initialClub={searchParams?.club || 'all'}
        initialSearch={searchParams?.search || ''}
      />
    </div>
  );
}
