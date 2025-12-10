import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { Buffer } from "buffer";
import { z } from "zod";
import { logger } from "@/lib/logger";

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

const optionalText = (max: number) => z.string().trim().max(max).nullish();

/**
 * Schéma d'enregistrement d'un club : nom/postal requis, coordonnées optionnelles nettoyées, logo base64 sécurisé.
 */
const clubRegisterSchema = z.object({
  name: z.string().trim().min(2, "Le nom du club est requis").max(120, "Nom de club trop long"),
  postal_code: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "Le code postal doit contenir 5 chiffres"),
  city: optionalText(120),
  street: optionalText(200),
  phone: optionalText(30),
  website: optionalText(200),
  number_of_courts: z
    .preprocess((val) => {
      if (val === null || val === undefined || val === "") return undefined;
      if (typeof val === "string") return Number(val);
      return val;
    }, z.number().int().min(1).max(100))
    .optional(),
  court_type: optionalText(60),
  owner_email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email administrateur invalide")
    .nullish(),
  logo_payload: z
    .object({
      filename: z.string().trim().max(200),
      mime: z.string().trim().max(100).optional(),
      data: z.string().min(1, "Le fichier logo est requis"),
    })
    .nullish(),
});

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
      logger.warn({ message }, "[clubs/register] createBucket warning");
    }
  }
}

export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Serveur mal configuré" }, { status: 500 });
    }

    const parsedPayload = clubRegisterSchema.safeParse(await req.json());
    if (!parsedPayload.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsedPayload.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      name,
      postal_code,
      city,
      street,
      phone,
      website,
      number_of_courts,
      court_type,
      owner_email,
      logo_payload,
    } = parsedPayload.data;

    const address = street || null;
    const ownerEmail = owner_email || null;
    const numberOfCourts = typeof number_of_courts === "number" ? number_of_courts : null;
    const logoPayload = logo_payload && logo_payload.data ? logo_payload : null;

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
        logger.error({ error: tokenError }, "[clubs/register] Failed to use bearer token");
      }
      userId = tokenData?.user?.id || null;
    }

    if (!userId && ownerEmail) {
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (listError) {
        logger.error({ ownerEmail: ownerEmail.substring(0, 5) + "…", error: listError }, "[clubs/register] listUsers error");
      } else {
        const owner = users?.users?.find((u) => u.email?.toLowerCase() === ownerEmail);
        userId = owner?.id || null;
      }
    }

    if (!userId) {
      const supabaseServer = await createServerClient();
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
          logger.error({ slug: slugCandidate, error: uploadError }, "[clubs/register] Logo upload error");
        } else {
          const { data: publicUrlData } = supabaseAdmin.storage.from("club-logos").getPublicUrl(filePath);
          logoUrl = publicUrlData?.publicUrl || null;
        }
      } catch (logoError) {
        logger.error({ slug: slugCandidate, error: logoError }, "[clubs/register] Unexpected logo upload error");
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

    // Vérifier si le club existe déjà
    const { data: existingClub } = await supabaseAdmin
      .from("clubs")
      .select("id, trial_start")
      .eq("slug", slugCandidate)
      .maybeSingle();

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
      number_of_courts: numberOfCourts,
      court_type,
    };

    // Initialiser trial_start uniquement si c'est un nouveau club (pas d'existant ou trial_start non défini)
    if (!existingClub || !existingClub.trial_start) {
      upsertData.trial_start = new Date().toISOString();
    }

    if (logoUrl) {
      upsertData.logo_url = logoUrl;
    }

    const upsertQuery = supabaseAdmin
      .from("clubs")
      .upsert(upsertData, { onConflict: "slug" });

    const { data: club, error: clubError } = await upsertQuery
      .select("id, slug, code_invitation")
      .single();
    if (clubError || !club) {
      const clubErrorMessage = clubError?.message || "Impossible d'enregistrer le club (erreur Supabase).";
      return NextResponse.json({ error: clubErrorMessage }, { status: 400 });
    }

    // Ne pas créer de profil joueur pour les comptes club
    // Les comptes club ne doivent pas avoir d'entrée dans la table profiles
    // On vérifie si un profil existe déjà et on le supprime si c'est le cas
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    
    if (existingProfile) {
      // Supprimer le profil joueur s'il existe pour ce compte club
      await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", userId);
    }

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
      logger.error({ userId: userId.substring(0, 8) + "…", clubId: club.id.substring(0, 8) + "…", error: metadataError }, "[clubs/register] Failed to update user metadata");
      return NextResponse.json({ error: "Club créé mais synchronisation du compte impossible. Contactez le support." }, { status: 500 });
    }

    // Créer l'entrée dans club_admins pour définir l'utilisateur comme propriétaire
    // Note: club_id est TEXT dans club_admins, donc on convertit l'UUID en string
    const userEmail = existingUser?.user?.email || ownerEmail || '';
    
    const { data: existingAdmin } = await supabaseAdmin
      .from('club_admins')
      .select('id')
      .eq('club_id', String(club.id))
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingAdmin) {
      const { error: adminError } = await supabaseAdmin
        .from('club_admins')
        .insert({
          club_id: String(club.id),
          user_id: userId,
          email: userEmail,
          role: 'owner',
          invited_by: userId,
          activated_at: new Date().toISOString(),
        });

      if (adminError) {
        logger.error({ userId: userId.substring(0, 8) + "…", clubId: club.id.substring(0, 8) + "…", error: adminError }, "[clubs/register] Error creating club_admin");
        // Ne pas bloquer si l'admin existe déjà ou si c'est une erreur de contrainte unique
        if (!adminError.message?.includes('duplicate') && !adminError.code?.includes('23505')) {
          logger.warn({ userId: userId.substring(0, 8) + "…", clubId: club.id.substring(0, 8) + "…", error: adminError }, "[clubs/register] Club created but admin entry failed (non-blocking)");
        }
      } else {
        logger.info({ userId: userId.substring(0, 8) + "…", clubId: club.id.substring(0, 8) + "…" }, "[clubs/register] ✅ Club admin created successfully");
      }
    }

    // Initialiser l'essai gratuit de 14 jours pour le club
    try {
      const { initiateTrial } = await import('@/lib/trial-hybrid');
      const trialResult = await initiateTrial(club.id);
      
      if (!trialResult.success) {
        logger.warn({ clubId: club.id.substring(0, 8) + "…", error: trialResult.error }, "[clubs/register] Could not initialize trial (non-blocking)");
        // Ne pas bloquer la création du compte si l'initialisation de l'essai échoue
        // L'essai pourra être initialisé plus tard
      } else {
        logger.info({ clubId: club.id.substring(0, 8) + "…" }, "[clubs/register] ✅ Trial initialized (14 days)");
      }
    } catch (subErr) {
      logger.warn({ clubId: club.id.substring(0, 8) + "…", error: subErr }, "[clubs/register] Trial initialization error (non-blocking)");
    }

    return NextResponse.json({ ok: true, club: { ...club, logo_url: logoUrl || null } });
  } catch (error: any) {
    logger.error({ error: error?.message || String(error) }, "[clubs/register] Unexpected error");
    return NextResponse.json({ error: error?.message || "Erreur serveur" }, { status: 500 });
  }
}
