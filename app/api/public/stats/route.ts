import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase non configuré côté serveur" },
      { status: 500 }
    );
  }

  const supabaseAdmin = createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Compter les vrais joueurs inscrits (ceux avec un compte auth)
    const { count: authUsersCount, error: authUsersError } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .not("id", "is", null);

    if (authUsersError) {
      logger.error({ error: authUsersError }, "[public/stats] auth users count error:");
    }

    // Vérifier combien de profils correspondent à des utilisateurs auth réels
    // Récupérer TOUS les utilisateurs en paginant (par défaut listUsers() limite à 50)
    let allAuthUsers: any[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 1000, // Maximum par page
      });
      
      if (error) {
        logger.error({ error, page }, "[public/stats] auth check error:");
        break;
      }
      
      if (data?.users && data.users.length > 0) {
        allAuthUsers = allAuthUsers.concat(data.users);
        page++;
        
        // Si on a reçu moins que perPage, il n'y a plus de pages
        if (data.users.length < 1000) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    const realPlayerCount = allAuthUsers.length;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startIso = startOfMonth.toISOString();

    const [
      { count: matchesCount, error: matchesError },
      { data: activeParticipants, error: participantsError },
    ] = await Promise.all([
      supabaseAdmin
        .from("matches")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startIso),
      supabaseAdmin
        .from("match_participants")
        .select("user_id, matches!inner(created_at)")
        .gte("matches.created_at", startIso),
    ]);

    if (matchesError) {
      logger.error({ error: matchesError }, "[public/stats] matches count error:");
    }
    if (participantsError) {
      logger.error({ error: participantsError }, "[public/stats] participants error:");
    }

    const uniqueActivePlayers = new Set(
      (activeParticipants || [])
        .map((p: any) => p.user_id)
        .filter(
          (id: string) => id && id !== "00000000-0000-0000-0000-000000000000"
        )
    );

    return NextResponse.json(
      {
        totalPlayers: realPlayerCount,
        activePlayers: uniqueActivePlayers.size,
        totalMatches: matchesCount || 0,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined }, "[public/stats] unexpected error:");
    return NextResponse.json(
      { error: "Erreur lors du calcul des statistiques" },
      { status: 500 }
    );
  }
}

