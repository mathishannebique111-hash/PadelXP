import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

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
      console.log("[API /clubs/list] Using service role key to bypass RLS");
      supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceRoleKey,
        { auth: { persistSession: false } }
      ) as any;
    }
    
    console.log("[API /clubs/list] Fetching clubs...");
    
    // Essayer d'abord avec toutes les colonnes
    let { data, error } = await supabase
      .from("clubs")
      .select("*")
      .order("name", { ascending: true });

    console.log("[API /clubs/list] First attempt:", { dataCount: data?.length, error });

    // Si erreur ou pas de données, essayer avec des colonnes spécifiques
    if (error || !data || data.length === 0) {
      console.log("[API /clubs/list] Trying with specific columns...");
      const result = await supabase
        .from("clubs")
        .select("id, name, slug, code_invitation, status, club_name, club_slug")
        .order("name", { ascending: true });
      data = result.data;
      error = result.error;
      console.log("[API /clubs/list] Second attempt:", { dataCount: data?.length, error });
    }

    if (error) {
      console.error("[API /clubs/list] Error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json({ 
        error: error.message || "Failed to fetch clubs",
        details: error.details,
        hint: error.hint 
      }, { status: 400 });
    }

    if (!data || data.length === 0) {
      console.warn("[API /clubs/list] No clubs found in database");
      return NextResponse.json({ clubs: [] });
    }

    console.log("[API /clubs/list] Raw data received:", data.length, "clubs");

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

    console.log("[API /clubs/list] Normalized clubs:", normalizedClubs.length, normalizedClubs.map(c => c.name));

    if (normalizedClubs.length === 0) {
      console.warn("[API /clubs/list] No valid clubs after normalization");
      return NextResponse.json({ clubs: [] });
    }

    return NextResponse.json({ clubs: normalizedClubs }, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (e: any) {
    console.error("[API /clubs/list] Exception:", e);
    return NextResponse.json({ 
      error: "Server error",
      message: e?.message || "Unknown error"
    }, { status: 500 });
  }
}

