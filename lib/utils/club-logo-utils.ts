/**
 * Utilitaires pour convertir les logos de club en URLs publiques
 */

import { createClient } from "@supabase/supabase-js";
import { logger, logError } from "@/lib/logger";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

/**
 * Convertit un logo_url de club en URL publique
 * Gère les cas où logo_url est déjà une URL publique ou un chemin de stockage
 */
export function getClubLogoPublicUrl(logoUrl: string | null | undefined): string | null {
  if (!logoUrl || typeof logoUrl !== "string") {
    logger.info("[club-logo-utils] Logo URL is null or not a string");
    return null;
  }

  // Si c'est déjà une URL publique (http/https), la retourner telle quelle
  if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
    logger.info("[club-logo-utils] Logo URL is already public");
    return logoUrl;
  }

  // Si c'est un chemin de stockage Supabase, le convertir en URL publique
  if (supabaseAdmin) {
    try {
      logger.info("[club-logo-utils] Converting storage path to public URL");
      const { data, error } = supabaseAdmin.storage.from("club-logos").getPublicUrl(logoUrl);
      
      if (error) {
        logger.warn("[club-logo-utils] Error getting public URL", {
          error: error.message || String(error)
        });
        // Si la conversion échoue, retourner le chemin original (peut-être que c'est déjà une URL valide)
        return logoUrl;
      }
      
      if (data?.publicUrl) {
        logger.info("[club-logo-utils] Successfully converted to public URL");
        return data.publicUrl;
      } else {
        logger.warn("[club-logo-utils] No publicUrl in response");
        // Si pas de publicUrl, retourner le chemin original
        return logoUrl;
      }
    } catch (e) {
      logger.warn("[club-logo-utils] Exception getting public URL", {
        error: e instanceof Error ? e.message : String(e)
      });
      // En cas d'erreur, retourner le chemin original
      return logoUrl;
    }
  } else {
    logger.warn("[club-logo-utils] Supabase admin client not available");
    // Si pas d'admin client, retourner le chemin original (peut-être que c'est déjà une URL valide)
    return logoUrl;
  }
}

