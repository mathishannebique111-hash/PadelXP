import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { Buffer } from "buffer";

function slugify(value: string, fallback: string) {
  const base = (value || fallback)
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 48);
  return base || fallback;
}

function normalisePostal(postal: string) {
  const digits = (postal || "").replace(/\D/g, "");
  if (digits.length !== 5) {
    throw new Error("Code postal invalide : 5 chiffres requis");
  }
  return digits;
}

function buildInvitationCode(name: string, postalDigits: string) {
  const upper = (name || "")
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
  return `${upper}${postalDigits}`;
}

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

async function ensureLogoBucket() {
  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin.storage.createBucket("club-logos", {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
    });
  } catch (error: any) {
    const message = String(error?.message || "");
    if (!message.toLowerCase().includes("already exists")) {
      console.warn("[clubs/register] createBucket warning:", message);
    }
  }
}

export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Serveur mal configuré" }, { status: 500 });
    }

    const payload = await req.json();
    const name = String(payload.name || "").trim();
    const postal_code = String(payload.postal_code || "").trim();
    const city = payload.city ? String(payload.city).trim() : null;
    const address = payload.street ? String(payload.street).trim() : null;
    const phone = payload.phone ? String(payload.phone).trim() : null;
    const website = payload.website ? String(payload.website).trim() : null;
    const number_of_courts = payload.number_of_courts ? Number(payload.number_of_courts) : null;
    const court_type = payload.court_type ? String(payload.court_type).trim() : null;
    const ownerEmail = payload.owner_email ? String(payload.owner_email).trim().toLowerCase() : null;
    const logoPayload = payload.logo_payload && payload.logo_payload.data ? payload.logo_payload : null;

    if (!name) {
      return NextResponse.json({ error: "Le nom du club est requis" }, { status: 400 });
    }
    if (!postal_code) {
      return NextResponse.json({ error: "Le code postal est requis" }, { status: 400 });
    }

    let postalDigits: string;
    try {
      postalDigits = normalisePostal(postal_code);
    } catch (postalError: any) {
      return NextResponse.json({ error: postalError?.message || "Code postal invalide" }, { status: 400 });
    }

    let userId: string | null = null;

    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.getUser(token);
      if (tokenError) {
        console.error("[clubs/register] Failed to use bearer token", tokenError);
      }
      userId = tokenData?.user?.id || null;
    }

    if (!userId && ownerEmail) {
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (listError) {
        console.error("[clubs/register] listUsers error", listError);
      } else {
        const owner = users?.users?.find((u) => u.email?.toLowerCase() === ownerEmail);
        userId = owner?.id || null;
      }
    }

    if (!userId) {
      const supabaseServer = createServerClient();
      const { data: { user } } = await supabaseServer.auth.getUser();
      userId = user?.id || null;
    }

    if (!userId) {
      return NextResponse.json({ error: "Impossible d’identifier le compte administrateur. Reconnectez-vous et réessayez." }, { status: 401 });
    }

    const baseSlug = slugify(name, `club${postalDigits}`);
    let slugCandidate = `${baseSlug}${postalDigits}`.slice(0, 64);
    let suffix = 1;

    while (true) {
      const { data: existing } = await supabaseAdmin
        .from("clubs")
        .select("id")
        .eq("slug", slugCandidate)
        .maybeSingle();
      if (!existing) break;
      slugCandidate = `${baseSlug}${postalDigits}${suffix}`.slice(0, 64);
      suffix += 1;
    }

    let inviteCode = buildInvitationCode(name, postalDigits);
    if (name.toLowerCase().includes("tennis club amiens metropole")) {
      inviteCode = "TCAM80000";
    }

    let logoUrl: string | null = null;
    if (logoPayload) {
      try {
        await ensureLogoBucket();
        const fileExt = (logoPayload.filename?.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
        const safeSlug = slugCandidate.replace(/[^a-z0-9-]/g, "") || `club-${postalDigits}`;
        const filePath = `logos/${safeSlug}-${Date.now()}.${fileExt}`;
        const fileBuffer = Buffer.from(String(logoPayload.data), "base64");
        const { error: uploadError } = await supabaseAdmin.storage
          .from("club-logos")
          .upload(filePath, fileBuffer, {
            contentType: logoPayload.mime || "image/png",
            upsert: true,
          });
        if (uploadError) {
          console.error("[clubs/register] Logo upload error", uploadError);
        } else {
          const { data: publicUrlData } = supabaseAdmin.storage.from("club-logos").getPublicUrl(filePath);
          logoUrl = publicUrlData?.publicUrl || null;
        }
      } catch (logoError) {
        console.error("[clubs/register] Unexpected logo upload error", logoError);
      }
    }

    const { data: existingCode } = await supabaseAdmin
      .from("clubs")
      .select("id")
      .eq("code_invitation", inviteCode)
      .maybeSingle();

    if (existingCode) {
      return NextResponse.json({
        error: "Un club utilise déjà ce code d’invitation. Modifiez légèrement le nom (ex. ajoutez votre ville).",
      }, { status: 409 });
    }

    const upsertData: Record<string, any> = {
      name,
      slug: slugCandidate,
      code_invitation: inviteCode,
      status: "active",
      postal_code: postalDigits,
      city,
      address,
      phone,
      website,
      number_of_courts,
      court_type,
    };

    const upsertQuery = supabaseAdmin
      .from("clubs")
      .upsert(upsertData, { onConflict: "slug" });

    const { data: club, error: clubError } = await upsertQuery
      .select("id, slug, code_invitation")
      .single();
    if (clubError || !club) {
      const clubErrorMessage = clubError?.message || "Impossible d’enregistrer le club (erreur Supabase).";
      return NextResponse.json({ error: clubErrorMessage }, { status: 400 });
    }

    await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          club_id: club.id,
          club_slug: club.slug,
        },
        { onConflict: "id" }
      );

    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const mergedMetadata = {
      ...(existingUser?.user?.user_metadata || {}),
      club_id: club.id,
      club_slug: club.slug,
      club_name: name,
      postal_code: postalDigits,
      club_logo_url: logoUrl || existingUser?.user?.user_metadata?.club_logo_url || null,
    };

    const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: mergedMetadata,
    });

    if (metadataError) {
      console.error("[clubs/register] Failed to update user metadata", metadataError);
      return NextResponse.json({ error: "Club créé mais synchronisation du compte impossible. Contactez le support." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, club: { ...club, logo_url: logoUrl || null } });
  } catch (error: any) {
    console.error("[clubs/register] Unexpected error", error);
    return NextResponse.json({ error: error?.message || "Erreur serveur" }, { status: 500 });
  }
}
