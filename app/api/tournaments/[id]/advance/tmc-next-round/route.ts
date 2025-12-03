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
};

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const tournamentId = params.id;

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

    if (!registrations || registrations.length !== 8 && registrations.length !== 16) {
      return NextResponse.json(
        { error: "Le TMC nécessite exactement 8 ou 16 équipes" },
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
    const incompleteMatches = currentRoundMatches.filter(
      (m: Match) => m.status !== "completed" || !m.winner_registration_id
    );

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

    // 2) Tableau Places 5-8 (2 matchs avec perdants des quarts)
    for (let i = 0; i < 2; i++) {
      const { error } = await supabase.from("tournament_matches").insert({
        tournament_id: tournamentId,
        round_type: "qualifications",
        round_number: 3,
        match_order: i + 1,
        team1_registration_id: losersPrincipal[i * 2],
        team2_registration_id: losersPrincipal[i * 2 + 1],
        is_bye: false,
        status: "scheduled",
        tableau: "places_5_8",
      });

      if (error) {
        throw new Error(`Erreur lors de la création du match places 5-8 ${i + 1}`);
      }
    }

    // 3) Tableau Places 9-12 (2 matchs avec gagnants du tableau 9-16)
    for (let i = 0; i < 2; i++) {
      const { error } = await supabase.from("tournament_matches").insert({
        tournament_id: tournamentId,
        round_type: "qualifications",
        round_number: 3,
        match_order: i + 1,
        team1_registration_id: winners9_16[i * 2],
        team2_registration_id: winners9_16[i * 2 + 1],
        is_bye: false,
        status: "scheduled",
        tableau: "places_9_12",
      });

      if (error) {
        throw new Error(`Erreur lors de la création du match places 9-12 ${i + 1}`);
      }
    }

    // 4) Tableau Places 13-16 (2 matchs avec perdants du tableau 9-16)
    for (let i = 0; i < 2; i++) {
      const { error } = await supabase.from("tournament_matches").insert({
        tournament_id: tournamentId,
        round_type: "qualifications",
        round_number: 3,
        match_order: i + 1,
        team1_registration_id: losers9_16[i * 2],
        team2_registration_id: losers9_16[i * 2 + 1],
        is_bye: false,
        status: "scheduled",
        tableau: "places_13_16",
      });

      if (error) {
        throw new Error(`Erreur lors de la création du match places 13-16 ${i + 1}`);
      }
    }
  } else if (currentRound === 3) {
    // Tour 4 : 8 matchs de classement final
    const tour3Matches = allMatches.filter((m) => m.round_number === 3);
    const semisMatches = tour3Matches.filter((m) => m.tableau === "principal");
    const places5_8Matches = tour3Matches.filter(
      (m) => m.tableau === "places_5_8"
    );
    const places9_12Matches = tour3Matches.filter(
      (m) => m.tableau === "places_9_12"
    );
    const places13_16Matches = tour3Matches.filter(
      (m) => m.tableau === "places_13_16"
    );

    // 1) FINALE (places 1-2)
    const semisWinners = semisMatches.map((m) => m.winner_registration_id!);
    const semisLosers = semisMatches.map((m) => {
      return m.team1_registration_id === m.winner_registration_id
        ? m.team2_registration_id
        : m.team1_registration_id;
    });

    const { error: finalError } = await supabase.from("tournament_matches").insert({
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

