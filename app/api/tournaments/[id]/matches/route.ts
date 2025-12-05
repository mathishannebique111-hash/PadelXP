import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params;

    // Paramètres de filtrage optionnels
    const { searchParams } = new URL(request.url);
    const roundType = searchParams.get("round_type");
    const status = searchParams.get("status");
    const poolId = searchParams.get("pool_id");

    let query = supabase
      .from("tournament_matches")
      .select("*")
      .eq("tournament_id", id);

    // Appliquer filtres
    if (roundType) {
      query = query.eq("round_type", roundType);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (poolId) {
      query = query.eq("pool_id", poolId);
    }

    // Trier par scheduled_time, puis par round_number et match_order
    query = query
      .order("scheduled_time", { ascending: true, nullsFirst: false })
      .order("round_number", { ascending: true, nullsFirst: false })
      .order("match_order", { ascending: true, nullsFirst: false });

    const { data: matches, error } = await query;

    if (error) {
      logger.error(
        {
          tournamentId: id.substring(0, 8) + "…",
          userId: user.id.substring(0, 8) + "…",
          error: error.message,
        },
        "Error fetching matches"
      );

      return NextResponse.json(
        { error: "Error fetching matches" },
        { status: 500 }
      );
    }

    if (!matches || matches.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    // Récupérer les inscriptions pour avoir les noms des équipes
    const registrationIds = Array.from(
      new Set(
        matches
          .flatMap((m: any) => [
            m.team1_registration_id,
            m.team2_registration_id,
          ])
          .filter(Boolean)
      )
    ) as string[];

    let registrationsMap: Record<string, { teamName: string }> = {};

    if (registrationIds.length > 0) {
      const { data: registrations, error: regError } = await supabase
        .from("tournament_registrations")
        .select("id, player1_name, player2_name, seed_number")
        .in("id", registrationIds);

      if (regError) {
        logger.warn(
          {
            tournamentId: id.substring(0, 8) + "…",
            error: regError.message,
          },
          "Error fetching registrations for matches (names will be generic)"
        );
      } else if (registrations) {
        registrationsMap = registrations.reduce(
          (acc: Record<string, { teamName: string; seedNumber?: number | null }>, reg: any) => {
            const name =
              reg.player1_name && reg.player2_name
                ? `${reg.player1_name} / ${reg.player2_name}`
                : reg.player1_name || reg.player2_name || "Équipe";
            acc[reg.id] = { teamName: name, seedNumber: reg.seed_number ?? null };
            return acc;
          },
          {}
        );
      }
    }

    const enrichedMatches = matches.map((m: any) => ({
      ...m,
      team1_name:
        (m.team1_registration_id &&
          registrationsMap[m.team1_registration_id]?.teamName) ||
        null,
      team2_name:
        (m.team2_registration_id &&
          registrationsMap[m.team2_registration_id]?.teamName) ||
        null,
      team1_seed_number:
        m.team1_registration_id
          ? registrationsMap[m.team1_registration_id]?.seedNumber ?? null
          : null,
      team2_seed_number:
        m.team2_registration_id
          ? registrationsMap[m.team2_registration_id]?.seedNumber ?? null
          : null,
    }));

    logger.info(
      {
        tournamentId: id.substring(0, 8) + "…",
        userId: user.id.substring(0, 8) + "…",
        count: enrichedMatches.length,
        filters: { roundType, status, poolId },
      },
      "Matches fetched"
    );

    return NextResponse.json({ matches: enrichedMatches });
  } catch (error: any) {
    logger.error(
      {
        error: error?.message ?? String(error),
        stack: error?.stack,
      },
      "Unexpected error"
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

