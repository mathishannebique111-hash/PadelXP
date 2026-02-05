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

    const requestedScope = searchParams.get("scope") || "global";

    // Si l'utilisateur n'a pas de club, il ne peut pas chercher "dans son club"
    // Mais il peut chercher en global
    if (!userClubId && requestedScope === "club") {
      const userIdPreview = user.id.substring(0, 8) + "…";
      logger.warn(
        "[Search API] User without club attempting club search",
        { userId: userIdPreview }
      );
      return NextResponse.json({ players: [] }, { status: 403 });
    }

    const results: Array<{
      id: string;
      first_name: string;
      last_name: string;
      type: "user" | "guest";
      display_name: string;
      club_name?: string | null;
      is_external?: boolean;
      email?: string | null;
    }> = [];

    const scope = searchParams.get("scope") || "global"; // 'club' or 'global'

    const queryLower = query.toLowerCase().trim();
    const searchPattern = `%${queryLower.replace(/'/g, "''")}%`; // Escape quotes manually for ilike

    logger.info('[Search API] Search query', { userId: user.id.substring(0, 8) + "…", query: queryLower, scope });

    // 1. Rechercher les profils (Users)
    let profilesQuery = supabaseAdmin
      .from("profiles")
      .select("id, display_name, first_name, last_name, club_id, email, clubs(name)")
      .not("id", "eq", GUEST_USER_ID);

    if (scope === "club" && userClubId) {
      profilesQuery = profilesQuery.eq("club_id", userClubId);
    }

    profilesQuery = profilesQuery.or(
      `display_name.ilike.${searchPattern},first_name.ilike.${searchPattern},last_name.ilike.${searchPattern}`
    );

    // Exécuter la requête des profils
    const { data: profiles, error: profilesError } = await profilesQuery.limit(20);

    if (profilesError) {
      logger.error('[Search API] Error fetching profiles', { userId: user.id.substring(0, 8) + "…", error: profilesError });
    }

    // 2. Rechercher les invités (Guests) - Uniquement ceux invités par l'utilisateur courant
    // On ne cherche les guests que si le scope n'est pas "club"
    let guests: any[] = [];
    if (scope !== "club") {
      const { data, error } = await supabaseAdmin
        .from("guest_players")
        .select("id, first_name, last_name, email")
        .eq("invited_by_user_id", user.id)
        .or(
          `first_name.ilike.${searchPattern},last_name.ilike.${searchPattern}`
        )
        .limit(10);

      if (error) {
        logger.error('[Search API] Error fetching guests', { userId: user.id.substring(0, 8) + "…", error });
      }
      guests = data || [];
    }

    // Traiter les profils (Users)
    if (profiles) {
      // Vérifier l'existence des utilisateurs dans Auth pour exclure les comptes supprimés (orphelins)
      const profilePromises = profiles.map(async (profile: any) => {
        if (profile.id === user.id) return null;

        const displayNameLower = (profile.display_name || "").toLowerCase();
        if (displayNameLower.includes("padel") && displayNameLower.includes("club")) {
          return null;
        }

        // Vérification stricte : L'utilisateur existe-t-il dans Auth ?
        // Cela permet de filtrer les profils orphelins restant après une suppression de compte
        try {
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.id);
          if (authError || !authData.user) {
            // logger.debug(`[Search API] Profile ${profile.id} is orphaned (no auth user), skipping`);
            return null;
          }
        } catch (e) {
          return null;
        }

        let first_name = profile.first_name || "";
        let last_name = profile.last_name || "";

        if (!first_name && profile.display_name) {
          const nameParts = profile.display_name.trim().split(/\s+/);
          first_name = nameParts[0] || "";
          last_name = nameParts.slice(1).join(" ") || "";
        }

        const displayName = profile.display_name || `${first_name} ${last_name}`.trim();

        return {
          id: profile.id,
          first_name,
          last_name,
          type: "user" as const,
          display_name: displayName,
          club_name: profile.clubs?.name || null,
          is_external: profile.club_id !== userClubId,
          email: profile.email || null
        };
      });

      const processedProfiles = await Promise.all(profilePromises);

      // Ajouter les profils valides aux résultats
      processedProfiles.forEach(p => {
        if (p) results.push(p);
      });
    }

    // Traiter les invités (Guests)
    if (guests) {
      guests.forEach((guest: any) => {
        const displayName = `${guest.first_name} ${guest.last_name}`.trim();
        results.push({
          id: guest.id,
          first_name: guest.first_name,
          last_name: guest.last_name,
          type: "guest",
          display_name: `${displayName} 👤`, // Ajouter une icône pour distinguer
          club_name: null,
          is_external: false,
          email: guest.email || null
        });
      });
    }

    // Trier les résultats
    const sortedResults = results.sort((a, b) => {
      // 1. Les invités de l'utilisateur en premier (facilite la selection)
      if (a.type !== b.type) {
        return a.type === 'guest' ? -1 : 1;
      }
      // 2. Membres du même club
      if (a.is_external !== b.is_external) {
        return a.is_external ? 1 : -1;
      }
      // 3. Alphabétique
      return a.display_name.localeCompare(b.display_name);
    });

    const finalResults = sortedResults.slice(0, 15);

    logger.info('[Search API] Final results count', {
      userId: user.id.substring(0, 8) + "…",
      total: finalResults.length,
      users: finalResults.filter(r => r.type === 'user').length,
      guests: finalResults.filter(r => r.type === 'guest').length
    });

    return NextResponse.json({ players: finalResults });
  } catch (error: any) {
    logger.error("Error in search API", { error });
    return NextResponse.json({
      error: "Internal server error",
      message: error?.message || "Unknown error"
    }, { status: 500 });
  }
}
