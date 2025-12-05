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

type Match = {
  id: string;
  round_number: number;
  round_type: string;
  status: string;
  winner_registration_id: string | null;
  team1_registration_id: string | null;
  team2_registration_id: string | null;
  match_order: number;
  tableau?: string | null;
  score?: any;
  is_bye?: boolean;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Configuration serveur invalide" },
        { status: 500 }
      );
    }

    // Vérifier l'authentification (club admin)
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
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore
            }
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin du club
    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("club_id, tournament_type")
      .eq("id", tournamentId)
      .single();

    if (!tournament || tournament.tournament_type !== "tmc") {
      return NextResponse.json(
        { error: "Tournoi TMC introuvable" },
        { status: 404 }
      );
    }

    const { data: clubAdmin } = await supabaseAdmin
      .from("club_admins")
      .select("club_id")
      .eq("club_id", tournament.club_id)
      .eq("user_id", user.id)
      .single();

    if (!clubAdmin) {
      return NextResponse.json(
        { error: "Accès non autorisé" },
        { status: 403 }
      );
    }

    // Récupérer toutes les inscriptions
    const { data: registrations } = await supabaseAdmin
      .from("tournament_registrations")
      .select("id")
      .eq("tournament_id", tournamentId);

    if (!registrations || (registrations.length !== 8 && registrations.length !== 12 && registrations.length !== 16)) {
      return NextResponse.json(
        { error: "Le TMC nécessite exactement 8, 12 ou 16 équipes" },
        { status: 400 }
      );
    }

    const numPairs = registrations.length;

    // Récupérer tous les matchs existants
    const { data: allMatches } = await supabaseAdmin
      .from("tournament_matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("round_number", { ascending: true })
      .order("match_order", { ascending: true });

    if (!allMatches || allMatches.length === 0) {
      return NextResponse.json(
        { error: "Aucun match trouvé" },
        { status: 400 }
      );
    }

    // Déterminer le tour actuel et le prochain tour à générer
    const maxRound = Math.max(...allMatches.map((m: Match) => m.round_number));
    const currentRoundMatches = allMatches.filter(
      (m: Match) => m.round_number === maxRound
    );

    // Vérifier que tous les matchs du tour actuel sont complétés
    // Les matchs avec byes sont automatiquement considérés comme complétés
    // Pour TMC 12 au Tour 3, les Match 2 du tableau principal et places_4_6 doivent être des byes
    // Si un Match 2 réel existe, on l'exclut de la vérification car il devrait être un bye
    const incompleteMatches = currentRoundMatches.filter((m: Match) => {
      // Exclure les byes
      if (m.is_bye) return false;
      
      // Pour TMC 12 au Tour 3, exclure les Match 2 du tableau principal et places_4_6
      // car ils doivent être des byes (automatiquement complétés)
      if (numPairs === 12 && maxRound === 3 && m.match_order === 2) {
        if (m.tableau === "principal" || m.tableau === "places_4_6") {
          return false; // Exclure ce Match 2 car il devrait être un bye
        }
      }
      
      // Vérifier que le match est complété
      return m.status !== "completed" || !m.winner_registration_id;
    });

    if (incompleteMatches.length > 0) {
      return NextResponse.json(
        {
          error: `Tous les matchs du tour ${maxRound} doivent être complétés avant de passer au tour suivant`,
        },
        { status: 400 }
      );
    }

    // Générer le tour suivant selon le nombre d'équipes et le tour actuel
    if (numPairs === 16) {
      await generateNextRound16(
        supabaseAdmin,
        tournamentId,
        allMatches as Match[],
        maxRound
      );
    } else if (numPairs === 8) {
      await generateNextRound8(
        supabaseAdmin,
        tournamentId,
        allMatches as Match[],
        maxRound
      );
    } else if (numPairs === 12) {
      await generateNextRound12(
        supabaseAdmin,
        tournamentId,
        allMatches as Match[],
        maxRound
      );
    } else {
      return NextResponse.json(
        { error: "Nombre d'équipes non supporté" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error(
      { error: error?.message, stack: error?.stack },
      "[advance/tmc-next-round] Error"
    );
    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

// Fonction helper pour trouver la meilleure équipe parmi 3 (pour les byes)
async function findBestTeamOfThree(
  supabase: any,
  tournamentId: string,
  teamIds: string[],
  allMatches: Match[]
): Promise<string> {
  if (teamIds.length !== 3) {
    throw new Error("findBestTeamOfThree nécessite exactement 3 équipes");
  }

  // Récupérer les informations des équipes (pair_weight)
  const { data: teamsData } = await supabase
    .from("tournament_registrations")
    .select("id, pair_total_rank")
    .in("id", teamIds)
    .eq("tournament_id", tournamentId);

  if (!teamsData || teamsData.length !== 3) {
    throw new Error("Impossible de récupérer les données des équipes");
  }

  // Calculer sets_diff et games_diff pour chaque équipe
  const teamStats = teamIds.map((teamId) => {
    let setsWon = 0;
    let setsLost = 0;
    let gamesWon = 0;
    let gamesLost = 0;

    // Parcourir tous les matchs joués par cette équipe
    const teamMatches = allMatches.filter(
      (m) =>
        (m.team1_registration_id === teamId || m.team2_registration_id === teamId) &&
        m.status === "completed" &&
        m.score
    );

    teamMatches.forEach((match) => {
      const isTeam1 = match.team1_registration_id === teamId;
      const sets = match.score?.sets || [];
      const superTiebreak = match.score?.super_tiebreak;

      // Compter les sets et les jeux
      sets.forEach((set: any) => {
        const team1Score = set.team1 || 0;
        const team2Score = set.team2 || 0;

        // Compter les sets
        if (team1Score > team2Score) {
          if (isTeam1) setsWon++;
          else setsLost++;
        } else if (team2Score > team1Score) {
          if (isTeam1) setsLost++;
          else setsWon++;
        }

        // Compter les jeux (les scores des sets)
        if (isTeam1) {
          gamesWon += team1Score;
          gamesLost += team2Score;
        } else {
          gamesWon += team2Score;
          gamesLost += team1Score;
        }
      });

      // Compter le super tie-break comme un set et ajouter les jeux
      if (superTiebreak) {
        const team1Score = superTiebreak.team1 || 0;
        const team2Score = superTiebreak.team2 || 0;

        // Compter comme un set
        if (team1Score > team2Score) {
          if (isTeam1) setsWon++;
          else setsLost++;
        } else if (team2Score > team1Score) {
          if (isTeam1) setsLost++;
          else setsWon++;
        }

        // Compter les jeux du super tie-break
        if (isTeam1) {
          gamesWon += team1Score;
          gamesLost += team2Score;
        } else {
          gamesWon += team2Score;
          gamesLost += team1Score;
        }
      }
    });

    const setsDiff = setsWon - setsLost;
    const gamesDiff = gamesWon - gamesLost;
    const teamData = teamsData.find((t) => t.id === teamId);
    const pairWeight = teamData?.pair_total_rank || 0;

    return {
      teamId,
      setsDiff,
      gamesDiff,
      pairWeight,
    };
  });

  // Trier : sets_diff décroissant, puis games_diff décroissant, puis pair_weight décroissant (plus fort = meilleur)
  teamStats.sort((a, b) => {
    // Premier critère : sets_diff
    if (a.setsDiff !== b.setsDiff) {
      return b.setsDiff - a.setsDiff; // Décroissant
    }
    // Deuxième critère : games_diff (si égalité sur sets_diff)
    if (a.gamesDiff !== b.gamesDiff) {
      return b.gamesDiff - a.gamesDiff; // Décroissant
    }
    // Troisième critère : pair_weight (si égalité sur sets_diff et games_diff)
    return b.pairWeight - a.pairWeight; // Décroissant (plus fort = meilleur)
  });

  return teamStats[0].teamId;
}

// Génération Tour 2 pour TMC 16 équipes
async function generateNextRound16(
  supabase: any,
  tournamentId: string,
  allMatches: Match[],
  currentRound: number
) {
  if (currentRound === 1) {
    // Tour 2 : Quarts (4 matchs) + Places 9-16 (4 matchs)
    const tour1Matches = allMatches.filter((m) => m.round_number === 1 && m.tableau === "principal");
    const winners = tour1Matches.map((m) => m.winner_registration_id!);
    const losers = tour1Matches.map((m) => {
      return m.team1_registration_id === m.winner_registration_id
        ? m.team2_registration_id
        : m.team1_registration_id;
    });

    // Tableau principal - Quarts (4 matchs avec les 8 gagnants)
    const quartersMatches: { id: string }[] = [];
    for (let i = 0; i < 4; i++) {
      const { data, error } = await supabase
        .from("tournament_matches")
        .insert({
          tournament_id: tournamentId,
          round_type: "quarters",
          round_number: 2,
          match_order: i + 1,
          team1_registration_id: winners[i * 2],
          team2_registration_id: winners[i * 2 + 1],
          is_bye: false,
          status: "scheduled",
          tableau: "principal",
        })
        .select("id")
        .single();

      if (error || !data) {
        throw new Error(`Erreur lors de la création du quart ${i + 1}`);
      }
      quartersMatches.push({ id: data.id });
    }

    // Tableau Places 9-16 (temporaire pour le Tour 2, 4 matchs avec les 8 perdants)
    const places9_16Matches: { id: string }[] = [];
    for (let i = 0; i < 4; i++) {
      const { data, error } = await supabase
        .from("tournament_matches")
        .insert({
          tournament_id: tournamentId,
          round_type: "qualifications",
          round_number: 2,
          match_order: i + 1,
          team1_registration_id: losers[i * 2],
          team2_registration_id: losers[i * 2 + 1],
          is_bye: false,
          status: "scheduled",
          tableau: "places_9_16", // Tableau temporaire qui sera séparé au Tour 3
        })
        .select("id")
        .single();

      if (error || !data) {
        throw new Error(`Erreur lors de la création du match places 9-16 ${i + 1}`);
      }
      places9_16Matches.push({ id: data.id });
    }
  } else if (currentRound === 2) {
    // Tour 3 : Demis (2) + Places 5-8 (2) + Places 9-12 (2) + Places 13-16 (2)
    const tour2Matches = allMatches.filter((m) => m.round_number === 2);
    const principalMatches = tour2Matches.filter(
      (m) => m.tableau === "principal"
    );
    const places9_16Matches = tour2Matches.filter(
      (m) => m.tableau === "places_9_16"
    );

    const winnersPrincipal = principalMatches.map((m) => m.winner_registration_id!);
    const losersPrincipal = principalMatches.map((m) => {
      return m.team1_registration_id === m.winner_registration_id
        ? m.team2_registration_id
        : m.team1_registration_id;
    });

    const winners9_16 = places9_16Matches.map((m) => m.winner_registration_id!);
    const losers9_16 = places9_16Matches.map((m) => {
      return m.team1_registration_id === m.winner_registration_id
        ? m.team2_registration_id
        : m.team1_registration_id;
    });

    // 1) Tableau principal - Demi-finales (2 matchs)
    const semisMatches: { id: string }[] = [];
    for (let i = 0; i < 2; i++) {
      const { data, error } = await supabase
        .from("tournament_matches")
        .insert({
          tournament_id: tournamentId,
          round_type: "semis",
          round_number: 3,
          match_order: i + 1,
          team1_registration_id: winnersPrincipal[i * 2],
          team2_registration_id: winnersPrincipal[i * 2 + 1],
          is_bye: false,
          status: "scheduled",
          tableau: "principal",
        })
        .select("id")
        .single();

      if (error || !data) {
        throw new Error(`Erreur lors de la création de la demi-finale ${i + 1}`);
      }
      semisMatches.push({ id: data.id });
    }

    // 2) Tableau Places 5-8 (2 matchs avec les 4 perdants du principal)
    const places5_8Matches: { id: string }[] = [];
    for (let i = 0; i < 2; i++) {
      const { data, error } = await supabase
        .from("tournament_matches")
        .insert({
          tournament_id: tournamentId,
          round_type: "qualifications",
          round_number: 3,
          match_order: i + 1,
          team1_registration_id: losersPrincipal[i * 2],
          team2_registration_id: losersPrincipal[i * 2 + 1],
          is_bye: false,
          status: "scheduled",
          tableau: "places_5_8",
        })
        .select("id")
        .single();

      if (error || !data) {
        throw new Error(`Erreur lors de la création du match places 5-8 ${i + 1}`);
      }
      places5_8Matches.push({ id: data.id });
    }

    // 3) Tableau Places 9-12 (2 matchs avec les 4 gagnants de places 9-16)
    const places9_12Matches: { id: string }[] = [];
    for (let i = 0; i < 2; i++) {
      const { data, error } = await supabase
        .from("tournament_matches")
        .insert({
          tournament_id: tournamentId,
          round_type: "qualifications",
          round_number: 3,
          match_order: i + 1,
          team1_registration_id: winners9_16[i * 2],
          team2_registration_id: winners9_16[i * 2 + 1],
          is_bye: false,
          status: "scheduled",
          tableau: "places_9_12",
        })
        .select("id")
        .single();

      if (error || !data) {
        throw new Error(`Erreur lors de la création du match places 9-12 ${i + 1}`);
      }
      places9_12Matches.push({ id: data.id });
    }

    // 4) Tableau Places 13-16 (2 matchs avec les 4 perdants de places 9-16)
    const places13_16Matches: { id: string }[] = [];
    for (let i = 0; i < 2; i++) {
      const { data, error } = await supabase
        .from("tournament_matches")
        .insert({
          tournament_id: tournamentId,
          round_type: "qualifications",
          round_number: 3,
          match_order: i + 1,
          team1_registration_id: losers9_16[i * 2],
          team2_registration_id: losers9_16[i * 2 + 1],
          is_bye: false,
          status: "scheduled",
          tableau: "places_13_16",
        })
        .select("id")
        .single();

      if (error || !data) {
        throw new Error(`Erreur lors de la création du match places 13-16 ${i + 1}`);
      }
      places13_16Matches.push({ id: data.id });
    }
  } else if (currentRound === 3) {
    // Tour 4 : Finales de classement
    const tour3Matches = allMatches.filter((m) => m.round_number === 3);
    const semisMatches = tour3Matches.filter(
      (m) => m.tableau === "principal" && m.round_type === "semis"
    );
    const places5_8Matches = tour3Matches.filter(
      (m) => m.tableau === "places_5_8"
    );
    const places9_12Matches = tour3Matches.filter(
      (m) => m.tableau === "places_9_12"
    );
    const places13_16Matches = tour3Matches.filter(
      (m) => m.tableau === "places_13_16"
    );

    const semisWinners = semisMatches.map((m) => m.winner_registration_id!);
    const semisLosers = semisMatches.map((m) => {
      return m.team1_registration_id === m.winner_registration_id
        ? m.team2_registration_id
        : m.team1_registration_id;
    });

    // 1) FINALE (places 1-2)
    const { error: finalError } = await supabase
      .from("tournament_matches")
      .insert({
        tournament_id: tournamentId,
        round_type: "final",
        round_number: 4,
        match_order: 1,
        team1_registration_id: semisWinners[0],
        team2_registration_id: semisWinners[1],
        is_bye: false,
        status: "scheduled",
        tableau: "principal",
      });

    if (finalError) {
      throw new Error("Erreur lors de la création de la finale");
    }

    // 2) PETITE FINALE (places 3-4)
    const { error: thirdPlaceError } = await supabase
      .from("tournament_matches")
      .insert({
        tournament_id: tournamentId,
        round_type: "third_place",
        round_number: 4,
        match_order: 2,
        team1_registration_id: semisLosers[0],
        team2_registration_id: semisLosers[1],
        is_bye: false,
        status: "scheduled",
        tableau: "principal",
      });

    if (thirdPlaceError) {
      throw new Error("Erreur lors de la création de la petite finale");
    }

    // 3) Match 5ème place
    const places5_8Winners = places5_8Matches.map((m) => m.winner_registration_id!);
    const places5_8Losers = places5_8Matches.map((m) => {
      return m.team1_registration_id === m.winner_registration_id
        ? m.team2_registration_id
        : m.team1_registration_id;
    });

    const { error: place5Error } = await supabase
      .from("tournament_matches")
      .insert({
        tournament_id: tournamentId,
        round_type: "qualifications",
        round_number: 4,
        match_order: 1,
        team1_registration_id: places5_8Winners[0],
        team2_registration_id: places5_8Winners[1],
        is_bye: false,
        status: "scheduled",
        tableau: "places_5_8",
      });

    if (place5Error) {
      throw new Error("Erreur lors de la création du match pour la 5ème place");
    }

    // 4) Match 7ème place
    const { error: place7Error } = await supabase
      .from("tournament_matches")
      .insert({
        tournament_id: tournamentId,
        round_type: "qualifications",
        round_number: 4,
        match_order: 2,
        team1_registration_id: places5_8Losers[0],
        team2_registration_id: places5_8Losers[1],
        is_bye: false,
        status: "scheduled",
        tableau: "places_5_8",
      });

    if (place7Error) {
      throw new Error("Erreur lors de la création du match pour la 7ème place");
    }

    // 5) Match 9ème place
    const places9_12Winners = places9_12Matches.map((m) => m.winner_registration_id!);
    const places9_12Losers = places9_12Matches.map((m) => {
      return m.team1_registration_id === m.winner_registration_id
        ? m.team2_registration_id
        : m.team1_registration_id;
    });

    const { error: place9Error } = await supabase
      .from("tournament_matches")
      .insert({
        tournament_id: tournamentId,
        round_type: "qualifications",
        round_number: 4,
        match_order: 1,
        team1_registration_id: places9_12Winners[0],
        team2_registration_id: places9_12Winners[1],
        is_bye: false,
        status: "scheduled",
        tableau: "places_9_12",
      });

    if (place9Error) {
      throw new Error("Erreur lors de la création du match pour la 9ème place");
    }

    // 6) Match 11ème place
    const { error: place11Error } = await supabase
      .from("tournament_matches")
      .insert({
        tournament_id: tournamentId,
        round_type: "qualifications",
        round_number: 4,
        match_order: 2,
        team1_registration_id: places9_12Losers[0],
        team2_registration_id: places9_12Losers[1],
        is_bye: false,
        status: "scheduled",
        tableau: "places_9_12",
      });

    if (place11Error) {
      throw new Error("Erreur lors de la création du match pour la 11ème place");
    }

    // 7) Match 13ème place
    const places13_16Winners = places13_16Matches.map((m) => m.winner_registration_id!);
    const places13_16Losers = places13_16Matches.map((m) => {
      return m.team1_registration_id === m.winner_registration_id
        ? m.team2_registration_id
        : m.team1_registration_id;
    });

    const { error: place13Error } = await supabase
      .from("tournament_matches")
      .insert({
        tournament_id: tournamentId,
        round_type: "qualifications",
        round_number: 4,
        match_order: 1,
        team1_registration_id: places13_16Winners[0],
        team2_registration_id: places13_16Winners[1],
        is_bye: false,
        status: "scheduled",
        tableau: "places_13_16",
      });

    if (place13Error) {
      throw new Error("Erreur lors de la création du match pour la 13ème place");
    }

    // 8) Match 15ème place
    const { error: place15Error } = await supabase
      .from("tournament_matches")
      .insert({
        tournament_id: tournamentId,
        round_type: "qualifications",
        round_number: 4,
        match_order: 2,
        team1_registration_id: places13_16Losers[0],
        team2_registration_id: places13_16Losers[1],
        is_bye: false,
        status: "scheduled",
        tableau: "places_13_16",
      });

    if (place15Error) {
      throw new Error("Erreur lors de la création du match pour la 15ème place");
    }
  }
}

// Génération pour TMC 8 équipes (logique simplifiée)
async function generateNextRound8(
  supabase: any,
  tournamentId: string,
  allMatches: Match[],
  currentRound: number
) {
  // Pour l'instant, on garde la logique existante pour 8 équipes
  // TODO: implémenter la génération progressive pour 8 équipes si nécessaire
  throw new Error("Génération progressive pour TMC 8 équipes non encore implémentée");
}

// Génération pour TMC 12 équipes
async function generateNextRound12(
  supabase: any,
  tournamentId: string,
  allMatches: Match[],
  currentRound: number
) {
  // Récupérer tous les matchs avec leurs scores
  const { data: allMatchesWithScores } = await supabase
    .from("tournament_matches")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("round_number", { ascending: true })
    .order("match_order", { ascending: true });

  if (!allMatchesWithScores) {
    throw new Error("Impossible de récupérer les matchs");
  }

  if (currentRound === 1) {
    // Tour 2 : 3 matchs dans principal (6 gagnants) + 3 matchs dans places_7_12 (6 perdants)
    const tour1Matches = allMatches.filter(
      (m) => m.round_number === 1 && m.tableau === "principal"
    );

    if (tour1Matches.length !== 6) {
      throw new Error("Le Tour 1 doit contenir exactement 6 matchs");
    }

    const winners = tour1Matches.map((m) => m.winner_registration_id!);
    const losers = tour1Matches.map((m) => {
      return m.team1_registration_id === m.winner_registration_id
        ? m.team2_registration_id
        : m.team1_registration_id;
    });

    // Tableau principal - 3 matchs avec les 6 gagnants
    for (let i = 0; i < 3; i++) {
      const { error } = await supabase.from("tournament_matches").insert({
        tournament_id: tournamentId,
        round_type: "quarters",
        round_number: 2,
        match_order: i + 1,
        team1_registration_id: winners[i * 2],
        team2_registration_id: winners[i * 2 + 1],
        is_bye: false,
        status: "scheduled",
        tableau: "principal",
      });

      if (error) {
        throw new Error(`Erreur lors de la création du match principal ${i + 1}`);
      }
    }

    // Tableau places_7_12 - 3 matchs avec les 6 perdants
    for (let i = 0; i < 3; i++) {
      const { error } = await supabase.from("tournament_matches").insert({
        tournament_id: tournamentId,
        round_type: "qualifications",
        round_number: 2,
        match_order: i + 1,
        team1_registration_id: losers[i * 2],
        team2_registration_id: losers[i * 2 + 1],
        is_bye: false,
        status: "scheduled",
        tableau: "places_7_12",
      });

      if (error) {
        throw new Error(`Erreur lors de la création du match places_7_12 ${i + 1}`);
      }
    }
  } else if (currentRound === 2) {
    // Tour 3 : 4 tableaux de 3 équipes avec byes
    const tour2Matches = allMatchesWithScores.filter((m) => m.round_number === 2);
    const principalMatches = tour2Matches.filter((m) => m.tableau === "principal");
    const places7_12Matches = tour2Matches.filter((m) => m.tableau === "places_7_12");

    if (principalMatches.length !== 3 || places7_12Matches.length !== 3) {
      throw new Error("Le Tour 2 doit contenir exactement 3 matchs dans chaque tableau");
    }

    // Vérifier que tous les matchs sont complétés (les byes sont automatiquement complétés)
    const incompletePrincipal = principalMatches.filter(
      (m) => !m.is_bye && (m.status !== "completed" || !m.winner_registration_id)
    );
    const incompletePlaces7_12 = places7_12Matches.filter(
      (m) => !m.is_bye && (m.status !== "completed" || !m.winner_registration_id)
    );

    if (incompletePrincipal.length > 0 || incompletePlaces7_12.length > 0) {
      throw new Error("Tous les matchs du Tour 2 doivent être complétés");
    }

    // Tableau principal (places 1-3) : 3 gagnants
    const principalWinners = principalMatches.map((m) => m.winner_registration_id!);
    const bestPrincipal = await findBestTeamOfThree(
      supabase,
      tournamentId,
      principalWinners,
      allMatchesWithScores as Match[]
    );
    const otherPrincipal = principalWinners.filter((id) => id !== bestPrincipal);

    // Match 1 : les 2 autres équipes
    const { data: match1Data, error: match1Error } = await supabase
      .from("tournament_matches")
      .insert({
        tournament_id: tournamentId,
        round_type: "semis",
        round_number: 3,
        match_order: 1,
        team1_registration_id: otherPrincipal[0],
        team2_registration_id: otherPrincipal[1],
        is_bye: false,
        status: "scheduled",
        tableau: "principal",
      })
      .select("id")
      .single();

    if (match1Error || !match1Data) {
      throw new Error("Erreur lors de la création du match 1 principal");
    }

    // Match 2 : toujours créer un bye (les byes sont automatiquement considérés comme complétés)
    // Vérifier si le bye existe déjà
    const existingBye = allMatchesWithScores.find(
      (m) => m.round_number === 3 && m.tableau === "principal" && m.is_bye
    );

    if (!existingBye) {
      // Créer le bye pour la meilleure équipe (toujours complété automatiquement)
      const { error: byeError } = await supabase.from("tournament_matches").insert({
        tournament_id: tournamentId,
        round_type: "semis",
        round_number: 3,
        match_order: 2,
        team1_registration_id: bestPrincipal,
        team2_registration_id: null,
        is_bye: true,
        status: "completed",
        winner_registration_id: bestPrincipal,
        tableau: "principal",
      });

      if (byeError) {
        throw new Error("Erreur lors de la création du bye principal");
      }
    }

    // Tableau places_4_6 : 3 perdants du principal
    const principalLosers = principalMatches.map((m) => {
      return m.team1_registration_id === m.winner_registration_id
        ? m.team2_registration_id
        : m.team1_registration_id;
    });
    const bestPlaces4_6 = await findBestTeamOfThree(
      supabase,
      tournamentId,
      principalLosers,
      allMatchesWithScores as Match[]
    );
    const otherPlaces4_6 = principalLosers.filter((id) => id !== bestPlaces4_6);

    // Match 1
    const { error: match4_6_1Error } = await supabase
      .from("tournament_matches")
      .insert({
        tournament_id: tournamentId,
        round_type: "qualifications",
        round_number: 3,
        match_order: 1,
        team1_registration_id: otherPlaces4_6[0],
        team2_registration_id: otherPlaces4_6[1],
        is_bye: false,
        status: "scheduled",
        tableau: "places_4_6",
      });

    if (match4_6_1Error) {
      throw new Error("Erreur lors de la création du match 1 places_4_6");
    }

    // Match 2 : bye
    const { error: bye4_6Error } = await supabase.from("tournament_matches").insert({
      tournament_id: tournamentId,
      round_type: "qualifications",
      round_number: 3,
      match_order: 2,
      team1_registration_id: bestPlaces4_6,
      team2_registration_id: null,
      is_bye: true,
      status: "completed",
      winner_registration_id: bestPlaces4_6,
      tableau: "places_4_6",
    });

    if (bye4_6Error) {
      throw new Error("Erreur lors de la création du bye places_4_6");
    }

    // Tableau places_7_9 : 3 gagnants de places_7_12
    const places7_12Winners = places7_12Matches.map((m) => m.winner_registration_id!);
    const bestPlaces7_9 = await findBestTeamOfThree(
      supabase,
      tournamentId,
      places7_12Winners,
      allMatchesWithScores as Match[]
    );
    const otherPlaces7_9 = places7_12Winners.filter((id) => id !== bestPlaces7_9);

    // Match 1
    const { error: match7_9_1Error } = await supabase
      .from("tournament_matches")
      .insert({
        tournament_id: tournamentId,
        round_type: "qualifications",
        round_number: 3,
        match_order: 1,
        team1_registration_id: otherPlaces7_9[0],
        team2_registration_id: otherPlaces7_9[1],
        is_bye: false,
        status: "scheduled",
        tableau: "places_7_9",
      });

    if (match7_9_1Error) {
      throw new Error("Erreur lors de la création du match 1 places_7_9");
    }

    // Match 2 : bye pour la meilleure équipe
    const { error: bye7_9Error } = await supabase.from("tournament_matches").insert({
      tournament_id: tournamentId,
      round_type: "qualifications",
      round_number: 3,
      match_order: 2,
      team1_registration_id: bestPlaces7_9,
      team2_registration_id: null,
      is_bye: true,
      status: "completed",
      winner_registration_id: bestPlaces7_9,
      tableau: "places_7_9",
    });

    if (bye7_9Error) {
      throw new Error("Erreur lors de la création du bye places_7_9");
    }

    // Tableau places_10_12 : 3 perdants de places_7_12
    const places7_12Losers = places7_12Matches.map((m) => {
      return m.team1_registration_id === m.winner_registration_id
        ? m.team2_registration_id
        : m.team1_registration_id;
    });
    const bestPlaces10_12 = await findBestTeamOfThree(
      supabase,
      tournamentId,
      places7_12Losers,
      allMatchesWithScores as Match[]
    );
    const otherPlaces10_12 = places7_12Losers.filter((id) => id !== bestPlaces10_12);

    // Match 1
    const { error: match10_12_1Error } = await supabase
      .from("tournament_matches")
      .insert({
        tournament_id: tournamentId,
        round_type: "qualifications",
        round_number: 3,
        match_order: 1,
        team1_registration_id: otherPlaces10_12[0],
        team2_registration_id: otherPlaces10_12[1],
        is_bye: false,
        status: "scheduled",
        tableau: "places_10_12",
      });

    if (match10_12_1Error) {
      throw new Error("Erreur lors de la création du match 1 places_10_12");
    }

    // Match 2 : bye pour la meilleure équipe
    const { error: bye10_12Error } = await supabase.from("tournament_matches").insert({
      tournament_id: tournamentId,
      round_type: "qualifications",
      round_number: 3,
      match_order: 2,
      team1_registration_id: bestPlaces10_12,
      team2_registration_id: null,
      is_bye: true,
      status: "completed",
      winner_registration_id: bestPlaces10_12,
      tableau: "places_10_12",
    });

    if (bye10_12Error) {
      throw new Error("Erreur lors de la création du bye places_10_12");
    }
  } else if (currentRound === 3) {
    // Tour 4 : Matchs finaux de classement
    // Récupérer les résultats du Tour 3
    const tour3Matches = allMatchesWithScores.filter((m) => m.round_number === 3);

    // Tableau principal (places 1-3)
    // Structure : Match 1 (2 équipes sans bye), Match 2 (perdant Match 1 vs équipe avec bye OU bye)
    const principalMatches = tour3Matches.filter((m) => m.tableau === "principal");
    const principalMatch1 = principalMatches.find((m) => m.match_order === 1 && !m.is_bye);
    const principalBye = principalMatches.find((m) => m.is_bye);
    const principalMatch2 = principalMatches.find((m) => m.match_order === 2 && !m.is_bye);
    const principalMatch2Bye = principalMatches.find((m) => m.match_order === 2 && m.is_bye);

    if (!principalMatch1) {
      throw new Error("Le match 1 du tableau principal est requis");
    }

    // Vérifier que le Match 1 est complété
    if (principalMatch1.status !== "completed" || !principalMatch1.winner_registration_id) {
      throw new Error("Le match 1 du tableau principal doit être complété");
    }

    if (!principalBye || !principalBye.winner_registration_id) {
      throw new Error("Le bye du tableau principal est requis");
    }

    const principalMatch1Winner = principalMatch1.winner_registration_id!;
    const principalMatch1Loser = principalMatch1.team1_registration_id === principalMatch1Winner
      ? principalMatch1.team2_registration_id
      : principalMatch1.team1_registration_id;
    const principalByeTeam = principalBye.winner_registration_id!;

    let principalMatch2Winner: string;
    let principalMatch2Loser: string;

    // Vérifier si le Match 2 est un bye (automatiquement complété)
    if (principalMatch2Bye && principalMatch2Bye.winner_registration_id) {
      // Le Match 2 est un bye, utiliser directement l'équipe avec bye comme gagnant
      principalMatch2Winner = principalMatch2Bye.winner_registration_id!;
      principalMatch2Loser = principalMatch1Loser;
    } else if (principalMatch2) {
      // Le Match 2 existe (non-bye), vérifier qu'il est complété
      if (principalMatch2.status !== "completed" || !principalMatch2.winner_registration_id) {
        throw new Error("Le match 2 du tableau principal doit être complété");
      }
      principalMatch2Winner = principalMatch2.winner_registration_id!;
      principalMatch2Loser = principalMatch2.team1_registration_id === principalMatch2Winner
        ? principalMatch2.team2_registration_id!
        : principalMatch2.team1_registration_id!;
    } else {
      // Le Match 2 n'existe pas encore, le créer : perdant Match 1 vs équipe avec bye
      const { data: match2Data, error: match2Error } = await supabase
        .from("tournament_matches")
        .insert({
          tournament_id: tournamentId,
          round_type: "semis",
          round_number: 3,
          match_order: 2,
          team1_registration_id: principalMatch1Loser,
          team2_registration_id: principalByeTeam,
          is_bye: false,
          status: "scheduled",
          tableau: "principal",
        })
        .select("*")
        .single();

      if (match2Error || !match2Data) {
        throw new Error("Erreur lors de la création du match 2 principal");
      }

      // Le Match 2 vient d'être créé, il doit être complété avant de continuer
      throw new Error("Le match 2 du tableau principal doit être complété avant de générer le Tour 4");
    }

    // Finale (places 1-2) : gagnant Match 1 vs gagnant Match 2
    const { error: finalError } = await supabase.from("tournament_matches").insert({
      tournament_id: tournamentId,
      round_type: "final",
      round_number: 4,
      match_order: 1,
      team1_registration_id: principalMatch1Winner,
      team2_registration_id: principalMatch2Winner,
      is_bye: false,
      status: "scheduled",
      tableau: "principal",
    });

    if (finalError) {
      throw new Error("Erreur lors de la création de la finale");
    }

    // Pas de match pour les perdants du Tour 3

    // Tableau places_4_6
    // Structure : Match 1 (2 équipes sans bye), Match 2 (perdant Match 1 vs équipe avec bye OU bye)
    const places4_6Matches = tour3Matches.filter((m) => m.tableau === "places_4_6");
    const places4_6Match1 = places4_6Matches.find((m) => m.match_order === 1 && !m.is_bye);
    const places4_6Bye = places4_6Matches.find((m) => m.is_bye);
    const places4_6Match2 = places4_6Matches.find((m) => m.match_order === 2 && !m.is_bye);
    const places4_6Match2Bye = places4_6Matches.find((m) => m.match_order === 2 && m.is_bye);

    if (!places4_6Match1) {
      throw new Error("Le match 1 du tableau places_4_6 est requis");
    }

    if (places4_6Match1.status !== "completed" || !places4_6Match1.winner_registration_id) {
      throw new Error("Le match 1 du tableau places_4_6 doit être complété");
    }

    if (!places4_6Bye || !places4_6Bye.winner_registration_id) {
      throw new Error("Le bye du tableau places_4_6 est requis");
    }

    const places4_6Match1Winner = places4_6Match1.winner_registration_id!;
    const places4_6Match1Loser = places4_6Match1.team1_registration_id === places4_6Match1Winner
      ? places4_6Match1.team2_registration_id
      : places4_6Match1.team1_registration_id;
    const places4_6ByeTeam = places4_6Bye.winner_registration_id!;

    let places4_6Match2Winner: string;
    let places4_6Match2Loser: string;

    // Vérifier si le Match 2 est un bye (automatiquement complété)
    if (places4_6Match2Bye && places4_6Match2Bye.winner_registration_id) {
      // Le Match 2 est un bye, utiliser directement l'équipe avec bye comme gagnant
      places4_6Match2Winner = places4_6Match2Bye.winner_registration_id!;
      places4_6Match2Loser = places4_6Match1Loser;
    } else if (places4_6Match2) {
      // Le Match 2 existe (non-bye), vérifier qu'il est complété
      if (places4_6Match2.status !== "completed" || !places4_6Match2.winner_registration_id) {
        throw new Error("Le match 2 du tableau places_4_6 doit être complété");
      }
      places4_6Match2Winner = places4_6Match2.winner_registration_id!;
      places4_6Match2Loser = places4_6Match2.team1_registration_id === places4_6Match2Winner
        ? places4_6Match2.team2_registration_id!
        : places4_6Match2.team1_registration_id!;
    } else {
      // Le Match 2 n'existe pas encore, le créer : perdant Match 1 vs équipe avec bye
      const { data: match2Data, error: match2Error } = await supabase
        .from("tournament_matches")
        .insert({
          tournament_id: tournamentId,
          round_type: "qualifications",
          round_number: 3,
          match_order: 2,
          team1_registration_id: places4_6Match1Loser,
          team2_registration_id: places4_6ByeTeam,
          is_bye: false,
          status: "scheduled",
          tableau: "places_4_6",
        })
        .select("*")
        .single();

      if (match2Error || !match2Data) {
        throw new Error("Erreur lors de la création du match 2 places_4_6");
      }

      // Le Match 2 vient d'être créé, il doit être complété avant de continuer
      throw new Error("Le match 2 du tableau places_4_6 doit être complété avant de générer le Tour 4");
    }

    // Match 4ème place
    const { error: place4Error } = await supabase.from("tournament_matches").insert({
      tournament_id: tournamentId,
      round_type: "qualifications",
      round_number: 4,
      match_order: 1,
      team1_registration_id: places4_6Match1Winner,
      team2_registration_id: places4_6Match2Winner,
      is_bye: false,
      status: "scheduled",
      tableau: "places_4_6",
    });

    if (place4Error) {
      throw new Error("Erreur lors de la création du match 4ème place");
    }

    // Pas de match pour les perdants du Tour 3

    // Tableau places_7_9
    const places7_9Matches = tour3Matches.filter((m) => m.tableau === "places_7_9");
    const places7_9Match1 = places7_9Matches.find((m) => m.match_order === 1 && !m.is_bye);
    const places7_9Bye = places7_9Matches.find((m) => m.is_bye);

    if (!places7_9Match1) {
      throw new Error("Le match 1 du tableau places_7_9 est requis");
    }

    if (places7_9Match1.status !== "completed" || !places7_9Match1.winner_registration_id) {
      throw new Error("Le match 1 du tableau places_7_9 doit être complété");
    }

    if (!places7_9Bye || !places7_9Bye.winner_registration_id) {
      throw new Error("Le bye du tableau places_7_9 est requis");
    }

    const places7_9Match1Winner = places7_9Match1.winner_registration_id!;
    const places7_9ByeTeam = places7_9Bye.winner_registration_id!;

    // Match 7-8 : gagnant Match 1 vs équipe avec bye
    const { error: place7_8Error } = await supabase.from("tournament_matches").insert({
      tournament_id: tournamentId,
      round_type: "qualifications",
      round_number: 4,
      match_order: 1,
      team1_registration_id: places7_9Match1Winner,
      team2_registration_id: places7_9ByeTeam,
      is_bye: false,
      status: "scheduled",
      tableau: "places_7_9",
    });

    if (place7_8Error) {
      throw new Error("Erreur lors de la création du match 7-8");
    }

    // Pas de match pour les perdants du Tour 3

    // Tableau places_10_12
    const places10_12Matches = tour3Matches.filter((m) => m.tableau === "places_10_12");
    const places10_12Match1 = places10_12Matches.find((m) => m.match_order === 1 && !m.is_bye);
    const places10_12Bye = places10_12Matches.find((m) => m.is_bye);

    if (!places10_12Match1) {
      throw new Error("Le match 1 du tableau places_10_12 est requis");
    }

    if (places10_12Match1.status !== "completed" || !places10_12Match1.winner_registration_id) {
      throw new Error("Le match 1 du tableau places_10_12 doit être complété");
    }

    if (!places10_12Bye || !places10_12Bye.winner_registration_id) {
      throw new Error("Le bye du tableau places_10_12 est requis");
    }

    const places10_12Match1Winner = places10_12Match1.winner_registration_id!;
    const places10_12ByeTeam = places10_12Bye.winner_registration_id!;

    // Match 9-10 : gagnant Match 1 vs équipe avec bye
    const { error: place9_10Error } = await supabase.from("tournament_matches").insert({
      tournament_id: tournamentId,
      round_type: "qualifications",
      round_number: 4,
      match_order: 1,
      team1_registration_id: places10_12Match1Winner,
      team2_registration_id: places10_12ByeTeam,
      is_bye: false,
      status: "scheduled",
      tableau: "places_10_12",
    });

    if (place9_10Error) {
      throw new Error("Erreur lors de la création du match 9-10");
    }

    // Pas de match pour les perdants du Tour 3
  }
}
