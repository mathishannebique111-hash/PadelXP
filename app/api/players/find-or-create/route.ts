import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { capitalizeFullName } from '@/lib/utils/name-utils';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { updateEngagementMetrics, checkAutoExtensionEligibility, grantAutoExtension } from '@/lib/trial-hybrid';

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

// === AJOUT : Schéma Zod ===
const findOrCreatePlayerSchema = z.object({
  playerName: z
    .string()
    .trim()
    .min(1, 'Le nom du joueur est requis')
    .max(100, 'Le nom du joueur est trop long')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Le nom du joueur contient des caractères invalides'),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
});
// === FIN AJOUT ===

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
    // === MODIFICATION : Validation Zod ===
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({ error: 'Format de requête invalide' }, { status: 400 });
    }

    const parsed = findOrCreatePlayerSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors).flat()[0] ?? 'Données invalides';
      return NextResponse.json({ error: firstError, details: fieldErrors }, { status: 400 });
    }

    const { playerName, email } = parsed.data;
    // === FIN MODIFICATION ===

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

    // 1. Si un email est fourni, rechercher globalement d'abord
    if (email && email.trim()) {
      const searchEmail = email.trim().toLowerCase();

      // Rechercher un utilisateur existant (prioritaire)
      const { data: existingUser } = await supabaseAdmin
        .from('profiles')
        .select('id, display_name, first_name, last_name, email, club_id')
        .eq('email', searchEmail)
        .maybeSingle();

      if (existingUser) {
        logger.info('[players/find-or-create] Found existing user by email', { userId: existingUser.id, email: searchEmail });
        const displayName = existingUser.display_name ||
          (existingUser.first_name && existingUser.last_name ? `${existingUser.first_name} ${existingUser.last_name}` : 'Joueur');

        return NextResponse.json({
          player: {
            id: existingUser.id,
            display_name: displayName,
            email: existingUser.email,
            type: 'user',
            was_created: false,
          },
        });
      }

      // Rechercher un invité existant
      const { data: existingGuest } = await supabaseAdmin
        .from('guest_players')
        .select('id, first_name, last_name, email')
        .eq('email', searchEmail)
        .maybeSingle();

      if (existingGuest) {
        logger.info('[players/find-or-create] Found existing guest by email', { guestId: existingGuest.id, email: searchEmail });
        const guestDisplayName = `${existingGuest.first_name || ''} ${existingGuest.last_name || ''}`.trim() || 'Invité';

        return NextResponse.json({
          player: {
            id: existingGuest.id,
            display_name: guestDisplayName,
            email: existingGuest.email,
            type: 'guest',
            was_created: false,
          },
        });
      }
    }

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
          type: 'user',
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
        email: email || null,
        invited_by_user_id: user.id
      })
      .select('id, first_name, last_name, email')
      .single();

    if (guestError || !guest) {
      logger.error('❌ Error inserting guest player', { clubId: clubId.substring(0, 8) + "…", playerName, error: guestError });
      return NextResponse.json({ error: 'Unable to create guest player' }, { status: 500 });
    }

    const guestDisplayName = `${guest.first_name || ''} ${guest.last_name || ''}`.trim() || firstName;

    // ... (auto-extension logic remains) ...


    // Auto-extension après création de joueur (invite)
    try {
      logger.info('[players/find-or-create] Trial check after player signup', { clubId: clubId.substring(0, 8) + "…" });
      await updateEngagementMetrics(clubId);
      const eligibility = await checkAutoExtensionEligibility(clubId);
      logger.info('[players/find-or-create] Trial eligibility', { clubId: clubId.substring(0, 8) + "…", eligible: eligibility.eligible, reason: eligibility.reason });
      if (eligibility.eligible && eligibility.reason) {
        const grantRes = await grantAutoExtension(clubId, eligibility.reason);
        if (grantRes.success) {
          logger.info('[players/find-or-create] Auto extension granted after player signup', { clubId: clubId.substring(0, 8) + "…", reason: eligibility.reason });
          // Note: revalidatePath ne peut pas être appelé ici car c'est une route API, pas un Server Component
        } else {
          logger.warn('[players/find-or-create] Auto extension grant failed after player signup', { clubId: clubId.substring(0, 8) + "…", error: grantRes.error });
        }
      } else {
        logger.info('[players/find-or-create] No auto extension (threshold not met or already unlocked)', { clubId: clubId.substring(0, 8) + "…" });
      }
    } catch (extErr) {
      logger.error('[players/find-or-create] Auto extension check error', { clubId: clubId.substring(0, 8) + "…", error: (extErr as Error).message });
    }

    return NextResponse.json({
      player: {
        id: guest.id,
        display_name: guestDisplayName,
        email: email || null,
        type: 'guest',
        was_created: true,
      },
    });
  } catch (error) {
    logger.error('❌ Unexpected error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
