import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
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

type KnockoutMatch = {
  id: string;
  round_type: string;
  status: string;
  match_order: number | null;
  winner_registration_id: string | null;
};

const ROUND_ORDER = [
  "round_of_64",
  "round_of_32",
  "round_of_16",
  "quarters",
  "semis",
  "final",
] as const;

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Admin client not configured" },
        { status: 500 }
      );
    }

    const { id } = params;

    // Vérifier que l'utilisateur est bien admin du club du tournoi
    const { data: tournament, error: tournamentError } = await supabaseAdmin
      .from("tournaments")
      .select("club_id")
      .eq("id", id)
      .single();

    if (tournamentError || !tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const { data: clubAdmin } = await supabaseAdmin
      .from("club_admins")
      .select("club_id")
      .eq("user_id", user.id)
      .eq("club_id", tournament.club_id)
      .not("activated_at", "is", null)
      .maybeSingle();

    if (!clubAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Récupérer tous les matchs à élimination directe (hors poules / qualifications)
    const { data: allKnockoutMatches, error: matchesError } = await supabaseAdmin
      .from("tournament_matches")
      .select(
        "id, round_type, status, match_order, winner_registration_id"
      )
      .eq("tournament_id", id)
      .is("pool_id", null)
      .not("round_type", "eq", "pool")
      .not("round_type", "eq", "qualifications");

    if (matchesError || !allKnockoutMatches || allKnockoutMatches.length === 0) {
      return NextResponse.json(
        { error: "Aucun match du tableau final trouvé pour ce tournoi." },
        { status: 400 }
      );
    }

    const matches = allKnockoutMatches as KnockoutMatch[];

    // Déterminer dynamiquement le tour courant pour lequel on peut générer le tour suivant :
    // - tous les matchs de ce tour sont terminés (status=completed et winner_registration_id non nul)
    // - aucun match du tour suivant n'existe encore
    const existingRounds = Array.from(
      new Set(matches.map((m) => m.round_type))
    );

    let currentRound: string | null = null;
    let nextRound: string | null = null;

    for (const round of ROUND_ORDER) {
      if (!existingRounds.includes(round)) continue;

      const currentIndex = ROUND_ORDER.indexOf(round);
      if (currentIndex === -1 || currentIndex === ROUND_ORDER.length - 1) {
        continue;
      }

      const currentRoundMatches = matches.filter(
        (m) => m.round_type === round
      );
      if (currentRoundMatches.length === 0) continue;

      const roundCompleted = currentRoundMatches.every(
        (m) => m.status === "completed" && m.winner_registration_id
      );
      if (!roundCompleted) continue;

      const candidateNextRound = ROUND_ORDER[currentIndex + 1];
      const nextRoundMatchesExist = matches.some(
        (m) => m.round_type === candidateNextRound
      );
      if (nextRoundMatchesExist) continue;

      currentRound = round;
      nextRound = candidateNextRound;
      break;
    }

    if (!currentRound || !nextRound) {
      return NextResponse.json(
        {
          error:
            "Aucun tour suivant ne peut être généré. Vérifie que tous les matchs du tour courant sont terminés et que le tour suivant n'existe pas encore.",
        },
        { status: 400 }
      );
    }

    const currentRoundMatches = matches.filter(
      (m) => m.round_type === currentRound
    );

    // Générer les matchs du tour suivant par paires de vainqueurs
    const sortedByOrder = currentRoundMatches
      .slice()
      .sort((a, b) => (a.match_order ?? 0) - (b.match_order ?? 0));

    const winners = sortedByOrder.map((m) => m.winner_registration_id!);

    if (winners.length < 2) {
      return NextResponse.json(
        { error: "Nombre insuffisant de vainqueurs pour générer un tour suivant." },
        { status: 400 }
      );
    }

    const nextRoundMatches = [];
    let matchOrder = 1;

    for (let i = 0; i < winners.length; i += 2) {
      const team1 = winners[i];
      const team2 = winners[i + 1] ?? null;

      nextRoundMatches.push({
        tournament_id: id,
        round_type: nextRound,
        round_number: 1,
        match_order: matchOrder++,
        team1_registration_id: team1,
        team2_registration_id: team2,
        is_bye: team2 === null,
        status: team2 === null ? "completed" : "scheduled",
      });
    }

    const { error: insertError } = await supabaseAdmin
      .from("tournament_matches")
      .insert(nextRoundMatches);

    if (insertError) {
      logger.error(
        {
          tournamentId: id.substring(0, 8) + "…",
          error: insertError.message,
        },
        "[advance/final-next-round] Error inserting next round matches"
      );
      return NextResponse.json(
        { error: "Erreur lors de la création du tour suivant du tableau final." },
        { status: 500 }
      );
    }

    logger.info(
      {
        tournamentId: id.substring(0, 8) + "…",
        currentRound,
        nextRound,
        created: nextRoundMatches.length,
      },
      "[advance/final-next-round] Next knockout round generated from winners"
    );

    return NextResponse.json({
      success: true,
      currentRound,
      nextRound,
      matchesCreated: nextRoundMatches.length,
    });
  } catch (error: any) {
    logger.error(
      { error: error.message, stack: error.stack },
      "[advance/final-next-round] Unexpected error"
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


