import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  try {
    // Essayer d'abord avec le client serveur normal
    let supabase = await createClient();
    
    // Si disponible, utiliser le service role key pour contourner RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      logger.info({}, "[API /clubs/list] Using service role key to bypass RLS");
      supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceRoleKey,
        { auth: { persistSession: false } }
      ) as any;
    }
    
    logger.info({}, "[API /clubs/list] Fetching clubs...");
    
    // Essayer d'abord avec toutes les colonnes
    let { data, error } = await supabase
      .from("clubs")
      .select("*")
      .order("name", { ascending: true });

    logger.info({ dataCount: data?.length, error: error ? { message: error.message, code: error.code } : null }, "[API /clubs/list] First attempt");

    // Si erreur ou pas de données, essayer avec des colonnes spécifiques
    if (error || !data || data.length === 0) {
      logger.info({}, "[API /clubs/list] Trying with specific columns...");
      const result = await supabase
        .from("clubs")
        .select("id, name, slug, code_invitation, status, club_name, club_slug")
        .order("name", { ascending: true });
      data = result.data;
      error = result.error;
      logger.info({ dataCount: data?.length, error: error ? { message: error.message, code: error.code } : null }, "[API /clubs/list] Second attempt");
    }

    if (error) {
      logger.error({ message: error.message, details: error.details, hint: error.hint, code: error.code }, "[API /clubs/list] Error");
      return NextResponse.json({ 
        error: error.message || "Failed to fetch clubs",
        details: error.details,
        hint: error.hint 
      }, { status: 400 });
    }

    if (!data || data.length === 0) {
      logger.warn({}, "[API /clubs/list] No clubs found in database");
      return NextResponse.json({ clubs: [] });
    }

    logger.info({ clubsCount: data.length }, "[API /clubs/list] Raw data received");

    // Filtrer les clubs supprimés/désactivés
    const activeClubs = (data || []).filter((club: any) => {
      const status = club?.status ?? null;
      if (status && status !== "active") return false;
      return true;
    });

    // Normaliser les données pour gérer différents formats
    const normalizedClubs = activeClubs.map((club: any) => {
      const name = club.name || club.club_name || "Club sans nom";
      const slug = club.slug || club.club_slug || (name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '') : '');
      const code = club.code_invitation || club.invitation_code || club.code || '';
      
      return {
        name,
        slug,
        code_invitation: code,
      };
    }).filter((club: any) => club.name && club.slug && club.name !== "Club sans nom");

    logger.info({ normalizedCount: normalizedClubs.length, clubNames: normalizedClubs.map(c => c.name) }, "[API /clubs/list] Normalized clubs");

    if (normalizedClubs.length === 0) {
      logger.warn({}, "[API /clubs/list] No valid clubs after normalization");
      return NextResponse.json({ clubs: [] });
    }

    return NextResponse.json({ clubs: normalizedClubs }, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (e: any) {
    logger.error({ error: e?.message || String(e) }, "[API /clubs/list] Exception");
    return NextResponse.json({ 
      error: "Server error",
      message: e?.message || "Unknown error"
    }, { status: 500 });
  }
}

