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
  score: any | null;
};

type RankedReg = Registration & {
  wins: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  setDiff: number;
  gameDiff: number;
  pool_number?: number;
};

function computeFinalBracketStructure(nbEquipesTotal: number) {
  const taillePoule = 4;

  if (nbEquipesTotal % taillePoule !== 0) {
    throw new Error(
      "Erreur : le nombre total d'équipes doit être un multiple de 4 pour des poules de 4."
    );
  }

  const nbPoules = nbEquipesTotal / taillePoule;
  const nbQualifies = nbPoules * 2; // Top 2 par poule

  // Prochaine puissance de 2
  const prochainePuissance2 = Math.pow(
    2,
    Math.ceil(Math.log2(nbQualifies))
  );

  const nbByes = prochainePuissance2 - nbQualifies;

  if (nbByes < 0) {
    throw new Error(
      "Erreur : calcul des byes invalide (nb_byes < 0)."
    );
  }

  if (nbByes >= nbQualifies) {
    throw new Error(
      "Erreur : calcul des byes invalide (nb_byes >= nb_qualifies)."
    );
  }

  let roundType = "";
  if (prochainePuissance2 === 2) roundType = "final";
  else if (prochainePuissance2 === 4) roundType = "semis";
  else if (prochainePuissance2 === 8) roundType = "quarters";
  else if (prochainePuissance2 === 16) roundType = "round_of_16";
  else if (prochainePuissance2 === 32) roundType = "round_of_32";
  else {
    throw new Error(
      "Erreur : taille de tableau non supportée pour le tableau final."
    );
  }

  const nbMatchsPremierTour = (nbQualifies - nbByes) / 2;

  return {
    nb_qualifies: nbQualifies,
    nb_byes: nbByes,
    nb_matchs_premier_tour: nbMatchsPremierTour,
    round_type: roundType,
    bracket_size: prochainePuissance2,
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  let id: string | undefined;
  
  try {
    // Gérer params qui peut être une Promise dans Next.js 15
    const resolvedParams = await Promise.resolve(params);
    id = resolvedParams.id;
    
    if (!id) {
      return NextResponse.json(
        { error: "Tournament ID is required" },
        { status: 400 }
      );
    }

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
        "id, pool_id, status, winner_registration_id, team1_registration_id, team2_registration_id, score"
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

    // 7. Calculer le classement dans chaque poule
    //    Critères : victoires, sets +/- , jeux +/- , puis pair_total_rank
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

    const poolsQualifiers: RankedReg[][] = [];

    for (const pool of pools) {
      const regs = regsByPool.get(pool.id) ?? [];
      const matches = matchesByPool.get(pool.id) ?? [];

      if (regs.length === 0 || matches.length === 0) continue;

      const wins = new Map<string, number>();
      const setsWon = new Map<string, number>();
      const setsLost = new Map<string, number>();
      const gamesWon = new Map<string, number>();
      const gamesLost = new Map<string, number>();
      for (const r of regs) {
        wins.set(r.id, 0);
        setsWon.set(r.id, 0);
        setsLost.set(r.id, 0);
        gamesWon.set(r.id, 0);
        gamesLost.set(r.id, 0);
      }

      for (const match of matches) {
        if (!match.winner_registration_id) continue;
        const winnerId = match.winner_registration_id;
        const loserId =
          match.team1_registration_id === winnerId
            ? match.team2_registration_id
            : match.team1_registration_id;

        // Victoires
        const current = wins.get(winnerId) ?? 0;
        wins.set(winnerId, current + 1);

        // Détails de sets / jeux si le score est structuré
        const score = match.score;
        if (score && Array.isArray(score.sets)) {
          for (const set of score.sets as Array<{
            team1: number;
            team2: number;
          }>) {
            const t1 = set.team1 ?? 0;
            const t2 = set.team2 ?? 0;

            if (match.team1_registration_id) {
              const gw1 = gamesWon.get(match.team1_registration_id) ?? 0;
              const gl1 = gamesLost.get(match.team1_registration_id) ?? 0;
              gamesWon.set(match.team1_registration_id, gw1 + t1);
              gamesLost.set(match.team1_registration_id, gl1 + t2);
            }
            if (match.team2_registration_id) {
              const gw2 = gamesWon.get(match.team2_registration_id) ?? 0;
              const gl2 = gamesLost.get(match.team2_registration_id) ?? 0;
              gamesWon.set(match.team2_registration_id, gw2 + t2);
              gamesLost.set(match.team2_registration_id, gl2 + t1);
            }

            if (t1 === t2) continue;
            const setWinnerId =
              t1 > t2 ? match.team1_registration_id : match.team2_registration_id;
            const setLoserId =
              t1 > t2 ? match.team2_registration_id : match.team1_registration_id;

            if (setWinnerId) {
              const sw = setsWon.get(setWinnerId) ?? 0;
              setsWon.set(setWinnerId, sw + 1);
            }
            if (setLoserId) {
              const sl = setsLost.get(setLoserId) ?? 0;
              setsLost.set(setLoserId, sl + 1);
            }
          }
        }

        // Super tie-break : compter comme un set supplémentaire
        if (score && score.super_tiebreak) {
          const st = score.super_tiebreak as { team1: number; team2: number };
          const t1 = st.team1 ?? 0;
          const t2 = st.team2 ?? 0;

          if (match.team1_registration_id) {
            const gw1 = gamesWon.get(match.team1_registration_id) ?? 0;
            const gl1 = gamesLost.get(match.team1_registration_id) ?? 0;
            gamesWon.set(match.team1_registration_id, gw1 + t1);
            gamesLost.set(match.team1_registration_id, gl1 + t2);
          }
          if (match.team2_registration_id) {
            const gw2 = gamesWon.get(match.team2_registration_id) ?? 0;
            const gl2 = gamesLost.get(match.team2_registration_id) ?? 0;
            gamesWon.set(match.team2_registration_id, gw2 + t2);
            gamesLost.set(match.team2_registration_id, gl2 + t1);
          }

          if (t1 !== t2) {
            const stWinnerId =
              t1 > t2
                ? match.team1_registration_id
                : match.team2_registration_id;
            const stLoserId =
              t1 > t2
                ? match.team2_registration_id
                : match.team1_registration_id;
            if (stWinnerId) {
              const sw = setsWon.get(stWinnerId) ?? 0;
              setsWon.set(stWinnerId, sw + 1);
            }
            if (stLoserId) {
              const sl = setsLost.get(stLoserId) ?? 0;
              setsLost.set(stLoserId, sl + 1);
            }
          }
        }
      }

      const ranked: RankedReg[] = regs.map((r) => {
        const w = wins.get(r.id) ?? 0;
        const sw = setsWon.get(r.id) ?? 0;
        const sl = setsLost.get(r.id) ?? 0;
        const gw = gamesWon.get(r.id) ?? 0;
        const gl = gamesLost.get(r.id) ?? 0;

        return {
          ...r,
          wins: w,
          setsWon: sw,
          setsLost: sl,
          gamesWon: gw,
          gamesLost: gl,
          setDiff: sw - sl,
          gameDiff: gw - gl,
        };
      });

      ranked.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
        if (b.gameDiff !== a.gameDiff) return b.gameDiff - a.gameDiff;
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

    // Construire un map pour retrouver les qualifiés par poule
    // Note: poolsQualifiers est construit dans l'ordre des pools, donc l'index correspond
    const winnersByPool = new Map<number, RankedReg>();
    const runnersByPool = new Map<number, RankedReg>();
    
    // Créer un map pool.id -> pool pour faciliter la recherche
    const poolsById = new Map<string, { id: string; pool_number: number }>();
    for (const pool of pools) {
      poolsById.set(pool.id, pool);
    }
    
    // Construire poolsQualifiers avec l'index correspondant au pool_number
    for (let i = 0; i < poolsQualifiers.length; i++) {
      const qualifiers = poolsQualifiers[i];
      if (qualifiers && qualifiers.length > 0) {
        // Trouver la poule correspondante en utilisant pool_id du premier qualifié
        const firstQualifier = qualifiers[0];
        if (firstQualifier && firstQualifier.pool_id) {
          const pool = poolsById.get(firstQualifier.pool_id);
          if (pool) {
            if (qualifiers[0]) {
              const winner = { ...qualifiers[0], pool_number: pool.pool_number };
              winnersByPool.set(pool.pool_number, winner);
            }
            if (qualifiers[1]) {
              const runner = { ...qualifiers[1], pool_number: pool.pool_number };
              runnersByPool.set(pool.pool_number, runner);
            }
          }
        }
      }
    }

    const winners: RankedReg[] = Array.from(winnersByPool.values());
    const runners: RankedReg[] = Array.from(runnersByPool.values());

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

    // 8. Calculer la structure du tableau final (nb qualifiés, byes, type de tour)
    const totalTeams = numPools * 4;
    let structure;
    try {
      structure = computeFinalBracketStructure(totalTeams);
    } catch (error: any) {
      logger.error(
        {
          tournamentId: id.substring(0, 8) + "…",
          totalTeams,
          numPools,
          error: error.message,
        },
        "[advance/pools-final] Error computing bracket structure"
      );
      return NextResponse.json(
        {
          error: error.message || "Erreur lors du calcul de la structure du tableau final.",
        },
        { status: 400 }
      );
    }

    if (qualifiedCount !== structure.nb_qualifies) {
      return NextResponse.json(
        {
          error:
            "Erreur : incohérence entre le nombre d'équipes qualifiées et la structure attendue du tableau final.",
        },
        { status: 400 }
      );
    }

    const { nb_byes, nb_matchs_premier_tour, round_type, bracket_size } =
      structure;

    // 9. Classer les 1ers de poule entre eux pour déterminer les têtes de série (TS1 à TS4)
    //    Critères : victoires, sets +/- , jeux +/- , puis pair_total_rank
    const winnersSorted = [...winners].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
      if (b.gameDiff !== a.gameDiff) return b.gameDiff - a.gameDiff;
      const aRank = a.pair_total_rank ?? Number.MAX_SAFE_INTEGER;
      const bRank = b.pair_total_rank ?? Number.MAX_SAFE_INTEGER;
      return aRank - bRank; // meilleur total de rang = mieux classé
    });


    // Attribution des byes :
    // 1) Tous les 1ers de poule en priorité
    // 2) Si pas assez de 1ers, compléter avec les meilleurs 2èmes
    const byeTeams: RankedReg[] = [];
    let remainingByes = nb_byes;

    for (const w of winnersSorted) {
      if (remainingByes <= 0) break;
      byeTeams.push(w);
      remainingByes--;
    }

    // Si besoin, compléter avec les runners (trier d'abord)
    const runnersSorted = [...runners].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
      if (b.gameDiff !== a.gameDiff) return b.gameDiff - a.gameDiff;
      const aRank = a.pair_total_rank ?? Number.MAX_SAFE_INTEGER;
      const bRank = b.pair_total_rank ?? Number.MAX_SAFE_INTEGER;
      return aRank - bRank;
    });

    if (remainingByes > 0) {
      for (const r of runnersSorted) {
        if (remainingByes <= 0) break;
        byeTeams.push(r);
        remainingByes--;
      }
    }

    const byeIds = new Set(byeTeams.map((t) => t.id));

    const finalMatches: {
      tournament_id: string;
      round_type: string;
      round_number: number;
      match_order: number;
      team1_registration_id: string | null;
      team2_registration_id: string | null;
      is_bye: boolean;
      status: string;
      winner_registration_id: string | null;
    }[] = [];

    let matchOrder = 1;
    const totalMatches = bracket_size / 2;

    // 10. Créer les matchs du premier tour selon la logique spécifique :
    // Pour 4 poules (A, B, C, D) avec 2 qualifiés par poule :
    // - Quart 1 : TS1 (1er de poule A) vs 2D (2e de poule D)
    // - Quart 2 : TS4 (1er de poule D) vs 2A (2e de poule A)
    // - Quart 3 : TS2 (1er de poule B) vs 2C (2e de poule C)
    // - Quart 4 : TS3 (1er de poule C) vs 2B (2e de poule B)

    if (numPools === 4 && qualifiedCount === 8) {
      // Cas spécifique : 4 poules, 8 qualifiés (2 par poule)
      // TS1, TS2, TS3, TS4 sont les 4 winners triés par sets_diff
      if (winnersSorted.length < 4) {
        logger.error(
          {
            tournamentId: id.substring(0, 8) + "…",
            winnersCount: winnersSorted.length,
          },
          "[advance/pools-final] Not enough winners for 4 pools"
        );
        return NextResponse.json(
          {
            error:
              "Erreur : il doit y avoir exactement 4 premiers de poule pour un tournoi à 4 poules.",
          },
          { status: 400 }
        );
      }

      const TS1 = winnersSorted[0]; // Meilleur winner
      const TS2 = winnersSorted[1];
      const TS3 = winnersSorted[2];
      const TS4 = winnersSorted[3]; // 4ème winner

      // Vérifier que tous les winners ont un pool_number
      if (!TS1.pool_number || !TS2.pool_number || !TS3.pool_number || !TS4.pool_number) {
        logger.error(
          {
            tournamentId: id.substring(0, 8) + "…",
            TS1Pool: TS1.pool_number,
            TS2Pool: TS2.pool_number,
            TS3Pool: TS3.pool_number,
            TS4Pool: TS4.pool_number,
          },
          "[advance/pools-final] Missing pool_number for winners"
        );
        return NextResponse.json(
          {
            error:
              "Erreur : impossible de déterminer la poule d'origine des qualifiés.",
          },
          { status: 500 }
        );
      }

      // Trouver les runners correspondants en utilisant le pool_number stocké dans chaque winner
      const pool1 = TS1.pool_number;
      const pool2 = TS2.pool_number;
      const pool3 = TS3.pool_number;
      const pool4 = TS4.pool_number;

      const runner1 = runnersByPool.get(pool1) ?? null; // 2A
      const runner2 = runnersByPool.get(pool2) ?? null; // 2B
      const runner3 = runnersByPool.get(pool3) ?? null; // 2C
      const runner4 = runnersByPool.get(pool4) ?? null; // 2D

      // Vérifier que tous les runners existent
      if (!runner1 || !runner2 || !runner3 || !runner4) {
        logger.error(
          {
            tournamentId: id.substring(0, 8) + "…",
            runner1: !!runner1,
            runner2: !!runner2,
            runner3: !!runner3,
            runner4: !!runner4,
          },
          "[advance/pools-final] Missing runners"
        );
        return NextResponse.json(
          {
            error:
              "Erreur : impossible de trouver tous les deuxièmes de poule.",
          },
          { status: 500 }
        );
      }

      // Créer les 4 quarts selon la logique
      const quarters = [
        { winner: TS1, runner: runner4, seed: 1 }, // Quart 1 : TS1 vs 2D
        { winner: TS4, runner: runner1, seed: 4 }, // Quart 2 : TS4 vs 2A
        { winner: TS2, runner: runner3, seed: 2 }, // Quart 3 : TS2 vs 2C
        { winner: TS3, runner: runner2, seed: 3 }, // Quart 4 : TS3 vs 2B
      ];

      for (const quarter of quarters) {
        // Vérifier si l'une des équipes a un bye
        const winnerHasBye = quarter.winner && byeIds.has(quarter.winner.id);
        const runnerHasBye = quarter.runner && byeIds.has(quarter.runner.id);

        if (winnerHasBye || runnerHasBye) {
          // Si l'une des équipes a un bye, créer un match bye
          const teamWithBye = winnerHasBye ? quarter.winner : quarter.runner;
          finalMatches.push({
            tournament_id: id,
            round_type,
            round_number: 1,
            match_order: matchOrder++,
            team1_registration_id: teamWithBye?.id ?? null,
            team2_registration_id: null,
            is_bye: true,
            status: "completed",
            winner_registration_id: teamWithBye?.id ?? null,
          });
        } else if (quarter.winner && quarter.runner) {
          // Match normal sans bye
          finalMatches.push({
            tournament_id: id,
            round_type,
            round_number: 1,
            match_order: matchOrder++,
            team1_registration_id: quarter.winner.id,
            team2_registration_id: quarter.runner.id,
            is_bye: false,
            status: "scheduled",
            winner_registration_id: null,
          });
        }
      }

      // Vérifier que le nombre de matchs créés correspond au nombre attendu
      if (finalMatches.length !== totalMatches) {
        logger.error(
          {
            tournamentId: id.substring(0, 8) + "…",
            matchesCreated: finalMatches.length,
            expectedMatches: totalMatches,
          },
          "[advance/pools-final] Mismatch in number of matches created"
        );
        return NextResponse.json(
          {
            error:
              `Erreur : nombre de matchs créés (${finalMatches.length}) ne correspond pas au nombre attendu (${totalMatches}).`,
          },
          { status: 500 }
        );
      }
    } else {
      // Pour les autres configurations (pas 4 poules ou pas 8 qualifiés), utiliser l'ancienne logique
      const playingTeams: RankedReg[] = [];
      for (const w of winnersSorted) {
        if (!byeIds.has(w.id)) playingTeams.push(w);
      }
      for (const r of runnersSorted) {
        if (!byeIds.has(r.id)) playingTeams.push(r);
      }

      // Créer les matchs avec bye d'abord
      for (let i = 0; i < nb_byes; i++) {
        const team = byeTeams[i];
        finalMatches.push({
          tournament_id: id,
          round_type,
          round_number: 1,
          match_order: matchOrder++,
          team1_registration_id: team?.id ?? null,
          team2_registration_id: null,
          is_bye: true,
          status: "completed",
          winner_registration_id: team?.id ?? null,
        });
      }

      // Créer les matchs normaux
      let playingIndex = 0;
      for (let i = 0; i < nb_matchs_premier_tour; i++) {
        const team1 = playingTeams[playingIndex++];
        const team2 = playingTeams[playingIndex++];

        if (!team1 || !team2) {
          logger.error(
            {
              tournamentId: id.substring(0, 8) + "…",
              playingIndex,
              nbMatchsPremierTour: nb_matchs_premier_tour,
              playingTeamsLength: playingTeams.length,
            },
            "[advance/pools-final] Not enough playing teams for matches"
          );
          return NextResponse.json(
            {
              error:
                "Erreur : nombre insuffisant d'équipes pour créer tous les matchs.",
            },
            { status: 500 }
          );
        }

        finalMatches.push({
          tournament_id: id,
          round_type,
          round_number: 1,
          match_order: matchOrder++,
          team1_registration_id: team1.id,
          team2_registration_id: team2.id,
          is_bye: false,
          status: "scheduled",
          winner_registration_id: null,
        });
      }

      // Vérifier que le nombre de matchs créés correspond au nombre attendu
      if (finalMatches.length !== totalMatches) {
        logger.error(
          {
            tournamentId: id.substring(0, 8) + "…",
            matchesCreated: finalMatches.length,
            expectedMatches: totalMatches,
            nbByes: nb_byes,
            nbMatchsPremierTour: nb_matchs_premier_tour,
          },
          "[advance/pools-final] Mismatch in number of matches created (other config)"
        );
        return NextResponse.json(
          {
            error:
              `Erreur : nombre de matchs créés (${finalMatches.length}) ne correspond pas au nombre attendu (${totalMatches}).`,
          },
          { status: 500 }
        );
      }
    }

    // Vérifier que tous les matchs ont un tournament_id
    for (const match of finalMatches) {
      if (!match.tournament_id || !match.round_type || match.match_order <= 0) {
        logger.error(
          {
            tournamentId: id.substring(0, 8) + "…",
            matchOrder: match.match_order,
            hasTournamentId: !!match.tournament_id,
            hasRoundType: !!match.round_type,
          },
          "[advance/pools-final] Invalid match data"
        );
        return NextResponse.json(
          {
            error: "Erreur : données de match invalides.",
          },
          { status: 500 }
        );
      }
    }

    // Log détaillé avant insertion
    logger.info(
      {
        tournamentId: id.substring(0, 8) + "…",
        numPools,
        qualifiedCount,
        matchesToInsert: finalMatches.length,
        totalMatches,
        nbByes: nb_byes,
        nbMatchsPremierTour: nb_matchs_premier_tour,
        roundType: round_type,
        bracketSize: bracket_size,
        matchesDetails: finalMatches.map(m => ({
          matchOrder: m.match_order,
          isBye: m.is_bye,
          hasTeam1: !!m.team1_registration_id,
          hasTeam2: !!m.team2_registration_id,
        })),
      },
      "[advance/pools-final] About to insert final bracket matches"
    );

    const { error: insertError } = await supabaseAdmin
      .from("tournament_matches")
      .insert(finalMatches);

    if (insertError) {
      logger.error(
        {
          tournamentId: id.substring(0, 8) + "…",
          error: insertError.message,
          errorDetails: insertError.details,
          errorHint: insertError.hint,
          errorCode: insertError.code,
          matchesCount: finalMatches.length,
          firstMatch: finalMatches[0],
        },
        "[advance/pools-final] Error inserting final bracket matches"
      );
      return NextResponse.json(
        { 
          error: "Erreur lors de la création du tableau final",
          details: insertError.message,
        },
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
      { 
        tournamentId: id?.substring(0, 8) + "…" || "unknown",
        error: error?.message || String(error),
        stack: error?.stack,
        errorName: error?.name,
      },
      "[advance/pools-final] Unexpected error"
    );
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}


