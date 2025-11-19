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
      return NextResponse.json({ 
        valid: false, 
        error: 'Le nom du joueur est requis' 
      }, { status: 400 });
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

    // Essayer d'abord avec le client normal
    let profile = null;
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('club_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[validate-exact] Error fetching profile with client:', profileError);
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
        console.error('[validate-exact] Error fetching profile with admin:', adminError);
      } else if (adminProfile?.club_id) {
        clubId = adminProfile.club_id;
        console.log('[validate-exact] Found club_id with admin client:', clubId);
      }
    }

    if (!clubId) {
      console.error('[validate-exact] No club_id found for user:', user.id);
      return NextResponse.json({ 
        valid: false,
        error: 'Vous devez être rattaché à un club pour enregistrer un match.' 
      }, { status: 403 });
    }

    console.log('[validate-exact] Validating player:', playerName, 'for club:', clubId);

    const normalizedInput = normalizeForComparison(playerName);
    
    // Rechercher dans les profils du club (joueurs inscrits)
    // Récupérer tous les membres du club et filtrer ensuite pour éviter les problèmes de syntaxe ilike
    const { data: allClubMembers, error: membersError } = await supabaseAdmin
      .from('profiles')
      .select('id, display_name, first_name, last_name, club_id, email')
      .eq('club_id', clubId);

    if (membersError) {
      console.error('[validate-exact] Error fetching club members:', membersError);
      return NextResponse.json({ 
        valid: false,
        error: 'Erreur lors de la recherche des joueurs du club.' 
      }, { status: 500 });
    }

    // Filtrer les membres qui correspondent à la recherche (insensible à la casse)
    const clubMembers = (allClubMembers || []).filter((member: any) => {
      const displayName = (member.display_name || '').toLowerCase();
      const firstName = (member.first_name || '').toLowerCase();
      const lastName = (member.last_name || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();
      const searchLower = normalizedInput;
      
      return displayName.includes(searchLower) || 
             firstName.includes(searchLower) || 
             lastName.includes(searchLower) ||
             fullName.includes(searchLower) ||
             searchLower === firstName ||
             searchLower === fullName ||
             searchLower === displayName;
    });

    console.log('[validate-exact] Found', clubMembers?.length || 0, 'club members');

    if (clubMembers && clubMembers.length > 0) {
      // Trouver le meilleur match exact parmi les résultats
      for (const member of clubMembers) {
        const displayName = member.display_name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Joueur';
        const normalizedDisplayName = normalizeForComparison(displayName);
        const normalizedFullName = normalizeForComparison(`${member.first_name || ''} ${member.last_name || ''}`.trim());
        const normalizedFirstName = normalizeForComparison(member.first_name || '');
        
        console.log('[validate-exact] Comparing:', {
          input: normalizedInput,
          displayName: normalizedDisplayName,
          fullName: normalizedFullName,
          firstName: normalizedFirstName,
          memberDisplayName: displayName
        });
        
        // Match exact sur display_name, prénom + nom, ou prénom seul (si unique)
        if (normalizedInput === normalizedDisplayName || 
            normalizedInput === normalizedFullName ||
            (normalizedInput === normalizedFirstName && normalizedFirstName)) {
          // Si c'est juste le prénom, vérifier qu'il n'y a qu'un seul résultat avec ce prénom
          if (normalizedInput === normalizedFirstName && normalizedInput !== normalizedFullName && normalizedInput !== normalizedDisplayName) {
            const sameFirstNameCount = clubMembers.filter((p: any) => 
              normalizeForComparison(p.first_name || '') === normalizedFirstName
            ).length;
            
            console.log('[validate-exact] First name match, count:', sameFirstNameCount);
            
            // Si plusieurs joueurs ont le même prénom, ne pas valider avec juste le prénom
            if (sameFirstNameCount > 1) {
              continue;
            }
          }
          
          console.log('[validate-exact] Match found!', displayName);
          return NextResponse.json({
            valid: true,
            player: {
              id: member.id,
              display_name: displayName,
              email: member.email || null,
              was_created: false,
              type: 'user',
            },
          });
        }
      }
    } else {
      console.log('[validate-exact] No club members found for club:', clubId);
    }

    // Rechercher dans les joueurs invités (tous les clubs peuvent partager les guests)
    // Récupérer tous les guests et filtrer ensuite
    const { data: allGuestPlayers, error: guestsError } = await supabaseAdmin
      .from('guest_players')
      .select('id, first_name, last_name')
      .limit(1000); // Limiter pour éviter de charger trop de données

    if (guestsError) {
      console.error('[validate-exact] Error fetching guest players:', guestsError);
    }

    // Filtrer les guests qui correspondent à la recherche
    const guestPlayers = (allGuestPlayers || []).filter((guest: any) => {
      const firstName = (guest.first_name || '').toLowerCase();
      const lastName = (guest.last_name || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();
      const searchLower = normalizedInput;
      
      return firstName.includes(searchLower) || 
             lastName.includes(searchLower) ||
             fullName.includes(searchLower) ||
             searchLower === firstName ||
             searchLower === fullName;
    });

    if (guestPlayers && guestPlayers.length > 0) {
      // Vérifier d'abord les matches exacts sur le nom complet
      for (const guest of guestPlayers) {
        const guestFullName = `${guest.first_name || ''} ${guest.last_name || ''}`.trim();
        const normalizedGuestName = normalizeForComparison(guestFullName);
        
        // Match exact sur le nom complet
        if (normalizedInput === normalizedGuestName) {
          return NextResponse.json({
            valid: true,
            player: {
              id: guest.id,
              display_name: guestFullName,
              email: null,
              was_created: false,
              type: 'guest',
            },
          });
        }
      }
      
      // Si pas de match sur le nom complet, vérifier si c'est juste le prénom
      // et qu'il n'y a qu'un seul guest avec ce prénom
      const matchingGuestsByFirstName = guestPlayers.filter((g: any) => {
        const normalizedGuestFirstName = normalizeForComparison(g.first_name || '');
        return normalizedInput === normalizedGuestFirstName;
      });
      
      if (matchingGuestsByFirstName.length === 1) {
        const guest = matchingGuestsByFirstName[0];
        const guestFullName = `${guest.first_name || ''} ${guest.last_name || ''}`.trim();
        return NextResponse.json({
          valid: true,
          player: {
            id: guest.id,
            display_name: guestFullName,
            email: null,
            was_created: false,
            type: 'guest',
          },
        });
      }
    }

    // Aucun match exact trouvé
    return NextResponse.json({
      valid: false,
      error: `Aucun joueur trouvé avec le nom exact "${playerName}". Vérifiez l'orthographe (lettres, espaces, accents).`,
    });
  } catch (error) {
    console.error('❌ Unexpected error in validate-exact API:', error);
    return NextResponse.json({ 
      valid: false,
      error: 'Erreur interne du serveur' 
    }, { status: 500 });
  }
}

