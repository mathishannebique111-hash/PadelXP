const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function normalisePostal(postal) {
  if (!postal) return null;
  const digits = String(postal).replace(/\D/g, '');
  if (digits.length !== 5) return null;
  return digits;
}

function slugify(value, fallback) {
  const base = (value || '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 48);
  return base || fallback;
}

function buildInvitationCode(name, postalDigits) {
  const upper = (name || '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');
  return `${upper}${postalDigits}`;
}

async function ensureUniqueSlug(baseSlug) {
  let candidate = baseSlug;
  let suffix = 1;
  while (true) {
    const { data } = await admin
      .from('clubs')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();
    if (!data) {
      return candidate;
    }
    candidate = `${baseSlug}${suffix}`.slice(0, 64);
    suffix += 1;
  }
}

async function backfill() {
  const { data: owners, error: ownersError } = await admin.auth.admin.listUsers({ limit: 200 });
  if (ownersError) {
    console.error('Unable to list users:', ownersError);
    process.exit(1);
  }

  const ownerUsers = owners.users
    .filter((u) => (u.user_metadata?.role || u.raw_user_meta_data?.role) === 'owner');

  console.log(`Found ${ownerUsers.length} owner accounts.`);

  for (const owner of ownerUsers) {
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('display_name, club_id, club_slug, email')
      .eq('id', owner.id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile fetch error for', owner.id, profileError);
      continue;
    }

    if (!profile) {
      console.warn('No profile for owner', owner.id);
      continue;
    }

    if (profile.club_id) {
      console.log('Owner already linked to club:', owner.id);
      continue;
    }

    const postalDigits = normalisePostal(
      profile.postal_code || owner.user_metadata?.postal_code || owner.raw_user_meta_data?.postal_code || null
    );

    if (!postalDigits) {
      console.warn(`Skipping owner ${owner.id} - postal code missing or invalid.`);
      continue;
    }

    const displayName = profile.display_name || owner.email?.split('@')[0] || `Club ${owner.id.slice(0, 6)}`;
    const baseSlug = slugify(displayName, `club${postalDigits}`);
    const slug = await ensureUniqueSlug(baseSlug);
    const invitationCode = buildInvitationCode(displayName, postalDigits);

    const { data: existingCode } = await admin
      .from('clubs')
      .select('id')
      .eq('code_invitation', invitationCode)
      .maybeSingle();

    if (existingCode) {
      console.warn(`Skipping owner ${owner.id} - invitation code already exists.`);
      continue;
    }

    const { data: club, error: clubError } = await admin
      .from('clubs')
      .insert({
        name: displayName,
        slug,
        code_invitation: invitationCode,
        status: 'active',
        postal_code: postalDigits,
      })
      .select('id, slug, code_invitation')
      .single();

    if (clubError) {
      console.error('Club insert error for', owner.id, clubError);
      continue;
    }

    const { error: updateError } = await admin
      .from('profiles')
      .update({ club_id: club.id, club_slug: club.slug })
      .eq('id', owner.id);

    if (updateError) {
      console.error('Failed to update profile for', owner.id, updateError);
      continue;
    }

    console.log(`Created club ${club.slug} (${club.code_invitation}) for owner ${owner.id}`);
  }

  console.log('Backfill completed.');
}

backfill().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
