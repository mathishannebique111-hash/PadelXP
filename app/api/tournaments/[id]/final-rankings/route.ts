import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin =
  SUPABASE_URL && SERVICE_ROLE_KEY
    ? createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Configuration serveur invalide" },
        { status: 500 }
      );
    }

    const { id } = await params;

    // Récupérer TOUTES les inscriptions avec leur classement final (même si null)
    const { data: registrations, error: regError } = await supabaseAdmin
      .from("tournament_registrations")
      .select("id, player1_name, player2_name, seed_number, final_ranking")
      .eq("tournament_id", id)
      .order("final_ranking", { ascending: true, nullsLast: true })
      .order("seed_number", { ascending: true, nullsLast: true });

    if (regError) {
      logger.error(
        { error: regError, tournamentId: id.substring(0, 8) + "…" },
        "[final-rankings] Error fetching registrations"
      );
      return NextResponse.json(
        { error: "Erreur lors de la récupération des classements" },
        { status: 500 }
      );
    }

    // Formater les données pour le frontend - inclure toutes les équipes
    const rankings = (registrations || []).map((reg: any) => {
      const teamName =
        reg.player1_name && reg.player2_name
          ? `${reg.player1_name} / ${reg.player2_name}`
          : reg.player1_name || reg.player2_name || "Équipe";

      return {
        registrationId: reg.id,
        rank: reg.final_ranking || null, // null si pas encore classé
        teamName: teamName,
        seedNumber: reg.seed_number,
      };
    });

    // Log pour déboguer
    logger.info(
      {
        tournamentId: id.substring(0, 8) + "…",
        totalRegistrations: registrations?.length || 0,
        rankingsWithPlace: rankings.filter((r: any) => r.rank !== null).length,
        rankingsWithoutPlace: rankings.filter((r: any) => r.rank === null).length,
        places: rankings
          .filter((r: any) => r.rank !== null)
          .map((r: any) => r.rank)
          .sort((a: number, b: number) => a - b),
      },
      "[final-rankings] Returning rankings"
    );

    return NextResponse.json({ rankings });
  } catch (error: any) {
    logger.error(
      { error: error?.message, stack: error?.stack },
      "[final-rankings] Error"
    );
    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

