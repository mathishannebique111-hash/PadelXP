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


const GUEST_USER_ID = "00000000-0000-0000-0000-000000000000";

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
      logger.warn("[Search API] Session exists but getUser() failed (temporary error?)", { errorCode: authError?.code, errorMessage: authError?.message });
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
      logger.error('[Search API] Error fetching user profile (client)', { userId: user.id.substring(0, 8) + "…", error: userProfileError });
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
        logger.error('[Search API] Error fetching user profile (admin)', { userId: user.id.substring(0, 8) + "…", error: adminProfileError });
      }

      if (adminProfile?.club_id) {
        userClubId = adminProfile.club_id;
      }
    }

    if (!userClubId) {
      const userIdPreview = user.id.substring(0, 8) + "…";
      logger.warn(
        "[Search API] User without club attempting search",
        { userId: userIdPreview }
      );
      return NextResponse.json({ players: [] }, { status: 403 });
    }

    const results: Array<{
      id: string;
      first_name: string;
      last_name: string;
      type: "user";
      display_name: string;
      club_name?: string | null;
      is_external?: boolean;
      email?: string | null;
    }> = [];

    const scope = searchParams.get("scope") || "global"; // 'club' or 'global'

    // ... (existing code)

    // Construire la requête de base avec le client admin (bypass RLS)
    // RECHERCHE GLOBALE : On ne filtre plus par club_id SAUF si scope='club'
    let profilesQuery = supabaseAdmin
      .from("profiles")
      .select("id, display_name, first_name, last_name, club_id, email, clubs(name)") // Récupérer le nom du club via la relation
      .not("id", "eq", GUEST_USER_ID); // Exclure le user invité générique

    // Filtrer par club si demandé
    if (scope === "club" && userClubId) {
      profilesQuery = profilesQuery.eq("club_id", userClubId);
    } else if (scope === "global" && userClubId) {
      // Si mode Global, on exclut les joueurs de notre propre club (car ils sont dans l'onglet Club)
      profilesQuery = profilesQuery.neq("club_id", userClubId);
    }

    // Recherche simple avec ilike sur display_name, first_name et last_name ou username
    const queryLower = query.toLowerCase().trim();
    logger.info('[Search API] Search query', { userId: user.id.substring(0, 8) + "…", query: queryLower, scope });

    // Recherche sur plusieurs colonnes (inclure username si possible, sinon rester sur les noms)
    profilesQuery = profilesQuery.or(
      `display_name.ilike.%${queryLower}%,first_name.ilike.%${queryLower}%,last_name.ilike.%${queryLower}%`
      // Ajouter username si la colonne existe (à vérifier, sinon on laisse comme ça)
    );

    // Exécuter la requête
    logger.info('[Search API] Executing global profiles query', { userId: user.id.substring(0, 8) + "…" });
    const { data: profiles, error: profilesError } = await profilesQuery.limit(20); // Limiter à 20 pour la perf

    if (profilesError) {
      logger.error('[Search API] Error fetching profiles', { userId: user.id.substring(0, 8) + "…", error: { message: profilesError.message, details: profilesError.details, hint: profilesError.hint, code: profilesError.code } });
      return NextResponse.json({
        players: [],
        error: 'Database error',
        message: profilesError.message,
        details: profilesError.details
      }, { status: 500 });
    }

    logger.info('[Search API] Found profiles (global)', { userId: user.id.substring(0, 8) + "…", profilesCount: profiles?.length || 0 });

    // Traiter les résultats
    if (profiles) {
      profiles.forEach((profile: any) => {
        // Ignorer l'utilisateur lui-même
        if (profile.id === user.id) return;

        // Ignorer les comptes qui ressemblent trop à des noms de clubs (comptes de gestion)
        // On fait une vérification basique ici
        const displayNameLower = (profile.display_name || "").toLowerCase();
        if (displayNameLower.includes("padel") && displayNameLower.includes("club")) {
          return;
        }

        let first_name = profile.first_name || "";
        let last_name = profile.last_name || "";

        if (!first_name && profile.display_name) {
          const nameParts = profile.display_name.trim().split(/\s+/);
          first_name = nameParts[0] || "";
          last_name = nameParts.slice(1).join(" ") || "";
        }

        const displayName = profile.display_name || `${first_name} ${last_name}`.trim();

        // Récupérer le nom du club
        const clubName = profile.clubs?.name || null;
        const isExternal = profile.club_id !== userClubId;

        results.push({
          id: profile.id,
          first_name,
          last_name,
          type: "user",
          display_name: displayName,
          club_name: clubName,
          is_external: isExternal,
          email: profile.email || null
        });
      });
      logger.info('[Search API] Added user profiles to results', { userId: user.id.substring(0, 8) + "…", resultsCount: results.length });
    }

    // Trier les résultats : priorité aux membres du même club, puis alphabétique
    const sortedResults = results.sort((a, b) => {
      // D'abord les membres du même club
      if (a.is_external !== b.is_external) {
        return a.is_external ? 1 : -1;
      }
      // Ensuite alphabétique
      return a.display_name.localeCompare(b.display_name);
    });

    const finalResults = sortedResults.slice(0, 10);

    logger.info('[Search API] Final results count', { userId: user.id.substring(0, 8) + "…", finalResultsCount: finalResults.length });

    return NextResponse.json({ players: finalResults });
  } catch (error: any) {
    logger.error("Error in search API", { error });
    return NextResponse.json({
      error: "Internal server error",
      message: error?.message || "Unknown error"
    }, { status: 500 });
  }
}
