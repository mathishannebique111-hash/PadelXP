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

async function ensureProfilePhotoBucket() {
  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin.storage.createBucket("player-profile-photos", {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp"],
    });
  } catch (error: any) {
    const message = String(error?.message || "");
    if (!message.toLowerCase().includes("already exists")) {
      logger.warn({ message }, "[player/profile-photo] createBucket warning");
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

    const body = await req.json();
    const photoPayload = body?.photo_payload;

    if (!photoPayload?.data) {
      return NextResponse.json({ error: "Photo manquante" }, { status: 400 });
    }

    await ensureProfilePhotoBucket();

    const fileExt = (photoPayload.filename?.split(".").pop() || "jpg")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "jpg";
    
    // Créer un chemin unique basé sur l'ID utilisateur et un timestamp
    const filePath = `photos/${user.id}-${Date.now()}.${fileExt}`;

    const fileBuffer = Buffer.from(String(photoPayload.data), "base64");
    const { error: uploadError } = await supabaseAdmin.storage
      .from("player-profile-photos")
      .upload(filePath, fileBuffer, {
        contentType: photoPayload.mime || "image/jpeg",
        upsert: false, // Ne pas écraser les anciennes photos
      });

    if (uploadError) {
      logger.error({ userId: user.id.substring(0, 8) + "…", error: uploadError }, "[player/profile-photo] upload error");
      return NextResponse.json({ error: "Échec de l'import de la photo" }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from("player-profile-photos").getPublicUrl(filePath);
    const photoUrl = publicUrlData?.publicUrl || null;

    if (!photoUrl) {
      return NextResponse.json({ error: "Impossible de récupérer l'URL de la photo" }, { status: 500 });
    }

    // Mettre à jour le profil avec l'URL de la photo
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ avatar_url: photoUrl })
      .eq("id", user.id);

    if (updateError) {
      logger.error({ userId: user.id.substring(0, 8) + "…", error: updateError }, "[player/profile-photo] update profile error");
      // Ne pas échouer complètement si la mise à jour échoue, la photo est déjà uploadée
      // Mais retourner quand même une erreur pour informer l'utilisateur
      return NextResponse.json({ error: "Photo importée mais impossible de mettre à jour le profil" }, { status: 500 });
    }

    logger.info({ userId: user.id.substring(0, 8) + "…", photoUrl }, "[player/profile-photo] Photo uploaded successfully");

    return NextResponse.json({ ok: true, photo_url: photoUrl });
  } catch (error: any) {
    logger.error({ error: error?.message || String(error) }, "[player/profile-photo] unexpected error");
    return NextResponse.json({ error: error?.message || "Erreur serveur" }, { status: 500 });
  }
}

// Nouvelle route DELETE pour supprimer la photo de profil
export async function DELETE(req: Request) {
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

    // Récupérer l'URL actuelle de la photo
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      logger.error({ userId: user.id.substring(0, 8) + "…", error: profileError }, "[player/profile-photo] Error fetching profile");
      return NextResponse.json({ error: "Erreur lors de la récupération du profil" }, { status: 500 });
    }

    // Si une photo existe, essayer de la supprimer du storage
    if (profile?.avatar_url) {
      try {
        // Extraire le chemin du fichier depuis l'URL
        const url = new URL(profile.avatar_url);
        const pathParts = url.pathname.split('/');
        const bucketIndex = pathParts.findIndex(part => part === 'player-profile-photos');
        
        if (bucketIndex !== -1 && pathParts[bucketIndex + 1]) {
          const filePath = pathParts.slice(bucketIndex + 1).join('/');
          
          // Supprimer le fichier du storage
          const { error: deleteError } = await supabaseAdmin.storage
            .from("player-profile-photos")
            .remove([filePath]);

          if (deleteError) {
            logger.warn({ userId: user.id.substring(0, 8) + "…", error: deleteError }, "[player/profile-photo] Error deleting file from storage (continuing anyway)");
            // Continuer même si la suppression du fichier échoue
          }
        }
      } catch (storageError) {
        logger.warn({ userId: user.id.substring(0, 8) + "…", error: storageError }, "[player/profile-photo] Error parsing avatar_url (continuing anyway)");
        // Continuer même si on ne peut pas parser l'URL
      }
    }

    // Mettre à jour le profil pour supprimer l'URL de la photo
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", user.id);

    if (updateError) {
      logger.error({ userId: user.id.substring(0, 8) + "…", error: updateError }, "[player/profile-photo] Error updating profile");
      return NextResponse.json({ error: "Erreur lors de la suppression de la photo" }, { status: 500 });
    }

    logger.info({ userId: user.id.substring(0, 8) + "…" }, "[player/profile-photo] Photo deleted successfully");

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    logger.error({ error: error?.message || String(error) }, "[player/profile-photo] unexpected error");
    return NextResponse.json({ error: error?.message || "Erreur serveur" }, { status: 500 });
  }
}
