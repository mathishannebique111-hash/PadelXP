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

    // 8. Calculer la structure du tableau final (nb qualifiés, byes, type de tour)
    const totalTeams = numPools * 4;
    const structure = computeFinalBracketStructure(totalTeams);

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

    // 9. Classer les 1ers de poule entre eux, puis les 2èmes entre eux
    //    Critères : victoires, sets +/- , jeux +/- , puis pair_total_rank
    const winnersSorted = [...winners].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
      if (b.gameDiff !== a.gameDiff) return b.gameDiff - a.gameDiff;
      const aRank = a.pair_total_rank ?? Number.MAX_SAFE_INTEGER;
      const bRank = b.pair_total_rank ?? Number.MAX_SAFE_INTEGER;
      return aRank - bRank; // meilleur total de rang = mieux classé
    });

    const runnersSorted = [...runners].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
      if (b.gameDiff !== a.gameDiff) return b.gameDiff - a.gameDiff;
      const aRank = a.pair_total_rank ?? Number.MAX_SAFE_INTEGER;
      const bRank = b.pair_total_rank ?? Number.MAX_SAFE_INTEGER;
      return aRank - bRank;
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

    if (remainingByes > 0) {
      for (const r of runnersSorted) {
        if (remainingByes <= 0) break;
        byeTeams.push(r);
        remainingByes--;
      }
    }

    // Construire la liste complète des qualifiés
    const allQualifiedIds = new Set<string>();
    for (const w of winners) allQualifiedIds.add(w.id);
    for (const r of runners) allQualifiedIds.add(r.id);

    const byeIds = new Set(byeTeams.map((t) => t.id));

    const playingTeams: RankedReg[] = [];
    for (const w of winnersSorted) {
      if (!byeIds.has(w.id)) playingTeams.push(w);
    }
    for (const r of runnersSorted) {
      if (!byeIds.has(r.id)) playingTeams.push(r);
    }

    if (playingTeams.length + byeTeams.length !== qualifiedCount) {
      return NextResponse.json(
        {
          error:
            "Erreur : répartition invalide des têtes de série et des byes dans le tableau final.",
        },
        { status: 400 }
      );
    }

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

    // 10. Créer les matchs du premier tour :
    // - nb_matchs_premier_tour matchs avec 2 équipes (sans bye)
    // - (totalMatches - nb_matchs_premier_tour) matchs avec 1 équipe + bye

    // a) Matches avec bye (l'équipe est directement qualifiée pour le tour suivant)
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

    // b) Matches joués (sans bye)
    let playingIndex = 0;
    for (let i = 0; i < nb_matchs_premier_tour; i++) {
      const team1 = playingTeams[playingIndex++];
      const team2 = playingTeams[playingIndex++];

      finalMatches.push({
        tournament_id: id,
        round_type,
        round_number: 1,
        match_order: matchOrder++,
        team1_registration_id: team1?.id ?? null,
        team2_registration_id: team2?.id ?? null,
        is_bye: false,
        status: "scheduled",
        winner_registration_id: null,
      });
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


