import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createAdminClient } from '@supabase/supabase-js';

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

function normalizeForComparison(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function POST(request: NextRequest) {
  try {
    const { playerName } = await request.json();

    if (!playerName || !playerName.trim()) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Le nom du joueur est requis',
        },
        { status: 400 }
      );
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
    const shortUserId = user.id.substring(0, 8) + '...';

    // Essayer d'abord avec le client normal
    let profile = null;
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('club_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[validate-exact] Error fetching profile with client', {
        userId: shortUserId,
        message: profileError.message,
        code: profileError.code,
      });
    } else {
      profile = profileData;
    }

    // Si pas de club_id trouvé, essayer avec le client admin (bypass RLS)
    let clubId = profile?.club_id || null;
    if (!clubId) {
      const { data: adminProfile, error: adminError } = await supabaseAdmin
        .from('profiles')
        .select('club_id')
        .eq('id', user.id)
        .maybeSingle();

      if (adminError) {
        console.error('[validate-exact] Error fetching profile with admin', {
          userId: shortUserId,
          message: adminError.message,
          code: adminError.code,
        });
      } else if (adminProfile?.club_id) {
        clubId = adminProfile.club_id;
        console.log('[validate-exact] Found club_id with admin client', {
          userId: shortUserId,
        });
      }
    }

    if (!clubId) {
      console.error('[validate-exact] No club_id found for user', {
        userId: shortUserId,
      });
      return NextResponse.json(
        {
          valid: false,
          error: 'Vous devez être rattaché à un club pour enregistrer un match.',
        },
        { status: 403 }
      );
    }

    console.log('[validate-exact] Validating player name for club', {
      userId: shortUserId,
      clubId,
    });

    const normalizedInput = normalizeForComparison(playerName);

    // Rechercher dans les profils du club (joueurs inscrits)
    const { data: allClubMembers, error: membersError } = await supabaseAdmin
      .from('profiles')
      .select('id, display_name, first_name, last_name, club_id, email')
      .eq('club_id', clubId);

    if (membersError) {
      console.error('[validate-exact] Error fetching club members', {
        clubId,
        message: membersError.message,
        code: membersError.code,
      });
      return NextResponse.json(
        {
          valid: false,
          error: 'Erreur lors de la recherche des joueurs du club.',
        },
        { status: 500 }
      );
    }

    const clubMembers = (allClubMembers || []).filter((member: any) => {
      const displayName = (member.display_name || '').toLowerCase();
      const firstName = (member.first_name || '').toLowerCase();
      const lastName = (member.last_name || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();
      const searchLower = normalizedInput;

      return (
        displayName.includes(searchLower) ||
        firstName.includes(searchLower) ||
        lastName.includes(searchLower) ||
        fullName.includes(searchLower) ||
        searchLower === firstName ||
        searchLower === fullName ||
        searchLower === displayName
      );
    });

    console.log('[validate-exact] Club members matching search', {
      clubId,
      count: clubMembers.length,
    });

    if (clubMembers && clubMembers.length > 0) {
      // Trouver le meilleur match exact parmi les résultats
      for (const member of clubMembers) {
        const displayName =
          member.display_name ||
          `${member.first_name || ''} ${member.last_name || ''}`.trim() ||
          'Joueur';
        const normalizedDisplayName = normalizeForComparison(displayName);
        const normalizedFullName = normalizeForComparison(
          `${member.first_name || ''} ${member.last_name || ''}`.trim()
        );
        const normalizedFirstName = normalizeForComparison(member.first_name || '');

        console.log('[validate-exact] Comparing candidate', {
          input: normalizedInput,
          displayName: normalizedDisplayName,
          fullName: normalizedFullName,
          firstName: normalizedFirstName,
        });

        // Accepter UNIQUEMENT un match exact sur "first_name last_name"
        if (normalizedInput === normalizedFullName) {
          const first_name = member.first_name || '';
          const last_name = member.last_name || '';

          if (!first_name || !first_name.trim() || !last_name || !last_name.trim()) {
            continue;
          }

          console.log('[validate-exact] Match found on full name (user)', {
            memberId: member.id,
            clubId,
          });

          const fullName = `${first_name} ${last_name}`.trim();

          return NextResponse.json({
            valid: true,
            player: {
              id: member.id,
              display_name: fullName,
              first_name: first_name,
              last_name: last_name,
              email: member.email || null,
              was_created: false,
              type: 'user',
            },
          });
        }
      }
    } else {
      console.log('[validate-exact] No club members matched search', {
        clubId,
      });
    }

    // Rechercher dans les joueurs invités
    const { data: allGuestPlayers, error: guestsError } = await supabaseAdmin
      .from('guest_players')
      .select('id, first_name, last_name')
      .limit(1000);

    if (guestsError) {
      console.error('[validate-exact] Error fetching guest players', {
        message: guestsError.message,
        code: guestsError.code,
      });
    }

    const guestPlayers = (allGuestPlayers || []).filter((guest: any) => {
      const firstName = (guest.first_name || '').toLowerCase();
      const lastName = (guest.last_name || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();
      const searchLower = normalizedInput;

      return (
        firstName.includes(searchLower) ||
        lastName.includes(searchLower) ||
        fullName.includes(searchLower) ||
        searchLower === firstName ||
        searchLower === fullName
      );
    });

    console.log('[validate-exact] Guest players matching search', {
      count: guestPlayers.length,
    });

    if (guestPlayers && guestPlayers.length > 0) {
      for (const guest of guestPlayers) {
        const first_name = guest.first_name || '';
        const last_name = guest.last_name || '';

        if (!first_name || !first_name.trim() || !last_name || !last_name.trim()) {
          continue;
        }

        const guestFullName = `${first_name} ${last_name}`.trim();
        const normalizedGuestName = normalizeForComparison(guestFullName);

        if (normalizedInput === normalizedGuestName) {
          console.log('[validate-exact] Match found on full name (guest)', {
            guestId: guest.id,
          });

          return NextResponse.json({
            valid: true,
            player: {
              id: guest.id,
              display_name: guestFullName,
              first_name: first_name,
              last_name: last_name,
              email: null,
              was_created: false,
              type: 'guest',
            },
          });
        }
      }
    }

    // Aucun match exact trouvé
    return NextResponse.json({
      valid: false,
      error: `Aucun joueur trouvé avec le nom exact "${playerName}". Vérifiez l'orthographe (lettres, espaces, accents).`,
    });
  } catch (error) {
    console.error('❌ Unexpected error in validate-exact API', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        valid: false,
        error: 'Erreur interne du serveur',
      },
      { status: 500 }
    );
  }
}
