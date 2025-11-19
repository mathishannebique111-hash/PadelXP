import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { capitalizeFullName } from '@/lib/utils/name-utils';

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

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}

export async function POST(request: NextRequest) {
  try {
    const { playerName } = await request.json();

    if (!playerName || !playerName.trim()) {
      return NextResponse.json({ error: 'Player name required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('club_id')
      .eq('id', user.id)
      .maybeSingle();

    const clubId = profile?.club_id || null;
    if (!clubId) {
      return NextResponse.json({ error: 'Club required' }, { status: 403 });
    }

    const normalizedQuery = playerName.trim().toLowerCase();
    const searchPattern = `%${normalizedQuery.replace(/'/g, "''")}%`;

    // Rechercher d'abord un membre du même club (inscrit)
    const { data: clubMembers } = await supabaseAdmin
      .from('profiles')
      .select('id, display_name, first_name, last_name, club_id, email')
      .eq('club_id', clubId)
      .or(
        `display_name.ilike.${searchPattern},first_name.ilike.${searchPattern},last_name.ilike.${searchPattern}`
      )
      .limit(5);

    if (clubMembers && clubMembers.length > 0) {
      const member = clubMembers[0];
      const displayName = member.display_name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Joueur';
      return NextResponse.json({
        player: {
          id: member.id,
          display_name: displayName,
          email: member.email || null,
          was_created: false,
        },
      });
    }

    // Aucun joueur inscrit trouvé: créer un joueur invité unique
    const { firstName: rawFirstName, lastName: rawLastName } = splitName(playerName);
    if (!rawFirstName) {
      return NextResponse.json({ error: 'Nom du joueur invalide' }, { status: 400 });
    }

    // Capitaliser automatiquement le prénom et le nom
    const { firstName, lastName } = capitalizeFullName(rawFirstName, rawLastName || '');

    const { data: guest, error: guestError } = await supabaseAdmin
      .from('guest_players')
      .insert({
        first_name: firstName,
        last_name: lastName,
      })
      .select('id, first_name, last_name')
      .single();

    if (guestError || !guest) {
      console.error('❌ Error inserting guest player:', guestError);
      return NextResponse.json({ error: 'Unable to create guest player' }, { status: 500 });
    }

    const guestDisplayName = `${guest.first_name || ''} ${guest.last_name || ''}`.trim() || firstName;

    return NextResponse.json({
      player: {
        id: guest.id,
        display_name: guestDisplayName,
        email: null,
        was_created: true,
      },
    });
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

