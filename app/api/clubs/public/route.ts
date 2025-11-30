import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  logger.warn({}, "[api/clubs/public] NEXT_PUBLIC_SUPABASE_URL indisponible");
}
if (!SERVICE_ROLE_KEY) {
  logger.warn({}, "[api/clubs/public] SUPABASE_SERVICE_ROLE_KEY indisponible");
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
      logger.warn({ error: message }, "[api/clubs/public] ensureBucket warning");
    }
  }
}

async function loadExtras(clubId: string): Promise<ExtrasPayload | null> {
  if (!supabaseAdmin) {
    logger.warn({ clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] loadExtras: supabaseAdmin not available");
    return null;
  }
  const storage = supabaseAdmin.storage.from(BUCKET_NAME);
  const { data, error } = await storage.download(`${clubId}.json`);
  if (error || !data) {
    if (error && !error.message?.toLowerCase().includes("not found")) {
      logger.warn({ error: error, clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] loadExtras error");
    } else {
      logger.info({ clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] loadExtras: No existing file found for clubId:");
    }
    return null;
  }
  try {
    const text = await data.text();
    const parsed = JSON.parse(text);
    logger.info({ clubId: clubId.substring(0, 8) + "…", openingHoursKeys: parsed?.opening_hours ? Object.keys(parsed.opening_hours).length : 0 }, "[api/clubs/public] loadExtras: Loaded data for clubId: opening_hours:");
    return {
      address: typeof parsed?.address === "string" ? parsed.address : null,
      postal_code: typeof parsed?.postal_code === "string" ? parsed.postal_code : null,
      city: typeof parsed?.city === "string" ? parsed.city : null,
      phone: typeof parsed?.phone === "string" ? parsed.phone : null,
      website: typeof parsed?.website === "string" ? parsed.website : null,
      number_of_courts: typeof parsed?.number_of_courts === "number" ? parsed.number_of_courts : null,
      court_type: typeof parsed?.court_type === "string" ? parsed.court_type : null,
      description: typeof parsed?.description === "string" ? parsed.description : null,
      opening_hours: parsed?.opening_hours && typeof parsed.opening_hours === "object" && !Array.isArray(parsed.opening_hours) ? parsed.opening_hours as OpeningHoursPayload : null,
    };
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : String(err), clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] loadExtras parse error");
    return null;
  }
}

async function saveExtras(clubId: string, extras: ExtrasPayload) {
  if (!supabaseAdmin) {
    logger.warn({ clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] saveExtras: supabaseAdmin not available");
    return;
  }
  try {
    await ensureBucket();
    const storage = supabaseAdmin.storage.from(BUCKET_NAME);
    const payload = JSON.stringify(extras, null, 2);
    logger.info({ clubId: clubId.substring(0, 8) + "…", payloadSize: payload.length }, "[api/clubs/public] saveExtras: Uploading payload for clubId: Size:");
    const { data, error } = await storage.upload(`${clubId}.json`, payload, { upsert: true, contentType: "application/json" });
    if (error) {
      logger.error({ error: error, clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] saveExtras: Upload error:");
      throw error;
    }
    logger.info({ clubId: clubId.substring(0, 8) + "…", path: data?.path }, "[api/clubs/public] saveExtras: Upload successful:");
    
    // Attendre un peu pour s'assurer que le fichier est bien écrit
    // et vérifier que le fichier a bien été sauvegardé
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Vérifier que le fichier a bien été sauvegardé en le relisant
    const { data: verifyData, error: verifyError } = await storage.download(`${clubId}.json`);
    if (verifyError || !verifyData) {
      logger.error({ error: verifyError, clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] saveExtras: Verification failed after upload:");
      // Ne pas throw ici car le upload a réussi, c'est juste une vérification
    } else {
      logger.info({ clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] saveExtras: Verification successful, file exists");
    }
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : String(err), clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] saveExtras: Exception:");
    throw err;
  }
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
    logger.error({ error: error, userId: userId.substring(0, 8) + "…" }, "[api/clubs/public] resolveClubId error");
  } else {
    clubId = data?.club_id ?? null;
    clubSlug = data?.club_slug ?? null;
  }

  let userMetadata = metadata;
  if ((!clubId || !clubSlug) && !userMetadata) {
    try {
      const { data: userData, error: adminUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (adminUserError) {
        logger.warn({ error: adminUserError, userId: userId.substring(0, 8) + "…" }, "[api/clubs/public] admin getUserById warning");
      }
      userMetadata = (userData?.user?.user_metadata || {}) as Record<string, any>;
    } catch (adminError) {
      logger.warn({ error: adminError instanceof Error ? adminError.message : String(adminError), userId: userId.substring(0, 8) + "…" }, "[api/clubs/public] admin getUserById exception");
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
      logger.error({ error: slugError, userId: userId.substring(0, 8) + "…", clubSlug: clubSlug?.substring(0, 8) + "…" }, "[api/clubs/public] resolveClubId slug error");
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
  let openingHours: OpeningHoursPayload | null = null;
  
  // CRITICAL: Accepter TOUJOURS les horaires du body s'ils sont présents
  // Ne pas vérifier s'ils sont "vides" ou non - l'objet peut avoir des jours avec des valeurs null
  if (body.opening_hours !== undefined && body.opening_hours !== null) {
    if (typeof body.opening_hours === "object" && !Array.isArray(body.opening_hours)) {
      // Accepter l'objet tel quel, même s'il a des valeurs null pour certains jours
      openingHours = body.opening_hours as OpeningHoursPayload;
      logger.info({ openingHoursKeys: Object.keys(openingHours).length }, "[api/clubs/public] buildExtras - ACCEPTED opening_hours from body:");
      logger.info({ openingHoursKeys: Object.keys(openingHours).length }, "[api/clubs/public] buildExtras - opening_hours has keys");
    } else {
      logger.error({ type: typeof body.opening_hours, isArray: Array.isArray(body.opening_hours) }, "[api/clubs/public] buildExtras - opening_hours is not a valid object (type: isArray:), setting to null");
      openingHours = null;
    }
  } else {
    logger.info({}, "[api/clubs/public] buildExtras - No opening_hours in body (undefined or null), setting to null");
    openingHours = null;
  }
  
  return {
    address: payload.address ?? null,
    postal_code: payload.postal_code ?? null,
    city: payload.city ?? null,
    phone: payload.phone ?? null,
    website: payload.website ?? null,
    number_of_courts: payload.number_of_courts ?? null,
    court_type: payload.court_type ?? null,
    description: typeof body.description === "string" && body.description.trim() ? body.description.trim() : null,
    opening_hours: openingHours, // TOUJOURS inclure opening_hours, même si null
  };
}

export async function GET(request: Request) {
  const supabase = await createClient();
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

  const supabase = await createClient();
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
    logger.info({ bodyKeys: Object.keys(body), clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] POST request body keys:");
    logger.info({ openingHoursType: typeof body.opening_hours, clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] POST request body opening_hours TYPE:");
    logger.info({ openingHoursKeys: body.opening_hours ? Object.keys(body.opening_hours).length : 0, clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] POST request body opening_hours:");
    logger.info({ isArray: Array.isArray(body.opening_hours), clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] POST request body opening_hours is array?");
    logger.info({ openingHoursKeys: body.opening_hours ? Object.keys(body.opening_hours) : null, clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] POST request body opening_hours keys:");
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  // CRITICAL: Vérifier si opening_hours est présent dans le body AVANT de construire extrasPayload
  const hasOpeningHoursInBody = body.opening_hours !== undefined && body.opening_hours !== null;
  logger.info({ hasOpeningHoursInBody, clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] hasOpeningHoursInBody:");
  logger.info({ openingHoursKeys: body.opening_hours ? Object.keys(body.opening_hours).length : 0, clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] body.opening_hours:");
  
  const updatePayload = buildTablePayload(body);
  const extrasPayload = buildExtras(updatePayload, body);
  
  logger.info({ openingHoursKeys: extrasPayload.opening_hours ? Object.keys(extrasPayload.opening_hours).length : 0, clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] Built extrasPayload opening_hours:");
  logger.info({ isNull: extrasPayload.opening_hours === null, clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] extrasPayload.opening_hours is null?");
  logger.info({ isUndefined: extrasPayload.opening_hours === undefined, clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] extrasPayload.opening_hours is undefined?");
  
  // CRITICAL: Si opening_hours était présent dans le body mais est devenu null dans extrasPayload,
  // il y a un problème dans buildExtras - on doit le corriger
  if (hasOpeningHoursInBody && extrasPayload.opening_hours === null) {
    logger.error({ type: typeof body.opening_hours, openingHoursKeys: Object.keys(body.opening_hours || {}).length, clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] ERROR: opening_hours was in body but became null in extrasPayload!");
    logger.error({ type: typeof body.opening_hours, clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] Body opening_hours type:");
    logger.error({ openingHoursKeys: Object.keys(body.opening_hours || {}), clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] Body opening_hours keys:");
    // Forcer l'inclusion des horaires du body même si buildExtras les a rejetés
    if (typeof body.opening_hours === "object" && !Array.isArray(body.opening_hours)) {
      extrasPayload.opening_hours = body.opening_hours as OpeningHoursPayload;
      logger.info({ openingHoursKeys: Object.keys(extrasPayload.opening_hours).length, clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] FORCED extrasPayload.opening_hours from body:");
    }
  }

  const updateKeys = Object.keys(updatePayload);

  if (updateKeys.length > 0) {
    logger.info({ clubId: clubId.substring(0, 8) + "…", updateKeys: updateKeys }, "[api/clubs/public] updating club");

    if (supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from("clubs")
        .update(updatePayload)
        .eq("id", clubId);

      if (error) {
        logger.error({ error: error, clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] update error");
        return NextResponse.json({ error: error.message || "Impossible d'enregistrer les informations" }, { status: 500 });
      }
    } else {
      const { error } = await supabase
        .from("clubs")
        .update(updatePayload)
        .eq("id", clubId);

      if (error) {
        logger.error({ error: error, clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] update error (cookie fallback)");
        return NextResponse.json({ error: error.message || "Impossible d'enregistrer les informations" }, { status: 500 });
      }
    }
  }

  if (supabaseAdmin) {
    logger.info({ openingHoursKeys: extrasPayload.opening_hours ? Object.keys(extrasPayload.opening_hours).length : 0, clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] Saving extras with opening_hours:");
    try {
      await saveExtras(clubId, extrasPayload);
      logger.info({ clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] Extras saved successfully");
    } catch (saveError: any) {
      logger.error({ error: saveError?.message || String(saveError), clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] Error saving extras:");
      return NextResponse.json({ 
        error: saveError?.message || "Impossible d'enregistrer les horaires d'ouverture" 
      }, { status: 500 });
    }
  } else {
    logger.warn({ clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] supabaseAdmin not available, cannot save extras");
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

  // Attendre un peu plus longtemps après la sauvegarde pour s'assurer que le fichier est disponible
  if (supabaseAdmin) {
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // ATTENTION: Attendre plus longtemps pour que le storage soit à jour
  if (supabaseAdmin) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  const extrasRefreshed = supabaseAdmin ? await loadExtras(clubId) : null;
  logger.info({ openingHoursKeys: extrasRefreshed?.opening_hours ? Object.keys(extrasRefreshed.opening_hours).length : 0, clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] Loaded extras after save - opening_hours:");
  
  // CRITICAL: Utiliser TOUJOURS les horaires qu'on vient de sauvegarder (extrasPayload.opening_hours)
  // car le rechargement peut ne pas être à jour immédiatement
  // Si opening_hours était dans le body, on DOIT l'utiliser même s'il est null (c'est une suppression volontaire)
  const hasOpeningHoursInRequest = body.opening_hours !== undefined;
  
  const finalExtras: ExtrasPayload = {
    address: extrasPayload.address ?? extrasRefreshed?.address ?? null,
    postal_code: extrasPayload.postal_code ?? extrasRefreshed?.postal_code ?? null,
    city: extrasPayload.city ?? extrasRefreshed?.city ?? null,
    phone: extrasPayload.phone ?? extrasRefreshed?.phone ?? null,
    website: extrasPayload.website ?? extrasRefreshed?.website ?? null,
    number_of_courts: extrasPayload.number_of_courts ?? extrasRefreshed?.number_of_courts ?? null,
    court_type: extrasPayload.court_type ?? extrasRefreshed?.court_type ?? null,
    description: extrasPayload.description ?? extrasRefreshed?.description ?? null,
    // PRIORITÉ ABSOLUE aux horaires qu'on vient de sauvegarder (extrasPayload)
    // Si opening_hours était dans la requête, utiliser extrasPayload.opening_hours (même si null)
    // Sinon, utiliser extrasRefreshed.opening_hours comme fallback
    opening_hours: hasOpeningHoursInRequest
      ? extrasPayload.opening_hours  // Utiliser TOUJOURS les horaires de la requête (même si null)
      : (extrasRefreshed?.opening_hours ?? extrasPayload.opening_hours ?? null),
  };
  
  logger.info({ hasOpeningHoursInRequest, clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] hasOpeningHoursInRequest:");
  logger.info({ openingHoursKeys: finalExtras.opening_hours ? Object.keys(finalExtras.opening_hours).length : 0, clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] Final extras opening_hours:");
  logger.info({ openingHoursKeys: extrasPayload.opening_hours ? Object.keys(extrasPayload.opening_hours).length : 0, clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] extrasPayload.opening_hours was:");
  logger.info({ openingHoursKeys: extrasRefreshed?.opening_hours ? Object.keys(extrasRefreshed.opening_hours).length : 0, clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] extrasRefreshed?.opening_hours was:");
  const response = refreshedClub
    ? {
        ...refreshedClub,
        address: refreshedClub.address ?? finalExtras?.address ?? null,
        postal_code: refreshedClub.postal_code ?? finalExtras?.postal_code ?? null,
        city: refreshedClub.city ?? finalExtras?.city ?? null,
        phone: refreshedClub.phone ?? finalExtras?.phone ?? null,
        website: refreshedClub.website ?? finalExtras?.website ?? null,
        number_of_courts: refreshedClub.number_of_courts ?? finalExtras?.number_of_courts ?? null,
        court_type: refreshedClub.court_type ?? finalExtras?.court_type ?? null,
        description: finalExtras?.description ?? null,
        opening_hours: finalExtras?.opening_hours ?? null,
      }
    : finalExtras
        ? {
            id: clubId,
            name: null,
            address: finalExtras.address ?? null,
            postal_code: finalExtras.postal_code ?? null,
            city: finalExtras.city ?? null,
            phone: finalExtras.phone ?? null,
            website: finalExtras.website ?? null,
            number_of_courts: finalExtras.number_of_courts ?? null,
            court_type: finalExtras.court_type ?? null,
            logo_url: null,
            description: finalExtras.description ?? null,
            opening_hours: finalExtras.opening_hours ?? null,
          }
        : null;

  revalidatePath("/dashboard/page-club");
  revalidatePath("/dashboard");
  revalidatePath("/club");

  logger.info({ openingHoursKeys: (response?.opening_hours ?? finalExtras?.opening_hours) ? Object.keys(response?.opening_hours ?? finalExtras?.opening_hours ?? {}).length : 0, clubId: clubId.substring(0, 8) + "…" }, "[api/clubs/public] Returning response with opening_hours:");

  return NextResponse.json({ ok: true, club: response, extras: finalExtras });
}
