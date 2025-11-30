import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { Buffer } from "buffer";
import { logger } from "@/lib/logger";

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
      logger.warn({ message }, "[clubs/logo] createBucket warning");
    }
  }
}

export async function POST(req: Request) {
  try {
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("club_id, club_slug")
      .eq("id", user.id)
      .maybeSingle();

    let clubId = profile?.club_id || (user.user_metadata?.club_id as string | null) || null;
    let clubSlug = profile?.club_slug || (user.user_metadata?.club_slug as string | null) || null;

    if ((!clubId || !clubSlug) && supabaseAdmin) {
      const { data: adminProfile } = await supabaseAdmin
        .from("profiles")
        .select("club_id, club_slug")
        .eq("id", user.id)
        .maybeSingle();
      clubId = clubId || adminProfile?.club_id || null;
      clubSlug = clubSlug || adminProfile?.club_slug || null;
    }

    if (!clubId && !clubSlug) {
      return NextResponse.json({ error: "Aucun club associé à ce compte" }, { status: 400 });
    }

    const body = await req.json();
    const logoPayload = body?.logo_payload;

    if (!logoPayload?.data) {
      return NextResponse.json({ error: "Logo manquant" }, { status: 400 });
    }

    await ensureLogoBucket();

    const fileExt = (logoPayload.filename?.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const baseSlug = (clubSlug || `club-${clubId || "logo"}`).replace(/[^a-z0-9-]/g, "") || "club-logo";
    const filePath = `logos/${baseSlug}-${Date.now()}.${fileExt}`;

    const fileBuffer = Buffer.from(String(logoPayload.data), "base64");
    const { error: uploadError } = await supabaseAdmin.storage
      .from("club-logos")
      .upload(filePath, fileBuffer, {
        contentType: logoPayload.mime || "image/png",
        upsert: true,
      });

    if (uploadError) {
      logger.error({ clubId: clubId?.substring(0, 8) + "…" || null, clubSlug, error: uploadError }, "[clubs/logo] upload error");
      return NextResponse.json({ error: "Échec de l'import du logo" }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from("club-logos").getPublicUrl(filePath);
    const logoUrl = publicUrlData?.publicUrl || null;

    if (!logoUrl) {
      return NextResponse.json({ error: "Impossible de récupérer l'URL du logo" }, { status: 500 });
    }

    let clubRecord: { id: string; slug: string } | null = null;
    if (clubId) {
      const { data: clubById } = await supabaseAdmin
        .from("clubs")
        .select("id, slug")
        .eq("id", clubId)
        .maybeSingle();
      if (clubById) {
        clubRecord = clubById;
      }
    }
    if (!clubRecord && clubSlug) {
      const { data: clubBySlug } = await supabaseAdmin
        .from("clubs")
        .select("id, slug")
        .eq("slug", clubSlug)
        .maybeSingle();
      if (clubBySlug) {
        clubRecord = clubBySlug;
      }
    }

    if (!clubRecord) {
      return NextResponse.json({ error: "Club introuvable" }, { status: 404 });
    }

    // Mettre à jour la table clubs
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from("clubs")
      .update({ logo_url: logoUrl })
      .eq("id", clubRecord.id)
      .select("logo_url")
      .maybeSingle();
    
    logger.info({ clubId: clubRecord.id.substring(0, 8) + "…", logoUrl, updateData: updateData ? { logo_url: updateData.logo_url } : null, error: updateError ? { message: updateError.message, code: updateError.code, details: updateError.details, hint: updateError.hint } : null }, "[clubs/logo] Update clubs table result");
    
    if (updateError) {
      const message = updateError.message || "";
      const code = updateError.code || "";
      
      // Si la colonne n'existe pas (erreur 42703 ou message contenant "column")
      if (code === "42703" || /column.*does not exist/i.test(message) || /logo_url/i.test(message)) {
        logger.error({ clubId: clubRecord.id.substring(0, 8) + "…", message, code, details: updateError.details, hint: updateError.hint }, "[clubs/logo] ⚠️ Colonne logo_url n'existe pas dans clubs. Erreur");
        logger.warn({ clubId: clubRecord.id.substring(0, 8) + "…" }, "[clubs/logo] Le logo sera stocké uniquement dans les métadonnées utilisateur jusqu'à ce que la migration soit exécutée");
      } else {
        logger.error({ clubId: clubRecord.id.substring(0, 8) + "…", error: updateError }, "[clubs/logo] update club error");
        return NextResponse.json({ error: "Mise à jour du club impossible" }, { status: 500 });
      }
    } else if (updateData) {
      logger.info({ clubId: clubRecord.id.substring(0, 8) + "…", logoUrl: updateData.logo_url }, "[clubs/logo] ✅ Logo URL mis à jour dans clubs table");
    }

    const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...(user.user_metadata || {}),
        club_logo_url: logoUrl,
      },
    });

    if (metadataError) {
      logger.error({ userId: user.id.substring(0, 8) + "…", clubId: clubRecord.id.substring(0, 8) + "…", error: metadataError }, "[clubs/logo] update metadata error");
      return NextResponse.json({ error: "Logo enregistré mais impossible de synchroniser le compte" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, logo_url: logoUrl });
  } catch (error: any) {
    logger.error({ error: error?.message || String(error) }, "[clubs/logo] unexpected error");
    return NextResponse.json({ error: error?.message || "Erreur serveur" }, { status: 500 });
  }
}

