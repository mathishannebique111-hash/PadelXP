/**
 * Utilitaires pour convertir les logos de club en URLs publiques
 */

import { createClient } from "@supabase/supabase-js";

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
    console.log("[club-logo-utils] Logo URL is null or not a string:", logoUrl);
    return null;
  }

  // Si c'est déjà une URL publique (http/https), la retourner telle quelle
  if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
    console.log("[club-logo-utils] Logo URL is already public:", logoUrl);
    return logoUrl;
  }

  // Si c'est un chemin de stockage Supabase, le convertir en URL publique
  if (supabaseAdmin) {
    try {
      console.log("[club-logo-utils] Converting storage path to public URL:", logoUrl);
      const { data, error } = supabaseAdmin.storage.from("club-logos").getPublicUrl(logoUrl);
      
      if (error) {
        console.warn("[club-logo-utils] Error getting public URL:", {
          logoUrl,
          error: error.message || error
        });
        // Si la conversion échoue, retourner le chemin original (peut-être que c'est déjà une URL valide)
        return logoUrl;
      }
      
      if (data?.publicUrl) {
        console.log("[club-logo-utils] Successfully converted to public URL:", data.publicUrl);
        return data.publicUrl;
      } else {
        console.warn("[club-logo-utils] No publicUrl in response:", { logoUrl, data });
        // Si pas de publicUrl, retourner le chemin original
        return logoUrl;
      }
    } catch (e) {
      console.warn("[club-logo-utils] Exception getting public URL:", {
        logoUrl,
        error: e instanceof Error ? e.message : String(e)
      });
      // En cas d'erreur, retourner le chemin original
      return logoUrl;
    }
  } else {
    console.warn("[club-logo-utils] Supabase admin client not available");
    // Si pas d'admin client, retourner le chemin original (peut-être que c'est déjà une URL valide)
    return logoUrl;
  }
}

