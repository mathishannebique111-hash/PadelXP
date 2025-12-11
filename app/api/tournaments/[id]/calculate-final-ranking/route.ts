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
  tableau?: string | null;
  match_order: number;
  winner_registration_id: string | null;
  team1_registration_id: string | null;
  team2_registration_id: string | null;
  status: string;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.SUBSCRIPTION_CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
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

    // Récupérer le nombre d'équipes pour déterminer le format
    const { data: registrations } = await supabaseAdmin
      .from("tournament_registrations")
      .select("id")
      .eq("tournament_id", tournamentId);

    const numPairs = registrations?.length || 0;

    const finalRoundNumber = numPairs === 8 ? 3 : 4;

    // Récupérer tous les matchs du dernier tour (3 pour TMC8, 4 sinon)
    const { data: tour4Matches } = await supabaseAdmin
      .from("tournament_matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("round_number", finalRoundNumber)
      .order("tableau", { ascending: true })
      .order("match_order", { ascending: true });

    if (!tour4Matches || tour4Matches.length === 0) {
      return NextResponse.json(
        { error: `Aucun match du Tour ${finalRoundNumber} trouvé` },
        { status: 400 }
      );
    }

    // Vérifier que tous les matchs du Tour 4 sont complétés
    const incompleteMatches = tour4Matches.filter(
      (m: Match) => m.status !== "completed" || !m.winner_registration_id
    );

    if (incompleteMatches.length > 0) {
      return NextResponse.json(
        {
          error: `Tous les matchs du Tour ${finalRoundNumber} doivent être complétés avant de calculer le classement final. ${incompleteMatches.length} match(s) restant(s).`,
        },
        { status: 400 }
      );
    }

    // Calculer le classement final
    const ranking: Record<string, number> = {};

    // Récupérer les matchs du Tour 3 pour TMC 12 et TMC 20 (les TMC 8 n'ont que 3 tours)
    let tour3Matches: Match[] | null = null;
    if (numPairs === 12 || numPairs === 20) {
      const { data: t3, error: tour3Error } = await supabaseAdmin
        .from("tournament_matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("round_number", 3)
        .order("tableau", { ascending: true })
        .order("match_order", { ascending: true });

      if (tour3Error) {
        logger.error(
          { error: tour3Error, tournamentId: tournamentId.substring(0, 8) + "…" },
          "[calculate-final-ranking] Error fetching Tour 3 matches"
        );
      }
      tour3Matches = t3 || null;
    }

    // Log détaillé des matchs du Tour 3 et Tour 4 pour déboguer
    if (numPairs === 12) {
      logger.info(
        {
          tournamentId: tournamentId.substring(0, 8) + "…",
          tour3MatchesCount: tour3Matches?.length || 0,
          tour4MatchesCount: tour4Matches.length,
          tour3Matches: tour3Matches?.map((m: Match) => ({
            id: m.id.substring(0, 8) + "…",
            tableau: m.tableau,
            match_order: m.match_order,
            is_bye: m.is_bye,
            status: m.status,
            team1: m.team1_registration_id?.substring(0, 8) + "…",
            team2: m.team2_registration_id?.substring(0, 8) + "…",
            winner: m.winner_registration_id?.substring(0, 8) + "…",
          })) || [],
          tour4Matches: tour4Matches.map((m: Match) => ({
            id: m.id.substring(0, 8) + "…",
            tableau: m.tableau,
            round_type: m.round_type,
            match_order: m.match_order,
            status: m.status,
            team1: m.team1_registration_id?.substring(0, 8) + "…",
            team2: m.team2_registration_id?.substring(0, 8) + "…",
            winner: m.winner_registration_id?.substring(0, 8) + "…",
          })),
        },
        "[calculate-final-ranking] Tour 3 and Tour 4 matches details"
      );
    }

    // Logique spécifique pour TMC 20 équipes
    if (numPairs === 20) {
      // 1) Places 1-2 : Finale (Tour 4, tableau principal)
      const finalMatch = tour4Matches.find(
        (m: Match) => m.tableau === "principal" && m.round_type === "final" && m.match_order === 1
      );
      const finalists = new Set<string>();
      if (finalMatch && finalMatch.status === "completed" && finalMatch.winner_registration_id) {
        ranking[finalMatch.winner_registration_id] = 1;
        finalists.add(finalMatch.winner_registration_id);
        const loserId =
          finalMatch.team1_registration_id === finalMatch.winner_registration_id
            ? finalMatch.team2_registration_id
            : finalMatch.team1_registration_id;
        if (loserId) {
          ranking[loserId] = 2;
          finalists.add(loserId);
        }
      }

      // 2) Place 3 : Petite finale (Tour 4, tableau principal)
      const thirdPlaceMatch = tour4Matches.find(
        (m: Match) => m.tableau === "principal" && m.round_type === "third_place" && m.match_order === 2
      );
      if (thirdPlaceMatch && thirdPlaceMatch.status === "completed" && thirdPlaceMatch.winner_registration_id) {
        ranking[thirdPlaceMatch.winner_registration_id] = 3;
        const loserId =
          thirdPlaceMatch.team1_registration_id === thirdPlaceMatch.winner_registration_id
            ? thirdPlaceMatch.team2_registration_id
            : thirdPlaceMatch.team1_registration_id;
        if (loserId) ranking[loserId] = 4;
      }

      // 3) Place 5 : 5e place (Tour 4, tableau principal)
      const fifthPlaceMatch = tour4Matches.find(
        (m: Match) => m.tableau === "principal" && m.match_order === 3
      );
      if (fifthPlaceMatch && fifthPlaceMatch.status === "completed" && fifthPlaceMatch.winner_registration_id) {
        ranking[fifthPlaceMatch.winner_registration_id] = 5;
      }

      // 4) Places 6-10 : Tableau places_6_10 (Tour 4)
      const places6_10Matches = tour4Matches.filter(
        (m: Match) => m.tableau === "places_6_10"
      ).sort((a, b) => a.match_order - b.match_order);
      
      // M1 : Match pour la 6e et 7e place
      const places6_7Match = places6_10Matches.find((m: Match) => m.match_order === 1);
      if (places6_7Match && places6_7Match.status === "completed" && places6_7Match.winner_registration_id) {
        ranking[places6_7Match.winner_registration_id] = 6;
        const loserId =
          places6_7Match.team1_registration_id === places6_7Match.winner_registration_id
            ? places6_7Match.team2_registration_id
            : places6_7Match.team1_registration_id;
        if (loserId) ranking[loserId] = 7;
      }

      // M2 : Match pour la 8e et 9e place
      const places8_9Match = places6_10Matches.find((m: Match) => m.match_order === 2);
      if (places8_9Match && places8_9Match.status === "completed" && places8_9Match.winner_registration_id) {
        ranking[places8_9Match.winner_registration_id] = 8;
        const loserId =
          places8_9Match.team1_registration_id === places8_9Match.winner_registration_id
            ? places8_9Match.team2_registration_id
            : places8_9Match.team1_registration_id;
        if (loserId) ranking[loserId] = 9;
      }

      // M3 : 10e place
      const place10Match = places6_10Matches.find((m: Match) => m.match_order === 3);
      if (place10Match && place10Match.status === "completed" && place10Match.winner_registration_id) {
        ranking[place10Match.winner_registration_id] = 10;
      }

      // 5) Places 11-15 : Tableau places_11_15 (Tour 4)
      const places11_15Matches = tour4Matches.filter(
        (m: Match) => m.tableau === "places_11_15"
      ).sort((a, b) => a.match_order - b.match_order);
      
      // M1 : Match pour la 11e et 12e place
      const places11_12Match = places11_15Matches.find((m: Match) => m.match_order === 1);
      if (places11_12Match && places11_12Match.status === "completed" && places11_12Match.winner_registration_id) {
        ranking[places11_12Match.winner_registration_id] = 11;
        const loserId =
          places11_12Match.team1_registration_id === places11_12Match.winner_registration_id
            ? places11_12Match.team2_registration_id
            : places11_12Match.team1_registration_id;
        if (loserId) ranking[loserId] = 12;
      }

      // M2 : Match pour la 13e et 14e place
      const places13_14Match = places11_15Matches.find((m: Match) => m.match_order === 2);
      if (places13_14Match && places13_14Match.status === "completed" && places13_14Match.winner_registration_id) {
        ranking[places13_14Match.winner_registration_id] = 13;
        const loserId =
          places13_14Match.team1_registration_id === places13_14Match.winner_registration_id
            ? places13_14Match.team2_registration_id
            : places13_14Match.team1_registration_id;
        if (loserId) ranking[loserId] = 14;
      }

      // M3 : 15e place
      const place15Match = places11_15Matches.find((m: Match) => m.match_order === 3);
      if (place15Match && place15Match.status === "completed" && place15Match.winner_registration_id) {
        ranking[place15Match.winner_registration_id] = 15;
      }

      // 6) Places 16-20 : Tableau places_16_20 (Tour 4)
      const places16_20Matches = tour4Matches.filter(
        (m: Match) => m.tableau === "places_16_20"
      ).sort((a, b) => a.match_order - b.match_order);
      
      // M1 : Match pour la 16e et 17e place
      const places16_17Match = places16_20Matches.find((m: Match) => m.match_order === 1);
      if (places16_17Match && places16_17Match.status === "completed" && places16_17Match.winner_registration_id) {
        ranking[places16_17Match.winner_registration_id] = 16;
        const loserId =
          places16_17Match.team1_registration_id === places16_17Match.winner_registration_id
            ? places16_17Match.team2_registration_id
            : places16_17Match.team1_registration_id;
        if (loserId) ranking[loserId] = 17;
      }

      // M2 : Match pour la 18e et 19e place
      const places18_19Match = places16_20Matches.find((m: Match) => m.match_order === 2);
      if (places18_19Match && places18_19Match.status === "completed" && places18_19Match.winner_registration_id) {
        ranking[places18_19Match.winner_registration_id] = 18;
        const loserId =
          places18_19Match.team1_registration_id === places18_19Match.winner_registration_id
            ? places18_19Match.team2_registration_id
            : places18_19Match.team1_registration_id;
        if (loserId) ranking[loserId] = 19;
      }

      // M3 : 20e place
      const place20Match = places16_20Matches.find((m: Match) => m.match_order === 3);
      if (place20Match && place20Match.status === "completed" && place20Match.winner_registration_id) {
        ranking[place20Match.winner_registration_id] = 20;
      }
    } else if (numPairs === 12) {
      // Logique spécifique pour TMC 12 équipes

      // 1) Places 1-2 : Finale (Tour 4, tableau principal)
      const finalMatch = tour4Matches.find(
        (m: Match) => m.tableau === "principal" && m.round_type === "final"
      );
      const finalists = new Set<string>();
      if (finalMatch && finalMatch.status === "completed" && finalMatch.winner_registration_id) {
        ranking[finalMatch.winner_registration_id] = 1;
        finalists.add(finalMatch.winner_registration_id);
        const loserId =
          finalMatch.team1_registration_id === finalMatch.winner_registration_id
            ? finalMatch.team2_registration_id
            : finalMatch.team1_registration_id;
        if (loserId) {
          ranking[loserId] = 2;
          finalists.add(loserId);
        }
      }

      // 2) Place 3 : L'équipe qui était en demi-finale (Tour 3, tableau principal) et qui n'est pas allé en finale
      // C'est le perdant du match 1 du tableau principal (Tour 3) - c'est lui qui est 3ème
      if (tour3Matches && tour3Matches.length > 0) {
        const principalMatches = tour3Matches.filter((m: Match) => m.tableau === "principal");
        const principalMatch1 = principalMatches.find((m: Match) => m.match_order === 1 && !m.is_bye);
        
        logger.info(
          {
            principalMatch1: principalMatch1 ? { 
              status: principalMatch1.status, 
              winner: principalMatch1.winner_registration_id?.substring(0, 8) + "…",
              team1: principalMatch1.team1_registration_id?.substring(0, 8) + "…",
              team2: principalMatch1.team2_registration_id?.substring(0, 8) + "…",
            } : null,
            finalists: Array.from(finalists).map((id: string) => id.substring(0, 8) + "…"),
          },
          "[calculate-final-ranking] Place 3 calculation details"
        );
        
        // Le perdant du match 1 est la place 3
        if (principalMatch1 && principalMatch1.status === "completed" && principalMatch1.winner_registration_id) {
          const place3CandidateId =
            principalMatch1.team1_registration_id === principalMatch1.winner_registration_id
              ? principalMatch1.team2_registration_id
              : principalMatch1.team1_registration_id;
          
          // Assigner la place 3 si on a trouvé un candidat et qu'il n'est pas en finale
          if (place3CandidateId && !finalists.has(place3CandidateId)) {
            ranking[place3CandidateId] = 3;
            logger.info({ registrationId: place3CandidateId.substring(0, 8) + "…" }, "[calculate-final-ranking] Place 3 assigned from principalMatch1 loser");
          } else if (place3CandidateId) {
            logger.warn(
              {
                candidate: place3CandidateId.substring(0, 8) + "…",
                isFinalist: finalists.has(place3CandidateId),
              },
              "[calculate-final-ranking] Place 3 candidate is a finalist, cannot assign"
            );
          }
        } else {
          logger.warn(
            {
              hasPrincipalMatch1: !!principalMatch1,
              principalMatch1Status: principalMatch1?.status,
              principalMatch1HasWinner: !!principalMatch1?.winner_registration_id,
            },
            "[calculate-final-ranking] Place 3 not assigned - match 1 not completed or no winner"
          );
        }
      }

      // 3) Places 4-5 : Match du Tour 4 du tableau 4-6
      const places4_6Match = tour4Matches.find(
        (m: Match) => m.tableau === "places_4_6"
      );
      if (places4_6Match) {
        ranking[places4_6Match.winner_registration_id!] = 4;
        const loserId =
          places4_6Match.team1_registration_id === places4_6Match.winner_registration_id
            ? places4_6Match.team2_registration_id
            : places4_6Match.team1_registration_id;
        if (loserId) ranking[loserId] = 5;
      }

      // 4) Place 6 : L'équipe qui était au tour 3 du tableau 4-6 et qui n'est pas allé au tour suivant
      // C'est le perdant du match 1 du tableau 4-6 (Tour 3) - c'est lui qui est 6ème
      if (tour3Matches && tour3Matches.length > 0) {
        const places4_6Matches = tour3Matches.filter((m: Match) => m.tableau === "places_4_6");
        const places4_6Match1 = places4_6Matches.find((m: Match) => m.match_order === 1 && !m.is_bye);
        
        // Identifier les équipes qui sont allées au Tour 4 (gagnants du Tour 3)
        const places4_6Tour4Match = tour4Matches.find(
          (m: Match) => m.tableau === "places_4_6"
        );
        const places4_6Tour4Teams = new Set<string>();
        if (places4_6Tour4Match) {
          if (places4_6Tour4Match.team1_registration_id) places4_6Tour4Teams.add(places4_6Tour4Match.team1_registration_id);
          if (places4_6Tour4Match.team2_registration_id) places4_6Tour4Teams.add(places4_6Tour4Match.team2_registration_id);
        }
        
        // Le perdant du match 1 qui n'est pas au Tour 4 est la place 6
        if (places4_6Match1 && places4_6Match1.status === "completed" && places4_6Match1.winner_registration_id) {
          const places4_6Match1Loser =
            places4_6Match1.team1_registration_id === places4_6Match1.winner_registration_id
              ? places4_6Match1.team2_registration_id
              : places4_6Match1.team1_registration_id;
          if (places4_6Match1Loser && !places4_6Tour4Teams.has(places4_6Match1Loser)) {
            ranking[places4_6Match1Loser] = 6;
            logger.info({ registrationId: places4_6Match1Loser.substring(0, 8) + "…" }, "[calculate-final-ranking] Place 6 assigned from places4_6Match1 loser");
          } else {
            logger.warn(
              {
                loser: places4_6Match1Loser?.substring(0, 8) + "…",
                isInTour4: places4_6Match1Loser ? places4_6Tour4Teams.has(places4_6Match1Loser) : false,
              },
              "[calculate-final-ranking] Place 6 not assigned from places4_6Match1"
            );
          }
        } else {
          logger.warn(
            {
              hasPlaces4_6Match1: !!places4_6Match1,
              status: places4_6Match1?.status,
              hasWinner: !!places4_6Match1?.winner_registration_id,
            },
            "[calculate-final-ranking] Place 6 not assigned - match 1 not completed or no winner"
          );
        }
      }

      // 5) Places 7-8 : Match du Tour 4 du tableau 7-9
      const places7_9Match = tour4Matches.find(
        (m: Match) => m.tableau === "places_7_9"
      );
      if (places7_9Match) {
        ranking[places7_9Match.winner_registration_id!] = 7;
        const loserId =
          places7_9Match.team1_registration_id === places7_9Match.winner_registration_id
            ? places7_9Match.team2_registration_id
            : places7_9Match.team1_registration_id;
        if (loserId) ranking[loserId] = 8;
      }

      // 6) Place 9 : L'équipe qui était au tour 3 du tableau 7-9 et qui n'est pas allé au tour suivant
      // C'est le perdant du match 1 du tableau 7-9 (Tour 3)
      if (tour3Matches && tour3Matches.length > 0) {
        const places7_9Matches = tour3Matches.filter((m: Match) => m.tableau === "places_7_9");
        const places7_9Match1 = places7_9Matches.find((m: Match) => m.match_order === 1 && !m.is_bye);
        
        // Identifier les équipes qui sont allées au Tour 4 (gagnants du Tour 3)
        const places7_9Tour4Match = tour4Matches.find(
          (m: Match) => m.tableau === "places_7_9"
        );
        const places7_9Tour4Teams = new Set<string>();
        if (places7_9Tour4Match) {
          if (places7_9Tour4Match.team1_registration_id) places7_9Tour4Teams.add(places7_9Tour4Match.team1_registration_id);
          if (places7_9Tour4Match.team2_registration_id) places7_9Tour4Teams.add(places7_9Tour4Match.team2_registration_id);
        }
        
        // Le perdant du match 1 qui n'est pas au Tour 4
        if (places7_9Match1 && places7_9Match1.status === "completed" && places7_9Match1.winner_registration_id) {
          const places7_9Match1Loser =
            places7_9Match1.team1_registration_id === places7_9Match1.winner_registration_id
              ? places7_9Match1.team2_registration_id
              : places7_9Match1.team1_registration_id;
          if (places7_9Match1Loser && !places7_9Tour4Teams.has(places7_9Match1Loser)) {
            ranking[places7_9Match1Loser] = 9;
            logger.info({ registrationId: places7_9Match1Loser.substring(0, 8) + "…" }, "[calculate-final-ranking] Place 9 assigned from places7_9Match1");
          } else {
            logger.warn(
              {
                loser: places7_9Match1Loser?.substring(0, 8) + "…",
                isInTour4: places7_9Match1Loser ? places7_9Tour4Teams.has(places7_9Match1Loser) : false,
              },
              "[calculate-final-ranking] Place 9 not assigned from places7_9Match1"
            );
          }
        } else {
          logger.warn(
            {
              hasPlaces7_9Match1: !!places7_9Match1,
              status: places7_9Match1?.status,
              hasWinner: !!places7_9Match1?.winner_registration_id,
            },
            "[calculate-final-ranking] Place 9 not assigned - conditions not met"
          );
        }
      }

      // 7) Places 10-11 : Match du Tour 4 du tableau 10-12
      const places10_12Match = tour4Matches.find(
        (m: Match) => m.tableau === "places_10_12"
      );
      if (places10_12Match && places10_12Match.status === "completed" && places10_12Match.winner_registration_id) {
        ranking[places10_12Match.winner_registration_id] = 10;
        logger.info({ registrationId: places10_12Match.winner_registration_id.substring(0, 8) + "…" }, "[calculate-final-ranking] Place 10 assigned from places10_12Match");
        const loserId =
          places10_12Match.team1_registration_id === places10_12Match.winner_registration_id
            ? places10_12Match.team2_registration_id
            : places10_12Match.team1_registration_id;
        if (loserId) ranking[loserId] = 11;
      } else {
        logger.warn(
          {
            hasPlaces10_12Match: !!places10_12Match,
            status: places10_12Match?.status,
            hasWinner: !!places10_12Match?.winner_registration_id,
          },
          "[calculate-final-ranking] Place 10 not assigned - conditions not met"
        );
      }

      // 8) Place 12 : Perdant du match 1 du tableau 10-12 (Tour 3)
      if (tour3Matches) {
        const places10_12Match1 = tour3Matches.find(
          (m: Match) => m.tableau === "places_10_12" && m.match_order === 1 && !m.is_bye
        );
        if (places10_12Match1 && places10_12Match1.status === "completed" && places10_12Match1.winner_registration_id) {
          const places10_12Match1Loser =
            places10_12Match1.team1_registration_id === places10_12Match1.winner_registration_id
              ? places10_12Match1.team2_registration_id
              : places10_12Match1.team1_registration_id;
          if (places10_12Match1Loser) ranking[places10_12Match1Loser] = 12;
        }
      }
    } else {
      // Logique pour TMC 8 et 16 équipes (ancienne logique)
      // 1) Finale (places 1-2)
      const finalMatch = tour4Matches.find(
        (m: Match) => m.tableau === "principal" && m.round_type === "final"
      );
      if (finalMatch) {
        ranking[finalMatch.winner_registration_id!] = 1;
        const loserId =
          finalMatch.team1_registration_id === finalMatch.winner_registration_id
            ? finalMatch.team2_registration_id
            : finalMatch.team1_registration_id;
        if (loserId) ranking[loserId] = 2;
      }

      // 2) Petite finale (places 3-4)
      const thirdPlaceMatch = tour4Matches.find(
        (m: Match) => m.tableau === "principal" && m.round_type === "third_place"
      );
      if (thirdPlaceMatch) {
        ranking[thirdPlaceMatch.winner_registration_id!] = 3;
        const loserId =
          thirdPlaceMatch.team1_registration_id ===
          thirdPlaceMatch.winner_registration_id
            ? thirdPlaceMatch.team2_registration_id
            : thirdPlaceMatch.team1_registration_id;
        if (loserId) ranking[loserId] = 4;
      }

      // 3) Places 5-8
      const places5_8Matches = tour4Matches.filter(
        (m: Match) => m.tableau === "places_5_8"
      );
      const place5Match = places5_8Matches.find((m: Match) => m.match_order === 1);
      const place7Match = places5_8Matches.find((m: Match) => m.match_order === 2);
      if (place5Match) {
        ranking[place5Match.winner_registration_id!] = 5;
        const loserId =
          place5Match.team1_registration_id === place5Match.winner_registration_id
            ? place5Match.team2_registration_id
            : place5Match.team1_registration_id;
        if (loserId) ranking[loserId] = 6;
      }
      if (place7Match) {
        ranking[place7Match.winner_registration_id!] = 7;
        const loserId =
          place7Match.team1_registration_id === place7Match.winner_registration_id
            ? place7Match.team2_registration_id
            : place7Match.team1_registration_id;
        if (loserId) ranking[loserId] = 8;
      }

      // 4) Places 9-12
      const places9_12Matches = tour4Matches.filter(
        (m: Match) => m.tableau === "places_9_12"
      );
      const place9Match = places9_12Matches.find((m: Match) => m.match_order === 1);
      const place11Match = places9_12Matches.find((m: Match) => m.match_order === 2);
      if (place9Match) {
        ranking[place9Match.winner_registration_id!] = 9;
        const loserId =
          place9Match.team1_registration_id === place9Match.winner_registration_id
            ? place9Match.team2_registration_id
            : place9Match.team1_registration_id;
        if (loserId) ranking[loserId] = 10;
      }
      if (place11Match) {
        ranking[place11Match.winner_registration_id!] = 11;
        const loserId =
          place11Match.team1_registration_id === place11Match.winner_registration_id
            ? place11Match.team2_registration_id
            : place11Match.team1_registration_id;
        if (loserId) ranking[loserId] = 12;
      }

      // 5) Places 13-16
      const places13_16Matches = tour4Matches.filter(
        (m: Match) => m.tableau === "places_13_16"
      );
      const place13Match = places13_16Matches.find((m: Match) => m.match_order === 1);
      const place15Match = places13_16Matches.find((m: Match) => m.match_order === 2);
      if (place13Match) {
        ranking[place13Match.winner_registration_id!] = 13;
        const loserId =
          place13Match.team1_registration_id === place13Match.winner_registration_id
            ? place13Match.team2_registration_id
            : place13Match.team1_registration_id;
        if (loserId) ranking[loserId] = 14;
      }
      if (place15Match) {
        ranking[place15Match.winner_registration_id!] = 15;
        const loserId =
          place15Match.team1_registration_id === place15Match.winner_registration_id
            ? place15Match.team2_registration_id
            : place15Match.team1_registration_id;
        if (loserId) ranking[loserId] = 16;
      }
    }

    // Log pour déboguer
    logger.info(
      {
        tournamentId: tournamentId.substring(0, 8) + "…",
        numPairs,
        rankingsCount: Object.keys(ranking).length,
        rankings: Object.entries(ranking).map(([id, rank]) => ({ registrationId: id.substring(0, 8) + "…", rank })),
        tour3MatchesCount: tour3Matches?.length || 0,
        tour4MatchesCount: tour4Matches.length,
        hasPlace3: Object.values(ranking).includes(3),
        hasPlace6: Object.values(ranking).includes(6),
        hasPlace9: Object.values(ranking).includes(9),
        hasPlace10: Object.values(ranking).includes(10),
      },
      "[calculate-final-ranking] Final ranking calculated"
    );

    // Vérifier que toutes les places sont assignées (pour TMC 12 et TMC 20) et assigner les places manquantes
    if (numPairs === 12 || numPairs === 20) {
      const assignedRanks = new Set(Object.values(ranking));
      const assignedTeamIds = new Set(Object.keys(ranking));
      const missingRanks: number[] = [];
      const maxRank = numPairs === 20 ? 20 : 12;
      for (let i = 1; i <= maxRank; i++) {
        if (!assignedRanks.has(i)) {
          missingRanks.push(i);
        }
      }
      
      if (missingRanks.length > 0) {
        logger.warn(
          {
            tournamentId: tournamentId.substring(0, 8) + "…",
            missingRanks,
            rankings: Object.entries(ranking).map(([id, rank]) => ({ registrationId: id.substring(0, 8) + "…", rank })),
          },
          "[calculate-final-ranking] Missing ranks detected, attempting to assign"
        );
        
        // Récupérer toutes les inscriptions du tournoi
        const { data: allRegistrations } = await supabaseAdmin
          .from("tournament_registrations")
          .select("id")
          .eq("tournament_id", tournamentId);
        
        // Identifier les équipes non assignées
        const unassignedTeams = (allRegistrations || [])
          .map((reg: any) => reg.id)
          .filter((id: string) => !assignedTeamIds.has(id));
        
        logger.info(
          {
            unassignedTeamsCount: unassignedTeams.length,
            missingRanksCount: missingRanks.length,
            unassignedTeams: unassignedTeams.map((id: string) => id.substring(0, 8) + "…"),
          },
          "[calculate-final-ranking] Unassigned teams found"
        );
        
        // Essayer d'assigner les équipes aux places manquantes
        // en fonction des matchs du Tour 3 et Tour 4
        if (tour3Matches && tour3Matches.length > 0) {
          // Pour chaque place manquante, essayer de trouver l'équipe correspondante
          for (const missingRank of missingRanks.sort((a, b) => a - b)) {
            // Logique spécifique selon la place manquante
            if (missingRank === 3) {
              // Place 3 : perdant du match 1 du tableau principal (Tour 3) - c'est lui qui est 3ème
              const principalMatches = tour3Matches.filter((m: Match) => m.tableau === "principal");
              const principalMatch1 = principalMatches.find((m: Match) => m.match_order === 1 && !m.is_bye);
              
              // Le perdant du match 1 est la place 3
              if (principalMatch1 && principalMatch1.status === "completed" && principalMatch1.winner_registration_id) {
                const candidateId = principalMatch1.team1_registration_id === principalMatch1.winner_registration_id
                  ? principalMatch1.team2_registration_id
                  : principalMatch1.team1_registration_id;
                
                // Assigner la place 3 si on a trouvé un candidat et qu'il n'est pas en finale et n'a pas déjà de place
                if (candidateId && !finalists.has(candidateId) && !Object.keys(ranking).includes(candidateId)) {
                  ranking[candidateId] = 3;
                  const index = unassignedTeams.indexOf(candidateId);
                  if (index > -1) {
                    unassignedTeams.splice(index, 1);
                  }
                  logger.info({ registrationId: candidateId.substring(0, 8) + "…" }, "[calculate-final-ranking] Place 3 assigned (fallback) from principalMatch1 loser");
                } else if (candidateId) {
                  // Si l'équipe a déjà une place, la remplacer par la place 3
                  if (Object.keys(ranking).includes(candidateId)) {
                    const oldRank = ranking[candidateId];
                    delete ranking[candidateId];
                    ranking[candidateId] = 3;
                    logger.warn(
                      {
                        candidate: candidateId.substring(0, 8) + "…",
                        oldRank,
                        newRank: 3,
                      },
                      "[calculate-final-ranking] Place 3 reassigned (was rank " + oldRank + ")"
                    );
                  } else {
                    logger.warn(
                      {
                        candidate: candidateId.substring(0, 8) + "…",
                        isFinalist: finalists.has(candidateId),
                      },
                      "[calculate-final-ranking] Place 3 candidate cannot be assigned (fallback)"
                    );
                  }
                }
              }
            } else if (missingRank === 6) {
              // Place 6 : perdant du match 1 du tableau 4-6 (Tour 3) - c'est lui qui est 6ème
              const places4_6Matches = tour3Matches.filter((m: Match) => m.tableau === "places_4_6");
              const places4_6Match1 = places4_6Matches.find((m: Match) => m.match_order === 1 && !m.is_bye);
              
              const places4_6Tour4Match = tour4Matches.find((m: Match) => m.tableau === "places_4_6");
              const places4_6Tour4Teams = new Set<string>();
              if (places4_6Tour4Match) {
                if (places4_6Tour4Match.team1_registration_id) places4_6Tour4Teams.add(places4_6Tour4Match.team1_registration_id);
                if (places4_6Tour4Match.team2_registration_id) places4_6Tour4Teams.add(places4_6Tour4Match.team2_registration_id);
              }
              
              // Le perdant du match 1 qui n'est pas au Tour 4 est la place 6
              if (places4_6Match1 && places4_6Match1.status === "completed" && places4_6Match1.winner_registration_id) {
                const candidateId = places4_6Match1.team1_registration_id === places4_6Match1.winner_registration_id
                  ? places4_6Match1.team2_registration_id
                  : places4_6Match1.team1_registration_id;
                
                if (candidateId && !places4_6Tour4Teams.has(candidateId)) {
                  if (!Object.keys(ranking).includes(candidateId)) {
                    ranking[candidateId] = 6;
                    const index = unassignedTeams.indexOf(candidateId);
                    if (index > -1) {
                      unassignedTeams.splice(index, 1);
                    }
                    logger.info({ registrationId: candidateId.substring(0, 8) + "…" }, "[calculate-final-ranking] Place 6 assigned (fallback) from places4_6Match1 loser");
                  } else {
                    const oldRank = ranking[candidateId];
                    delete ranking[candidateId];
                    ranking[candidateId] = 6;
                    logger.warn(
                      { candidate: candidateId.substring(0, 8) + "…", oldRank, newRank: 6 },
                      "[calculate-final-ranking] Place 6 reassigned (was rank " + oldRank + ")"
                    );
                  }
                }
              }
            } else if (missingRank === 9) {
              // Place 9 : perdant du match 1 du tableau 7-9 (Tour 3)
              const places7_9Matches = tour3Matches.filter((m: Match) => m.tableau === "places_7_9");
              const places7_9Match1 = places7_9Matches.find((m: Match) => m.match_order === 1 && !m.is_bye);
              
              const places7_9Tour4Match = tour4Matches.find((m: Match) => m.tableau === "places_7_9");
              const places7_9Tour4Teams = new Set<string>();
              if (places7_9Tour4Match) {
                if (places7_9Tour4Match.team1_registration_id) places7_9Tour4Teams.add(places7_9Tour4Match.team1_registration_id);
                if (places7_9Tour4Match.team2_registration_id) places7_9Tour4Teams.add(places7_9Tour4Match.team2_registration_id);
              }
              
              if (places7_9Match1 && places7_9Match1.status === "completed" && places7_9Match1.winner_registration_id) {
                const candidateId = places7_9Match1.team1_registration_id === places7_9Match1.winner_registration_id
                  ? places7_9Match1.team2_registration_id
                  : places7_9Match1.team1_registration_id;
                
                if (candidateId && !places7_9Tour4Teams.has(candidateId)) {
                  if (!Object.keys(ranking).includes(candidateId)) {
                    ranking[candidateId] = 9;
                    const index = unassignedTeams.indexOf(candidateId);
                    if (index > -1) {
                      unassignedTeams.splice(index, 1);
                    }
                    logger.info({ registrationId: candidateId.substring(0, 8) + "…" }, "[calculate-final-ranking] Place 9 assigned (fallback) from places7_9Match1 loser");
                  } else {
                    const oldRank = ranking[candidateId];
                    delete ranking[candidateId];
                    ranking[candidateId] = 9;
                    logger.warn(
                      { candidate: candidateId.substring(0, 8) + "…", oldRank, newRank: 9 },
                      "[calculate-final-ranking] Place 9 reassigned (was rank " + oldRank + ")"
                    );
                  }
                }
              }
            } else if (missingRank === 10) {
              // Place 10 : gagnant du match du Tour 4 du tableau 10-12
              const places10_12Match = tour4Matches.find((m: Match) => m.tableau === "places_10_12");
              
              if (places10_12Match && places10_12Match.status === "completed" && places10_12Match.winner_registration_id) {
                const candidateId = places10_12Match.winner_registration_id;
                
                if (candidateId) {
                  if (!Object.keys(ranking).includes(candidateId)) {
                    ranking[candidateId] = 10;
                    const index = unassignedTeams.indexOf(candidateId);
                    if (index > -1) {
                      unassignedTeams.splice(index, 1);
                    }
                    logger.info({ registrationId: candidateId.substring(0, 8) + "…" }, "[calculate-final-ranking] Place 10 assigned (fallback) from places10_12Match winner");
                  } else {
                    const oldRank = ranking[candidateId];
                    delete ranking[candidateId];
                    ranking[candidateId] = 10;
                    logger.warn(
                      { candidate: candidateId.substring(0, 8) + "…", oldRank, newRank: 10 },
                      "[calculate-final-ranking] Place 10 reassigned (was rank " + oldRank + ")"
                    );
                  }
                }
              }
            }
          }
          
          // Si des équipes restent non assignées, les assigner aux places restantes
          const remainingRanks = missingRanks.filter((rank) => !Object.values(ranking).includes(rank));
          for (let i = 0; i < Math.min(unassignedTeams.length, remainingRanks.length); i++) {
            ranking[unassignedTeams[i]] = remainingRanks[i];
            logger.info(
              { registrationId: unassignedTeams[i].substring(0, 8) + "…", rank: remainingRanks[i] },
              "[calculate-final-ranking] Place assigned (final fallback)"
            );
          }
        }
      }
    }

    // Vérification finale : s'assurer que toutes les équipes sont assignées (pour TMC 12 et TMC 20)
    if (numPairs === 12 || numPairs === 20) {
      const { data: allRegistrations } = await supabaseAdmin
        .from("tournament_registrations")
        .select("id")
        .eq("tournament_id", tournamentId);
      
      const allTeamIds = new Set((allRegistrations || []).map((reg: any) => reg.id));
      const assignedTeamIds = new Set(Object.keys(ranking));
      const unassignedTeamIds = Array.from(allTeamIds).filter((id: string) => !assignedTeamIds.has(id));
      
      const assignedRanks = new Set(Object.values(ranking));
      const missingRanks: number[] = [];
      const maxRank = numPairs === 20 ? 20 : 12;
      for (let i = 1; i <= maxRank; i++) {
        if (!assignedRanks.has(i)) {
          missingRanks.push(i);
        }
      }
      
      // Réessayer d'assigner les places manquantes avec une logique simplifiée
      if (missingRanks.length > 0 && tour3Matches && tour3Matches.length > 0) {
        // Réessayer la place 3
        if (missingRanks.includes(3)) {
          const principalMatches = tour3Matches.filter((m: Match) => m.tableau === "principal");
          const principalMatch1 = principalMatches.find((m: Match) => m.match_order === 1 && !m.is_bye);
          if (principalMatch1 && principalMatch1.status === "completed" && principalMatch1.winner_registration_id) {
            const candidateId = principalMatch1.team1_registration_id === principalMatch1.winner_registration_id
              ? principalMatch1.team2_registration_id
              : principalMatch1.team1_registration_id;
            if (candidateId && !Object.keys(ranking).includes(candidateId) && !finalists.has(candidateId)) {
              ranking[candidateId] = 3;
              logger.info({ registrationId: candidateId.substring(0, 8) + "…" }, "[calculate-final-ranking] Place 3 assigned (final check)");
            }
          }
        }
        
        // Réessayer la place 6
        if (missingRanks.includes(6)) {
          const places4_6Matches = tour3Matches.filter((m: Match) => m.tableau === "places_4_6");
          const places4_6Match1 = places4_6Matches.find((m: Match) => m.match_order === 1 && !m.is_bye);
          const places4_6Tour4Match = tour4Matches.find((m: Match) => m.tableau === "places_4_6");
          const places4_6Tour4Teams = new Set<string>();
          if (places4_6Tour4Match) {
            if (places4_6Tour4Match.team1_registration_id) places4_6Tour4Teams.add(places4_6Tour4Match.team1_registration_id);
            if (places4_6Tour4Match.team2_registration_id) places4_6Tour4Teams.add(places4_6Tour4Match.team2_registration_id);
          }
          if (places4_6Match1 && places4_6Match1.status === "completed" && places4_6Match1.winner_registration_id) {
            const candidateId = places4_6Match1.team1_registration_id === places4_6Match1.winner_registration_id
              ? places4_6Match1.team2_registration_id
              : places4_6Match1.team1_registration_id;
            if (candidateId && !Object.keys(ranking).includes(candidateId) && !places4_6Tour4Teams.has(candidateId)) {
              ranking[candidateId] = 6;
              logger.info({ registrationId: candidateId.substring(0, 8) + "…" }, "[calculate-final-ranking] Place 6 assigned (final check)");
            }
          }
        }
        
        // Réessayer la place 9
        if (missingRanks.includes(9)) {
          const places7_9Matches = tour3Matches.filter((m: Match) => m.tableau === "places_7_9");
          const places7_9Match1 = places7_9Matches.find((m: Match) => m.match_order === 1 && !m.is_bye);
          const places7_9Tour4Match = tour4Matches.find((m: Match) => m.tableau === "places_7_9");
          const places7_9Tour4Teams = new Set<string>();
          if (places7_9Tour4Match) {
            if (places7_9Tour4Match.team1_registration_id) places7_9Tour4Teams.add(places7_9Tour4Match.team1_registration_id);
            if (places7_9Tour4Match.team2_registration_id) places7_9Tour4Teams.add(places7_9Tour4Match.team2_registration_id);
          }
          if (places7_9Match1 && places7_9Match1.status === "completed" && places7_9Match1.winner_registration_id) {
            const candidateId = places7_9Match1.team1_registration_id === places7_9Match1.winner_registration_id
              ? places7_9Match1.team2_registration_id
              : places7_9Match1.team1_registration_id;
            if (candidateId && !Object.keys(ranking).includes(candidateId) && !places7_9Tour4Teams.has(candidateId)) {
              ranking[candidateId] = 9;
              logger.info({ registrationId: candidateId.substring(0, 8) + "…" }, "[calculate-final-ranking] Place 9 assigned (final check)");
            }
          }
        }
        
        // Réessayer la place 10
        if (missingRanks.includes(10)) {
          const places10_12Match = tour4Matches.find((m: Match) => m.tableau === "places_10_12");
          if (places10_12Match && places10_12Match.status === "completed" && places10_12Match.winner_registration_id) {
            const candidateId = places10_12Match.winner_registration_id;
            if (candidateId && !Object.keys(ranking).includes(candidateId)) {
              ranking[candidateId] = 10;
              logger.info({ registrationId: candidateId.substring(0, 8) + "…" }, "[calculate-final-ranking] Place 10 assigned (final check)");
            }
          }
        }
      }
      
      // Vérifier à nouveau après les réassignations
      const finalAssignedRanks = new Set(Object.values(ranking));
      const finalMissingRanks: number[] = [];
      for (let i = 1; i <= 12; i++) {
        if (!finalAssignedRanks.has(i)) {
          finalMissingRanks.push(i);
        }
      }
      
      if (unassignedTeamIds.length > 0 || finalMissingRanks.length > 0) {
        logger.warn(
          {
            tournamentId: tournamentId.substring(0, 8) + "…",
            unassignedTeamIds: unassignedTeamIds.map((id: string) => id.substring(0, 8) + "…"),
            finalMissingRanks,
            currentRankings: Object.entries(ranking).map(([id, rank]) => ({ registrationId: id.substring(0, 8) + "…", rank })),
          },
          "[calculate-final-ranking] Some teams or ranks are still missing after final check"
        );
        
        // Assigner les équipes restantes aux places restantes
        for (let i = 0; i < Math.min(unassignedTeamIds.length, finalMissingRanks.length); i++) {
          ranking[unassignedTeamIds[i]] = finalMissingRanks[i];
          logger.info(
            { registrationId: unassignedTeamIds[i].substring(0, 8) + "…", rank: finalMissingRanks[i] },
            "[calculate-final-ranking] Final assignment of remaining teams"
          );
        }
      }
    }

    // Log AVANT sauvegarde pour vérification
    logger.info(
      {
        tournamentId: tournamentId.substring(0, 8) + "…",
        finalRankingsCount: Object.keys(ranking).length,
        finalRankings: Object.entries(ranking)
          .sort(([, a], [, b]) => (a as number) - (b as number))
          .map(([id, rank]) => ({ registrationId: id.substring(0, 8) + "…", rank })),
        hasPlace3: Object.values(ranking).includes(3),
        hasPlace6: Object.values(ranking).includes(6),
        hasPlace9: Object.values(ranking).includes(9),
        hasPlace10: Object.values(ranking).includes(10),
      },
      "[calculate-final-ranking] Rankings to be saved to database"
    );

    // Mettre à jour les classements dans la base de données
    const updatePromises = Object.entries(ranking).map(([registrationId, rank]) => {
      logger.info(
        { registrationId: registrationId.substring(0, 8) + "…", rank },
        "[calculate-final-ranking] Updating registration with final_ranking"
      );
      return supabaseAdmin
        .from("tournament_registrations")
        .update({ final_ranking: rank })
        .eq("id", registrationId)
        .eq("tournament_id", tournamentId);
    });

    const updateResults = await Promise.all(updatePromises);
    
    // Vérifier les erreurs de mise à jour
    const errors = updateResults.filter((result) => result.error);
    if (errors.length > 0) {
      logger.error(
        { errors: errors.map((e) => e.error), tournamentId: tournamentId.substring(0, 8) + "…" },
        "[calculate-final-ranking] Errors updating rankings"
      );
    }
    
    // Log final pour vérification
    logger.info(
      {
        tournamentId: tournamentId.substring(0, 8) + "…",
        finalRankingsCount: Object.keys(ranking).length,
        updateCount: updateResults.length,
        errorCount: errors.length,
        finalRankings: Object.entries(ranking)
          .sort(([, a], [, b]) => (a as number) - (b as number))
          .map(([id, rank]) => ({ registrationId: id.substring(0, 8) + "…", rank })),
      },
      "[calculate-final-ranking] Rankings saved to database"
    );

    // Vérification finale avant de retourner
    const finalCheck = new Set(Object.values(ranking));
    const missingPlaces: number[] = [];
    const maxRank = numPairs === 20 ? 20 : (numPairs === 12 ? 12 : 16);
    for (let i = 1; i <= maxRank; i++) {
      if (!finalCheck.has(i)) {
        missingPlaces.push(i);
      }
    }
    
    if (missingPlaces.length > 0) {
      logger.error(
        {
          tournamentId: tournamentId.substring(0, 8) + "…",
          missingPlaces,
          currentRankings: Object.entries(ranking)
            .sort(([, a], [, b]) => (a as number) - (b as number))
            .map(([id, rank]) => ({ registrationId: id.substring(0, 8) + "…", rank })),
        },
        "[calculate-final-ranking] ERROR: Missing places after all calculations"
      );
    }

    return NextResponse.json({
      success: true,
      rankings: ranking,
      missingPlaces: missingPlaces.length > 0 ? missingPlaces : undefined,
    });
  } catch (error: any) {
    logger.error(
      { error: error?.message, stack: error?.stack },
      "[calculate-final-ranking] Error"
    );
    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

