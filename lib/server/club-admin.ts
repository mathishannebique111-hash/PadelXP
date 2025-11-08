import { createClient as createServiceClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.warn("[club-admin] SUPABASE credentials missing. ensureClubForOwner will be disabled.");
}

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

function slugify(value: string, fallback: string) {
  const base = value
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 48);
  return base || fallback;
}

function normalisePostal(postal: string | null | undefined) {
  if (!postal) return null;
  const digits = String(postal).replace(/\D/g, "");
  if (digits.length !== 5) {
    return null;
  }
  return digits;
}

function buildInvitationCode(name: string, postalDigits: string) {
  const upper = name
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
  return `${upper}${postalDigits}`;
}

async function ensureUniqueSlug(baseSlug: string) {
  if (!supabaseAdmin) return baseSlug;
  let candidate = baseSlug;
  let suffix = 1;
  while (true) {
    const { data } = await supabaseAdmin
      .from("clubs")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) {
      return candidate;
    }
    candidate = `${baseSlug}${suffix}`.slice(0, 64);
    suffix += 1;
  }
}

async function ensureUniqueCode(baseCode: string) {
  if (!supabaseAdmin) return baseCode;
  let candidate = baseCode;
  let suffix = 1;
  while (true) {
    const { data } = await supabaseAdmin
      .from("clubs")
      .select("id")
      .eq("code_invitation", candidate)
      .maybeSingle();
    if (!data) {
      return candidate;
    }
    candidate = `${baseCode}${suffix}`.slice(0, 12);
    suffix += 1;
  }
}

export async function ensureClubForOwner(options: {
  userId: string;
  displayName?: string | null;
  email?: string | null;
  postalCode?: string | null;
}): Promise<{ clubId: string; clubSlug: string; invitationCode: string } | null> {
  if (!supabaseAdmin) {
    return null;
  }

  const postalDigits = normalisePostal(options.postalCode);
  if (!postalDigits) {
    return null;
  }

  const { userId, displayName, email } = options;

  const fallbackName = displayName || email?.split("@")[0] || `Club ${userId.slice(0, 6)}`;
  const baseSlug = slugify(fallbackName, `club${userId.slice(0, 6)}`);
  const slug = await ensureUniqueSlug(baseSlug);
  const invitationCode = buildInvitationCode(fallbackName, postalDigits);

  const { data: existingCode } = await supabaseAdmin
    .from("clubs")
    .select("id")
    .eq("code_invitation", invitationCode)
    .maybeSingle();

  if (existingCode) {
    return null;
  }

  const { data: club, error: clubError } = await supabaseAdmin
    .from("clubs")
    .upsert(
      {
        name: fallbackName,
        slug,
        code_invitation: invitationCode,
        status: "active",
        postal_code: postalDigits,
      },
      { onConflict: "slug" }
    )
    .select("id, slug, code_invitation")
    .single();

  if (clubError || !club) {
    console.error("[club-admin] Failed to create club", clubError);
    return null;
  }

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({ club_id: club.id, club_slug: club.slug })
    .eq("id", userId);

  if (updateError) {
    console.error("[club-admin] Failed to link profile to club", updateError);
    return null;
  }

  return {
    clubId: club.id,
    clubSlug: club.slug,
    invitationCode,
  };
}
