import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";

// Créer un client admin avec la Service Role Key pour bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET(req: Request) {
  try {
    // Vérifier les variables d'environnement
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ 
        error: 'Server configuration error',
        message: 'Missing required environment variables'
      }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    // Si la requête est vide, retourner un tableau vide
    if (!query.trim()) {
      return NextResponse.json({ players: [] });
    }

    // Récupérer l'utilisateur depuis la session
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Vérifier d'abord la session pour éviter les déconnexions inattendues
    // Si une session existe mais getUser() échoue temporairement, on ne déconnecte pas
    const { data: { session } } = await supabase.auth.getSession();
    
    // Essayer d'obtenir l'utilisateur avec gestion d'erreur gracieuse
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Si ni session ni utilisateur, retourner un tableau vide (401)
    if (!user && !session) {
      return NextResponse.json({ players: [] }, { status: 401 });
    }
    
    // Si une session existe mais getUser() échoue temporairement, logger un avertissement
    // et retourner un tableau vide plutôt qu'un 401 pour éviter de casser l'UI
    if (session && !user && authError) {
      logger.warn({ errorCode: authError?.code, errorMessage: authError?.message }, "[Search API] Session exists but getUser() failed (temporary error?)");
      // Retourner un tableau vide sans erreur 401 pour ne pas bloquer l'UI
      return NextResponse.json({ players: [] });
    }
    
    // Si pas d'utilisateur à ce stade, retourner un tableau vide
    if (!user) {
      return NextResponse.json({ players: [] }, { status: 401 });
    }

    let userClubId: string | null = null;

    const { data: userProfile, error: userProfileError } = await supabase
      .from("profiles")
      .select("club_id, display_name")
      .eq("id", user.id)
      .maybeSingle();

    if (userProfileError) {
      logger.error({ userId: user.id.substring(0, 8) + "…", error: userProfileError }, '[Search API] Error fetching user profile (client)');
    }

    if (userProfile?.club_id) {
      userClubId = userProfile.club_id;
    } else {
      const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
        .from("profiles")
        .select("club_id, display_name")
        .eq("id", user.id)
        .maybeSingle();

      if (adminProfileError) {
        logger.error({ userId: user.id.substring(0, 8) + "…", error: adminProfileError }, '[Search API] Error fetching user profile (admin)');
      }

      if (adminProfile?.club_id) {
        userClubId = adminProfile.club_id;
      }
    }

    if (!userClubId) {
      const userIdPreview = user.id.substring(0, 8) + "…";
      logger.warn(
        { userId: userIdPreview },
        "[Search API] User without club attempting search"
      );
      return NextResponse.json({ players: [] }, { status: 403 });
    }    

    const results: Array<{
      id: string;
      first_name: string;
      last_name: string;
      type: "user";
      display_name: string;
    }> = [];

    // Construire la requête de base avec le client admin (bypass RLS)
    let profilesQuery = supabaseAdmin
      .from("profiles")
      .select("id, display_name, first_name, last_name, club_id")
      .eq("club_id", userClubId);

    // Recherche simple avec ilike sur display_name, first_name et last_name
    const queryLower = query.toLowerCase().trim();
    logger.info({ userId: user.id.substring(0, 8) + "…", clubId: userClubId.substring(0, 8) + "…", query: queryLower }, '[Search API] Search query');
    
    // Recherche sur plusieurs colonnes
    profilesQuery = profilesQuery.or(
      `display_name.ilike.%${queryLower}%,first_name.ilike.%${queryLower}%,last_name.ilike.%${queryLower}%`
    );

    // Exécuter la requête
    logger.info({ userId: user.id.substring(0, 8) + "…", clubId: userClubId.substring(0, 8) + "…" }, '[Search API] Executing profiles query');
    const { data: profiles, error: profilesError } = await profilesQuery.limit(50);

    if (profilesError) {
      logger.error({ userId: user.id.substring(0, 8) + "…", clubId: userClubId.substring(0, 8) + "…", error: { message: profilesError.message, details: profilesError.details, hint: profilesError.hint, code: profilesError.code } }, '[Search API] Error fetching profiles');
      return NextResponse.json({ 
        players: [], 
        error: 'Database error',
        message: profilesError.message,
        details: profilesError.details
      }, { status: 500 });
    }

    logger.info({ userId: user.id.substring(0, 8) + "…", clubId: userClubId.substring(0, 8) + "…", profilesCount: profiles?.length || 0 }, '[Search API] Found profiles');
    if (profiles && profiles.length > 0) {
      logger.info({ userId: user.id.substring(0, 8) + "…", sampleProfiles: profiles.slice(0, 3).map((p: any) => ({
        id: p.id.substring(0, 8) + "…",
        display_name: p.display_name,
        club_id: p.club_id?.substring(0, 8) + "…" || null
      })) }, '[Search API] Sample profiles');
    }

    const { data: clubRecord, error: clubError } = await supabaseAdmin
      .from("clubs")
      .select("id, name")
      .eq("id", userClubId)
      .maybeSingle();

    if (clubError) {
      logger.error({ userId: user.id.substring(0, 8) + "…", clubId: userClubId.substring(0, 8) + "…", error: clubError }, '[Search API] Error fetching club record');
    }

    const normalizedClubName = clubRecord?.name
      ? clubRecord.name.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "")
      : null;

    // Traiter les résultats - tous les profils retournés par Supabase sont déjà filtrés
    if (profiles) {
      profiles.forEach((profile: any) => {
        let first_name = profile.first_name || "";
        let last_name = profile.last_name || "";
        
        if (!first_name && profile.display_name) {
          const nameParts = profile.display_name.trim().split(/\s+/);
          first_name = nameParts[0] || "";
          last_name = nameParts.slice(1).join(" ") || "";
        }

        const displayName = profile.display_name || `${first_name} ${last_name}`.trim();
        const normalizedDisplay = displayName
          .normalize("NFD").replace(/\p{Diacritic}/gu, "")
          .toLowerCase().replace(/[^a-z0-9]+/g, "");

        // Exclure les comptes club/complexe (nom identique au club)
        if (normalizedClubName && normalizedDisplay === normalizedClubName) {
          return;
        }

        results.push({
          id: profile.id,
          first_name,
          last_name,
          type: "user",
          display_name: displayName,
        });
      });
      logger.info({ userId: user.id.substring(0, 8) + "…", clubId: userClubId.substring(0, 8) + "…", resultsCount: results.length }, '[Search API] Added user profiles to results');
    } else {
      logger.info({ userId: user.id.substring(0, 8) + "…", clubId: userClubId.substring(0, 8) + "…" }, '[Search API] No profiles returned from query');
    }

    // Ne pas retourner les joueurs invités ici : création gérée côté formulaire

    // Trier les résultats (users déjà filtrés par club)
    const sortedResults = results.sort((a, b) =>
      a.display_name.localeCompare(b.display_name)
    );

    const finalResults = sortedResults.slice(0, 10);
    
    logger.info({ userId: user.id.substring(0, 8) + "…", clubId: userClubId.substring(0, 8) + "…", finalResultsCount: finalResults.length }, '[Search API] Final results count');
    logger.info({ userId: user.id.substring(0, 8) + "…", results: finalResults.map(p => ({
      id: p.id.substring(0, 8) + "…",
      display_name: p.display_name,
      type: p.type
    })) }, '[Search API] Returning results');
    
    return NextResponse.json({ players: finalResults });
  } catch (error: any) {
    logger.error({ error }, "Error in search API");
    return NextResponse.json({ 
      error: "Internal server error", 
      message: error?.message || "Unknown error"
    }, { status: 500 });
  }
}
