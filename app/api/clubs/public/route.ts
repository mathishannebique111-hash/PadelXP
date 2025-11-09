import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.warn("[api/clubs/public] NEXT_PUBLIC_SUPABASE_URL indisponible");
}
if (!SERVICE_ROLE_KEY) {
  console.warn("[api/clubs/public] SUPABASE_SERVICE_ROLE_KEY indisponible");
}

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

const BUCKET_NAME = "club-public-info";

type OpeningHoursPayload = Record<string, { open: string | null; close: string | null; closed?: boolean }>;

type SanitisedPayload = {
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  phone?: string | null;
  website?: string | null;
  number_of_courts?: number | null;
  court_type?: string | null;
};

type ExtrasPayload = {
  address: string | null;
  postal_code: string | null;
  city: string | null;
  phone: string | null;
  website: string | null;
  number_of_courts: number | null;
  court_type: string | null;
  description: string | null;
  opening_hours: OpeningHoursPayload | null;
};

async function ensureBucket() {
  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 1024 * 1024,
      allowedMimeTypes: ["application/json"],
    });
  } catch (error: any) {
    const message = String(error?.message || "");
    if (!message.toLowerCase().includes("exists")) {
      console.warn("[api/clubs/public] ensureBucket warning", message);
    }
  }
}

async function loadExtras(clubId: string): Promise<ExtrasPayload | null> {
  if (!supabaseAdmin) return null;
  const storage = supabaseAdmin.storage.from(BUCKET_NAME);
  const { data, error } = await storage.download(`${clubId}.json`);
  if (error || !data) {
    if (error && !error.message?.toLowerCase().includes("not found")) {
      console.warn("[api/clubs/public] loadExtras error", error);
    }
    return null;
  }
  try {
    const text = await data.text();
    const parsed = JSON.parse(text);
    return {
      address: typeof parsed?.address === "string" ? parsed.address : null,
      postal_code: typeof parsed?.postal_code === "string" ? parsed.postal_code : null,
      city: typeof parsed?.city === "string" ? parsed.city : null,
      phone: typeof parsed?.phone === "string" ? parsed.phone : null,
      website: typeof parsed?.website === "string" ? parsed.website : null,
      number_of_courts: typeof parsed?.number_of_courts === "number" ? parsed.number_of_courts : null,
      court_type: typeof parsed?.court_type === "string" ? parsed.court_type : null,
      description: typeof parsed?.description === "string" ? parsed.description : null,
      opening_hours: parsed?.opening_hours && typeof parsed.opening_hours === "object" ? parsed.opening_hours as OpeningHoursPayload : null,
    };
  } catch (err) {
    console.warn("[api/clubs/public] loadExtras parse error", err);
    return null;
  }
}

async function saveExtras(clubId: string, extras: ExtrasPayload) {
  if (!supabaseAdmin) return;
  await ensureBucket();
  const storage = supabaseAdmin.storage.from(BUCKET_NAME);
  const payload = JSON.stringify(extras, null, 2);
  await storage.upload(`${clubId}.json`, payload, { upsert: true, contentType: "application/json" });
}

async function resolveClubId(userId: string, metadata?: Record<string, any>): Promise<string | null> {
  if (!supabaseAdmin) return null;
  let clubId: string | null = null;
  let clubSlug: string | null = null;

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("club_id, club_slug")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("[api/clubs/public] resolveClubId error", error);
  } else {
    clubId = data?.club_id ?? null;
    clubSlug = data?.club_slug ?? null;
  }

  let userMetadata = metadata;
  if ((!clubId || !clubSlug) && !userMetadata) {
    try {
      const { data: userData, error: adminUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (adminUserError) {
        console.warn("[api/clubs/public] admin getUserById warning", adminUserError);
      }
      userMetadata = (userData?.user?.user_metadata || {}) as Record<string, any>;
    } catch (adminError) {
      console.warn("[api/clubs/public] admin getUserById exception", adminError);
    }
  }

  if (userMetadata) {
    if (!clubId && typeof userMetadata.club_id === "string" && userMetadata.club_id) {
      clubId = userMetadata.club_id;
    }
    if (!clubSlug && typeof userMetadata.club_slug === "string" && userMetadata.club_slug) {
      clubSlug = userMetadata.club_slug;
    }
  }

  if (!clubId && clubSlug) {
    const { data: clubBySlug, error: slugError } = await supabaseAdmin
      .from("clubs")
      .select("id")
      .eq("slug", clubSlug)
      .maybeSingle();
    if (slugError) {
      console.error("[api/clubs/public] resolveClubId slug error", slugError);
    } else {
      clubId = clubBySlug?.id ?? null;
    }
  }

  return clubId;
}

function buildTablePayload(payload: any): SanitisedPayload {
  const result: SanitisedPayload = {};

  if ("address" in payload) {
    result.address = typeof payload.address === "string" && payload.address.trim() ? payload.address.trim() : null;
  }
  if ("postal_code" in payload) {
    result.postal_code = typeof payload.postal_code === "string" && payload.postal_code.trim() ? payload.postal_code.trim() : null;
  }
  if ("city" in payload) {
    result.city = typeof payload.city === "string" && payload.city.trim() ? payload.city.trim() : null;
  }
  if ("phone" in payload) {
    result.phone = typeof payload.phone === "string" && payload.phone.trim() ? payload.phone.trim() : null;
  }
  if ("website" in payload) {
    result.website = typeof payload.website === "string" && payload.website.trim() ? payload.website.trim() : null;
  }
  if ("number_of_courts" in payload) {
    const parsed = Number(payload.number_of_courts);
    result.number_of_courts = Number.isFinite(parsed) && payload.number_of_courts !== "" ? parsed : null;
  }
  if ("court_type" in payload) {
    result.court_type = typeof payload.court_type === "string" && payload.court_type.trim() ? payload.court_type.trim() : null;
  }

  return result;
}

function buildExtras(payload: SanitisedPayload, body: any): ExtrasPayload {
  return {
    address: payload.address ?? null,
    postal_code: payload.postal_code ?? null,
    city: payload.city ?? null,
    phone: payload.phone ?? null,
    website: payload.website ?? null,
    number_of_courts: payload.number_of_courts ?? null,
    court_type: payload.court_type ?? null,
    description: typeof body.description === "string" && body.description.trim() ? body.description.trim() : null,
    opening_hours: body.opening_hours && typeof body.opening_hours === "object"
      ? body.opening_hours as OpeningHoursPayload
      : null,
  };
}

export async function GET(request: Request) {
  const supabase = createClient({ headers: Object.fromEntries(request.headers) });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const metadata = (user.user_metadata || {}) as Record<string, any>;
  let clubId = await resolveClubId(user.id, metadata);
  if (!clubId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("club_id")
      .eq("id", user.id)
      .maybeSingle();
    clubId = profile?.club_id ?? (metadata.club_id as string | null) ?? null;
  }

  if (!clubId) {
    return NextResponse.json({ club: null });
  }

  let clubData: any = null;
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from("clubs")
      .select("id, name, address, postal_code, city, phone, website, number_of_courts, court_type, logo_url")
      .eq("id", clubId)
      .maybeSingle();
    if (!error) {
      clubData = data ?? null;
    }
  }
  if (!clubData) {
    const { data } = await supabase
      .from("clubs")
      .select("id, name, address, postal_code, city, phone, website, number_of_courts, court_type, logo_url")
      .eq("id", clubId)
      .maybeSingle();
    clubData = data ?? null;
  }

  const extras = supabaseAdmin ? await loadExtras(clubId) : null;

  const response = clubData
    ? {
        ...clubData,
        address: clubData.address ?? extras?.address ?? null,
        postal_code: clubData.postal_code ?? extras?.postal_code ?? null,
        city: clubData.city ?? extras?.city ?? null,
        phone: clubData.phone ?? extras?.phone ?? null,
        website: clubData.website ?? extras?.website ?? null,
        number_of_courts: clubData.number_of_courts ?? extras?.number_of_courts ?? null,
        court_type: clubData.court_type ?? extras?.court_type ?? null,
        description: extras?.description ?? null,
        opening_hours: extras?.opening_hours ?? null,
      }
    : {
        id: clubId,
        name: metadata?.club_name ?? null,
        address: extras?.address ?? metadata?.club_address ?? null,
        postal_code: extras?.postal_code ?? metadata?.club_postal_code ?? null,
        city: extras?.city ?? metadata?.club_city ?? null,
        phone: extras?.phone ?? metadata?.club_phone ?? null,
        website: extras?.website ?? metadata?.club_website ?? null,
        number_of_courts: extras?.number_of_courts ?? metadata?.club_courts ?? null,
        court_type: extras?.court_type ?? metadata?.club_court_type ?? null,
        logo_url: metadata?.club_logo_url ?? null,
        description: extras?.description ?? null,
        opening_hours: extras?.opening_hours ?? null,
      };

  return NextResponse.json({ club: response, extras });
}

export async function POST(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Serveur mal configuré" }, { status: 500 });
  }

  const supabase = createClient({ headers: Object.fromEntries(request.headers) });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const clubId = await resolveClubId(user.id, (user.user_metadata || {}) as Record<string, any>);
  if (!clubId) {
    return NextResponse.json({ error: "Club introuvable pour ce compte" }, { status: 404 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const updatePayload = buildTablePayload(body);
  const extrasPayload = buildExtras(updatePayload, body);

  const updateKeys = Object.keys(updatePayload);

  if (updateKeys.length > 0) {
    console.log("[api/clubs/public] updating club", { clubId, payload: updatePayload });

    if (supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from("clubs")
        .update(updatePayload)
        .eq("id", clubId);

      if (error) {
        console.error("[api/clubs/public] update error", error);
        return NextResponse.json({ error: error.message || "Impossible d'enregistrer les informations" }, { status: 500 });
      }
    } else {
      const { error } = await supabase
        .from("clubs")
        .update(updatePayload)
        .eq("id", clubId);

      if (error) {
        console.error("[api/clubs/public] update error (cookie fallback)", error);
        return NextResponse.json({ error: error.message || "Impossible d'enregistrer les informations" }, { status: 500 });
      }
    }
  }

  if (supabaseAdmin) {
    await saveExtras(clubId, extrasPayload);
  }

  let refreshedClub: any = null;
  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("clubs")
      .select("id, name, address, postal_code, city, phone, website, number_of_courts, court_type, logo_url")
      .eq("id", clubId)
      .maybeSingle();
    refreshedClub = data ?? null;
  }
  if (!refreshedClub) {
    const { data } = await supabase
      .from("clubs")
      .select("id, name, address, postal_code, city, phone, website, number_of_courts, court_type, logo_url")
      .eq("id", clubId)
      .maybeSingle();
    refreshedClub = data ?? null;
  }

  const extrasRefreshed = supabaseAdmin ? await loadExtras(clubId) : null;
  const response = refreshedClub
    ? {
        ...refreshedClub,
        address: refreshedClub.address ?? extrasRefreshed?.address ?? extrasPayload.address ?? null,
        postal_code: refreshedClub.postal_code ?? extrasRefreshed?.postal_code ?? extrasPayload.postal_code ?? null,
        city: refreshedClub.city ?? extrasRefreshed?.city ?? extrasPayload.city ?? null,
        phone: refreshedClub.phone ?? extrasRefreshed?.phone ?? extrasPayload.phone ?? null,
        website: refreshedClub.website ?? extrasRefreshed?.website ?? extrasPayload.website ?? null,
        number_of_courts: refreshedClub.number_of_courts ?? extrasRefreshed?.number_of_courts ?? extrasPayload.number_of_courts ?? null,
        court_type: refreshedClub.court_type ?? extrasRefreshed?.court_type ?? extrasPayload.court_type ?? null,
        description: extrasRefreshed?.description ?? extrasPayload.description ?? null,
        opening_hours: extrasRefreshed?.opening_hours ?? extrasPayload.opening_hours ?? null,
      }
    : extrasRefreshed
        ? {
            id: clubId,
            name: null,
            address: extrasRefreshed.address ?? extrasPayload.address ?? null,
            postal_code: extrasRefreshed.postal_code ?? extrasPayload.postal_code ?? null,
            city: extrasRefreshed.city ?? extrasPayload.city ?? null,
            phone: extrasRefreshed.phone ?? extrasPayload.phone ?? null,
            website: extrasRefreshed.website ?? extrasPayload.website ?? null,
            number_of_courts: extrasRefreshed.number_of_courts ?? extrasPayload.number_of_courts ?? null,
            court_type: extrasRefreshed.court_type ?? extrasPayload.court_type ?? null,
            logo_url: null,
            description: extrasRefreshed.description ?? extrasPayload.description ?? null,
            opening_hours: extrasRefreshed.opening_hours ?? extrasPayload.opening_hours ?? null,
          }
        : null;

  revalidatePath("/dashboard/page-club");
  revalidatePath("/dashboard");
  revalidatePath("/club");

  return NextResponse.json({ ok: true, club: response, extras: extrasRefreshed ?? extrasPayload });
}
