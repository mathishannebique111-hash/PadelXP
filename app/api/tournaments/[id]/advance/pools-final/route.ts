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

type Registration = {
  id: string;
  pool_id: string | null;
  pair_total_rank: number | null;
};

type Match = {
  id: string;
  pool_id: string | null;
  status: string;
  winner_registration_id: string | null;
  team1_registration_id: string | null;
  team2_registration_id: string | null;
};

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

    // 1. Récupérer le tournoi
    const { data: tournament, error: tournamentError } = await supabaseAdmin
      .from("tournaments")
      .select("*")
      .eq("id", id)
      .single();

    if (tournamentError || !tournament) {
      logger.warn(
        {
          tournamentId: id.substring(0, 8) + "…",
          error: tournamentError?.message,
        },
        "[advance/pools-final] Tournament not found"
      );
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    if (
      tournament.tournament_type !== "official_pools" &&
      tournament.tournament_type !== "pools_triple_draw"
    ) {
      return NextResponse.json(
        {
          error:
            "Ce tournoi n'est pas en format 'poules + tableau final'. Impossible de générer le tableau final depuis les poules.",
        },
        { status: 400 }
      );
    }

    // 2. Vérifier que l'utilisateur est bien admin du club du tournoi
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

    // 3. Vérifier s'il existe déjà un tableau final (matchs sans pool_id, hors qualifications)
    const { data: existingFinalMatches, error: existingError } =
      await supabaseAdmin
        .from("tournament_matches")
        .select("id, status")
        .eq("tournament_id", id)
        .is("pool_id", null)
        .not("round_type", "eq", "qualifications");

    if (existingError) {
      logger.error(
        {
          tournamentId: id.substring(0, 8) + "…",
          error: existingError.message,
        },
        "[advance/pools-final] Error checking existing final matches"
      );
      return NextResponse.json(
        { error: "Erreur lors de la vérification du tableau final existant" },
        { status: 500 }
      );
    }

    if (existingFinalMatches && existingFinalMatches.length > 0) {
      // Un tableau final existe déjà : on le supprime entièrement
      // puis on regénère un nouveau tableau final à partir des résultats de poules.
      const { error: deleteError } = await supabaseAdmin
        .from("tournament_matches")
        .delete()
        .eq("tournament_id", id)
        .is("pool_id", null)
        .not("round_type", "eq", "qualifications");

      if (deleteError) {
        logger.error(
          {
            tournamentId: id.substring(0, 8) + "…",
            error: deleteError.message,
          },
          "[advance/pools-final] Error deleting existing final bracket matches"
        );
        return NextResponse.json(
          {
            error:
              "Erreur lors de la suppression de l'ancien tableau final. Réessaie dans quelques instants.",
          },
          { status: 500 }
        );
      }

      logger.info(
        {
          tournamentId: id.substring(0, 8) + "…",
          deletedMatches: existingFinalMatches.length,
        },
        "[advance/pools-final] Existing final bracket deleted before regeneration"
      );
    }

    // 4. Récupérer les poules
    const { data: pools, error: poolsError } = await supabaseAdmin
      .from("tournament_pools")
      .select("id, pool_number")
      .eq("tournament_id", id)
      .order("pool_number", { ascending: true });

    if (poolsError || !pools || pools.length === 0) {
      return NextResponse.json(
        {
          error:
            "Aucune poule trouvée pour ce tournoi. Génère d'abord les poules via 'Générer le tableau'.",
        },
        { status: 400 }
      );
    }

    // 5. Récupérer les inscriptions de poules
    const { data: registrations, error: regError } = await supabaseAdmin
      .from("tournament_registrations")
      .select("id, pool_id, pair_total_rank")
      .eq("tournament_id", id)
      .not("pool_id", "is", null);

    if (regError || !registrations || registrations.length === 0) {
      return NextResponse.json(
        {
          error:
            "Aucune inscription en poule trouvée. Vérifie que les inscriptions ont bien été affectées aux poules.",
        },
        { status: 400 }
      );
    }

    // 6. Récupérer les matchs de poule et vérifier qu'ils sont tous complétés
    const { data: poolMatches, error: matchesError } = await supabaseAdmin
      .from("tournament_matches")
      .select(
        "id, pool_id, status, winner_registration_id, team1_registration_id, team2_registration_id"
      )
      .eq("tournament_id", id)
      .eq("round_type", "pool");

    if (matchesError || !poolMatches || poolMatches.length === 0) {
      return NextResponse.json(
        {
          error:
            "Aucun match de poule trouvé pour ce tournoi. Génère d'abord les matchs de poule.",
        },
        { status: 400 }
      );
    }

    const incompleteMatch = poolMatches.find(
      (m: Match) => m.status !== "completed"
    );

    if (incompleteMatch) {
      return NextResponse.json(
        {
          error:
            "Tous les matchs de poule doivent être terminés avant de générer le tableau final.",
        },
        { status: 400 }
      );
    }

    // 7. Calculer le classement dans chaque poule (victoires, puis pair_total_rank)
    const regsByPool = new Map<string, Registration[]>();
    for (const reg of registrations as Registration[]) {
      if (!reg.pool_id) continue;
      const arr = regsByPool.get(reg.pool_id) ?? [];
      arr.push(reg);
      regsByPool.set(reg.pool_id, arr);
    }

    const matchesByPool = new Map<string, Match[]>();
    for (const match of poolMatches as Match[]) {
      if (!match.pool_id) continue;
      const arr = matchesByPool.get(match.pool_id) ?? [];
      arr.push(match);
      matchesByPool.set(match.pool_id, arr);
    }

    type RankedReg = Registration & { wins: number };
    const poolsQualifiers: RankedReg[][] = [];

    for (const pool of pools) {
      const regs = regsByPool.get(pool.id) ?? [];
      const matches = matchesByPool.get(pool.id) ?? [];

      if (regs.length === 0 || matches.length === 0) continue;

      const wins = new Map<string, number>();
      for (const r of regs) {
        wins.set(r.id, 0);
      }

      for (const match of matches) {
        if (!match.winner_registration_id) continue;
        const current = wins.get(match.winner_registration_id) ?? 0;
        wins.set(match.winner_registration_id, current + 1);
      }

      const ranked: RankedReg[] = regs.map((r) => ({
        ...r,
        wins: wins.get(r.id) ?? 0,
      }));

      ranked.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        const aRank = a.pair_total_rank ?? Number.MAX_SAFE_INTEGER;
        const bRank = b.pair_total_rank ?? Number.MAX_SAFE_INTEGER;
        return aRank - bRank; // meilleur total de rang = mieux classé
      });

      // Qualifier au moins les 2 premiers de la poule si disponibles
      const qualifiers = ranked.slice(0, Math.min(2, ranked.length));
      poolsQualifiers.push(qualifiers);
    }

    if (poolsQualifiers.length === 0) {
      return NextResponse.json(
        {
          error:
            "Aucune équipe qualifiée trouvée à partir des poules. Vérifie les résultats des matchs.",
        },
        { status: 400 }
      );
    }

    const winners: RankedReg[] = [];
    const runners: RankedReg[] = [];
    for (const q of poolsQualifiers) {
      if (q[0]) winners.push(q[0]);
      if (q[1]) runners.push(q[1]);
    }

    if (winners.length === 0 || runners.length === 0) {
      return NextResponse.json(
        {
          error:
            "Impossible de déterminer les 1ers et 2èmes de chaque poule. Vérifie qu'il y a au moins 2 équipes par poule.",
        },
        { status: 400 }
      );
    }

    const numPools = poolsQualifiers.length;
    const qualifiedCount = winners.length + runners.length;

    // 8. Créer le tableau final croisé : 1er vs 2ème d'une autre poule
    const bracketSize = qualifiedCount; // déjà une puissance de 2 si poules de 4
    let roundType = "quarters";
    if (bracketSize === 4) roundType = "semis";
    else if (bracketSize === 8) roundType = "quarters";
    else if (bracketSize === 16) roundType = "round_of_16";
    else if (bracketSize === 32) roundType = "round_of_32";

    const finalMatches: {
      tournament_id: string;
      round_type: string;
      round_number: number;
      match_order: number;
      team1_registration_id: string | null;
      team2_registration_id: string | null;
      is_bye: boolean;
      status: string;
    }[] = [];

    let matchOrder = 1;

    // Cas simple : 2 poules ⇒ 4 qualifiés ⇒ demi-finales
    if (numPools === 2 && qualifiedCount === 4) {
      finalMatches.push({
        tournament_id: id,
        round_type: roundType,
        round_number: 1,
        match_order: matchOrder++,
        team1_registration_id: winners[0]?.id ?? null,
        team2_registration_id: runners[1]?.id ?? null,
        is_bye: false,
        status: "scheduled",
      });
      finalMatches.push({
        tournament_id: id,
        round_type: roundType,
        round_number: 1,
        match_order: matchOrder++,
        team1_registration_id: winners[1]?.id ?? null,
        team2_registration_id: runners[0]?.id ?? null,
        is_bye: false,
        status: "scheduled",
      });
    } else {
      // Cas général : croiser les 1ers avec les 2èmes d'une autre poule
      for (let i = 0; i < numPools; i++) {
        const winner = winners[i];
        const opponentRunnerIndex = (numPools - 1 - i + numPools) % numPools;
        const runner = runners[opponentRunnerIndex];

        finalMatches.push({
          tournament_id: id,
          round_type: roundType,
          round_number: 1,
          match_order: matchOrder++,
          team1_registration_id: winner?.id ?? null,
          team2_registration_id: runner?.id ?? null,
          is_bye: false,
          status: "scheduled",
        });
      }
    }

    const { error: insertError } = await supabaseAdmin
      .from("tournament_matches")
      .insert(finalMatches);

    if (insertError) {
      logger.error(
        {
          tournamentId: id.substring(0, 8) + "…",
          error: insertError.message,
        },
        "[advance/pools-final] Error inserting final bracket matches"
      );
      return NextResponse.json(
        { error: "Erreur lors de la création du tableau final" },
        { status: 500 }
      );
    }

    logger.info(
      {
        tournamentId: id.substring(0, 8) + "…",
        numPools,
        qualifiedCount,
        matchesCreated: finalMatches.length,
      },
      "[advance/pools-final] Final knockout bracket generated from pools"
    );

    return NextResponse.json({
      success: true,
      numPools,
      qualifiedCount,
      matchesCreated: finalMatches.length,
    });
  } catch (error: any) {
    logger.error(
      { error: error.message, stack: error.stack },
      "[advance/pools-final] Unexpected error"
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


