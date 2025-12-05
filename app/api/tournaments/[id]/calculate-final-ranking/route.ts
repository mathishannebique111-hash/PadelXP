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

    // Récupérer le nombre d'équipes pour déterminer le format
    const { data: registrations } = await supabaseAdmin
      .from("tournament_registrations")
      .select("id")
      .eq("tournament_id", tournamentId);

    const numPairs = registrations?.length || 0;

    // Récupérer tous les matchs du Tour 4
    const { data: tour4Matches } = await supabaseAdmin
      .from("tournament_matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("round_number", 4)
      .order("tableau", { ascending: true })
      .order("match_order", { ascending: true });

    if (!tour4Matches || tour4Matches.length === 0) {
      return NextResponse.json(
        { error: "Aucun match du Tour 4 trouvé" },
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
          error: `Tous les matchs du Tour 4 doivent être complétés avant de calculer le classement final. ${incompleteMatches.length} match(s) restant(s).`,
        },
        { status: 400 }
      );
    }

    // Calculer le classement final
    const ranking: Record<string, number> = {};

    // Récupérer les matchs du Tour 3 pour obtenir les perdants (nécessaire pour TMC 12)
    // Récupérer TOUS les matchs du Tour 3, même s'ils ne sont pas complétés
    const { data: tour3Matches, error: tour3Error } = await supabaseAdmin
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

    // Logique spécifique pour TMC 12 équipes
    if (numPairs === 12) {

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
      // C'est le perdant du match 2 du tableau principal (Tour 3), ou si le match 2 est un bye, le perdant du match 1
      if (tour3Matches && tour3Matches.length > 0) {
        const principalMatches = tour3Matches.filter((m: Match) => m.tableau === "principal");
        const principalMatch1 = principalMatches.find((m: Match) => m.match_order === 1 && !m.is_bye);
        const principalMatch2 = principalMatches.find((m: Match) => m.match_order === 2 && !m.is_bye);
        const principalMatch2Bye = principalMatches.find((m: Match) => (m.match_order === 2 || !m.match_order) && m.is_bye);
        const principalBye = principalMatches.find((m: Match) => m.is_bye); // Le bye peut avoir n'importe quel match_order
        
        logger.info(
          {
            principalMatch1: principalMatch1 ? { 
              status: principalMatch1.status, 
              winner: principalMatch1.winner_registration_id?.substring(0, 8) + "…",
              team1: principalMatch1.team1_registration_id?.substring(0, 8) + "…",
              team2: principalMatch1.team2_registration_id?.substring(0, 8) + "…",
            } : null,
            principalMatch2: principalMatch2 ? { 
              status: principalMatch2.status, 
              winner: principalMatch2.winner_registration_id?.substring(0, 8) + "…",
              team1: principalMatch2.team1_registration_id?.substring(0, 8) + "…",
              team2: principalMatch2.team2_registration_id?.substring(0, 8) + "…",
            } : null,
            principalMatch2Bye: principalMatch2Bye ? { 
              winner: principalMatch2Bye.winner_registration_id?.substring(0, 8) + "…",
              team1: principalMatch2Bye.team1_registration_id?.substring(0, 8) + "…",
            } : null,
            principalBye: principalBye ? { 
              winner: principalBye.winner_registration_id?.substring(0, 8) + "…",
            } : null,
            finalists: Array.from(finalists).map((id: string) => id.substring(0, 8) + "…"),
          },
          "[calculate-final-ranking] Place 3 calculation details"
        );
        
        // Le perdant du match 2 (ou du match 1 si match 2 est un bye) qui n'est pas en finale
        if (principalMatch2 && principalMatch2.status === "completed" && principalMatch2.winner_registration_id) {
          // Match 2 normal : utiliser le perdant
          const principalMatch2Loser =
            principalMatch2.team1_registration_id === principalMatch2.winner_registration_id
              ? principalMatch2.team2_registration_id
              : principalMatch2.team1_registration_id;
          if (principalMatch2Loser && !finalists.has(principalMatch2Loser)) {
            ranking[principalMatch2Loser] = 3;
            logger.info({ registrationId: principalMatch2Loser.substring(0, 8) + "…" }, "[calculate-final-ranking] Place 3 assigned from principalMatch2");
          } else {
            logger.warn(
              {
                loser: principalMatch2Loser?.substring(0, 8) + "…",
                isFinalist: principalMatch2Loser ? finalists.has(principalMatch2Loser) : false,
              },
              "[calculate-final-ranking] Place 3 not assigned from principalMatch2"
            );
          }
        } else if ((principalMatch2Bye || principalBye) && principalMatch1 && principalMatch1.status === "completed" && principalMatch1.winner_registration_id) {
          // Match 2 est un bye (ou il y a un bye) : le perdant est le perdant du Match 1
          const principalMatch1Loser =
            principalMatch1.team1_registration_id === principalMatch1.winner_registration_id
              ? principalMatch1.team2_registration_id
              : principalMatch1.team1_registration_id;
          if (principalMatch1Loser && !finalists.has(principalMatch1Loser)) {
            ranking[principalMatch1Loser] = 3;
            logger.info({ registrationId: principalMatch1Loser.substring(0, 8) + "…" }, "[calculate-final-ranking] Place 3 assigned from principalMatch1 (bye)");
          } else {
            logger.warn(
              {
                loser: principalMatch1Loser?.substring(0, 8) + "…",
                isFinalist: principalMatch1Loser ? finalists.has(principalMatch1Loser) : false,
              },
              "[calculate-final-ranking] Place 3 not assigned from principalMatch1 (bye)"
            );
          }
        } else if (!principalMatch2 && !principalMatch2Bye && !principalBye && principalMatch1 && principalMatch1.status === "completed" && principalMatch1.winner_registration_id) {
          // Si le Match 2 n'existe pas encore (ni normal ni bye), utiliser le perdant du Match 1
          const principalMatch1Loser =
            principalMatch1.team1_registration_id === principalMatch1.winner_registration_id
              ? principalMatch1.team2_registration_id
              : principalMatch1.team1_registration_id;
          if (principalMatch1Loser && !finalists.has(principalMatch1Loser)) {
            ranking[principalMatch1Loser] = 3;
            logger.info({ registrationId: principalMatch1Loser.substring(0, 8) + "…" }, "[calculate-final-ranking] Place 3 assigned from principalMatch1 (no match 2)");
          }
        } else {
          logger.warn(
            {
              hasPrincipalMatch2: !!principalMatch2,
              hasPrincipalMatch2Bye: !!principalMatch2Bye,
              hasPrincipalMatch1: !!principalMatch1,
              principalMatch1Status: principalMatch1?.status,
              principalMatch1HasWinner: !!principalMatch1?.winner_registration_id,
            },
            "[calculate-final-ranking] Place 3 not assigned - conditions not met"
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
      // C'est le perdant du match 2 du tableau 4-6 (Tour 3), ou si le match 2 est un bye, le perdant du match 1
      if (tour3Matches && tour3Matches.length > 0) {
        const places4_6Matches = tour3Matches.filter((m: Match) => m.tableau === "places_4_6");
        const places4_6Match1 = places4_6Matches.find((m: Match) => m.match_order === 1 && !m.is_bye);
        const places4_6Match2 = places4_6Matches.find((m: Match) => m.match_order === 2 && !m.is_bye);
        const places4_6Match2Bye = places4_6Matches.find((m: Match) => (m.match_order === 2 || !m.match_order) && m.is_bye);
        const places4_6Bye = places4_6Matches.find((m: Match) => m.is_bye); // Le bye peut avoir n'importe quel match_order
        
        // Identifier les équipes qui sont allées au Tour 4 (gagnants du Tour 3)
        const places4_6Tour4Match = tour4Matches.find(
          (m: Match) => m.tableau === "places_4_6"
        );
        const places4_6Tour4Teams = new Set<string>();
        if (places4_6Tour4Match) {
          if (places4_6Tour4Match.team1_registration_id) places4_6Tour4Teams.add(places4_6Tour4Match.team1_registration_id);
          if (places4_6Tour4Match.team2_registration_id) places4_6Tour4Teams.add(places4_6Tour4Match.team2_registration_id);
        }
        
        // Le perdant du match 2 (ou du match 1 si match 2 est un bye) qui n'est pas au Tour 4
        if (places4_6Match2 && places4_6Match2.status === "completed" && places4_6Match2.winner_registration_id) {
          // Match 2 normal : utiliser le perdant
          const places4_6Match2Loser =
            places4_6Match2.team1_registration_id === places4_6Match2.winner_registration_id
              ? places4_6Match2.team2_registration_id
              : places4_6Match2.team1_registration_id;
          if (places4_6Match2Loser && !places4_6Tour4Teams.has(places4_6Match2Loser)) {
            ranking[places4_6Match2Loser] = 6;
            logger.info({ registrationId: places4_6Match2Loser.substring(0, 8) + "…" }, "[calculate-final-ranking] Place 6 assigned from places4_6Match2");
          } else {
            logger.warn(
              {
                loser: places4_6Match2Loser?.substring(0, 8) + "…",
                isInTour4: places4_6Match2Loser ? places4_6Tour4Teams.has(places4_6Match2Loser) : false,
              },
              "[calculate-final-ranking] Place 6 not assigned from places4_6Match2"
            );
          }
        } else if ((places4_6Match2Bye || places4_6Bye) && places4_6Match1 && places4_6Match1.status === "completed" && places4_6Match1.winner_registration_id) {
          // Match 2 est un bye (ou il y a un bye) : le perdant est le perdant du Match 1
          const places4_6Match1Loser =
            places4_6Match1.team1_registration_id === places4_6Match1.winner_registration_id
              ? places4_6Match1.team2_registration_id
              : places4_6Match1.team1_registration_id;
          if (places4_6Match1Loser && !places4_6Tour4Teams.has(places4_6Match1Loser)) {
            ranking[places4_6Match1Loser] = 6;
            logger.info({ registrationId: places4_6Match1Loser.substring(0, 8) + "…" }, "[calculate-final-ranking] Place 6 assigned from places4_6Match1 (bye)");
          } else {
            logger.warn(
              {
                loser: places4_6Match1Loser?.substring(0, 8) + "…",
                isInTour4: places4_6Match1Loser ? places4_6Tour4Teams.has(places4_6Match1Loser) : false,
              },
              "[calculate-final-ranking] Place 6 not assigned from places4_6Match1 (bye)"
            );
          }
        } else {
          logger.warn(
            {
              hasPlaces4_6Match2: !!places4_6Match2,
              hasPlaces4_6Match2Bye: !!places4_6Match2Bye,
              hasPlaces4_6Match1: !!places4_6Match1,
            },
            "[calculate-final-ranking] Place 6 not assigned - conditions not met"
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

    // Vérifier que toutes les places sont assignées (pour TMC 12) et assigner les places manquantes
    if (numPairs === 12) {
      const assignedRanks = new Set(Object.values(ranking));
      const assignedTeamIds = new Set(Object.keys(ranking));
      const missingRanks: number[] = [];
      for (let i = 1; i <= 12; i++) {
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
        
        // Essayer d'assigner les équipes non assignées aux places manquantes
        // en fonction des matchs du Tour 3 et Tour 4
        if (unassignedTeams.length > 0 && tour3Matches && tour3Matches.length > 0) {
          // Pour chaque place manquante, essayer de trouver l'équipe correspondante
          for (const missingRank of missingRanks.sort((a, b) => a - b)) {
            if (unassignedTeams.length === 0) break;
            
            // Logique spécifique selon la place manquante
            if (missingRank === 3) {
              // Place 3 : perdant du match 2 du tableau principal (Tour 3)
              const principalMatches = tour3Matches.filter((m: Match) => m.tableau === "principal");
              const principalMatch2 = principalMatches.find((m: Match) => m.match_order === 2 && !m.is_bye);
              const principalMatch2Bye = principalMatches.find((m: Match) => m.is_bye);
              const principalMatch1 = principalMatches.find((m: Match) => m.match_order === 1 && !m.is_bye);
              
              let candidateId: string | null = null;
              
              if (principalMatch2 && principalMatch2.status === "completed" && principalMatch2.winner_registration_id) {
                candidateId = principalMatch2.team1_registration_id === principalMatch2.winner_registration_id
                  ? principalMatch2.team2_registration_id
                  : principalMatch2.team1_registration_id;
              } else if ((principalMatch2Bye || principalMatch1) && principalMatch1 && principalMatch1.status === "completed" && principalMatch1.winner_registration_id) {
                candidateId = principalMatch1.team1_registration_id === principalMatch1.winner_registration_id
                  ? principalMatch1.team2_registration_id
                  : principalMatch1.team1_registration_id;
              }
              
              if (candidateId && unassignedTeams.includes(candidateId) && !finalists.has(candidateId)) {
                ranking[candidateId] = 3;
                unassignedTeams.splice(unassignedTeams.indexOf(candidateId), 1);
                logger.info({ registrationId: candidateId.substring(0, 8) + "…" }, "[calculate-final-ranking] Place 3 assigned (fallback)");
              }
            } else if (missingRank === 6) {
              // Place 6 : perdant du match 2 du tableau 4-6 (Tour 3)
              const places4_6Matches = tour3Matches.filter((m: Match) => m.tableau === "places_4_6");
              const places4_6Match2 = places4_6Matches.find((m: Match) => m.match_order === 2 && !m.is_bye);
              const places4_6Match2Bye = places4_6Matches.find((m: Match) => m.is_bye);
              const places4_6Match1 = places4_6Matches.find((m: Match) => m.match_order === 1 && !m.is_bye);
              
              const places4_6Tour4Match = tour4Matches.find((m: Match) => m.tableau === "places_4_6");
              const places4_6Tour4Teams = new Set<string>();
              if (places4_6Tour4Match) {
                if (places4_6Tour4Match.team1_registration_id) places4_6Tour4Teams.add(places4_6Tour4Match.team1_registration_id);
                if (places4_6Tour4Match.team2_registration_id) places4_6Tour4Teams.add(places4_6Tour4Match.team2_registration_id);
              }
              
              let candidateId: string | null = null;
              
              if (places4_6Match2 && places4_6Match2.status === "completed" && places4_6Match2.winner_registration_id) {
                candidateId = places4_6Match2.team1_registration_id === places4_6Match2.winner_registration_id
                  ? places4_6Match2.team2_registration_id
                  : places4_6Match2.team1_registration_id;
              } else if ((places4_6Match2Bye || places4_6Match1) && places4_6Match1 && places4_6Match1.status === "completed" && places4_6Match1.winner_registration_id) {
                candidateId = places4_6Match1.team1_registration_id === places4_6Match1.winner_registration_id
                  ? places4_6Match1.team2_registration_id
                  : places4_6Match1.team1_registration_id;
              }
              
              if (candidateId && unassignedTeams.includes(candidateId) && !places4_6Tour4Teams.has(candidateId)) {
                ranking[candidateId] = 6;
                unassignedTeams.splice(unassignedTeams.indexOf(candidateId), 1);
                logger.info({ registrationId: candidateId.substring(0, 8) + "…" }, "[calculate-final-ranking] Place 6 assigned (fallback)");
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
                
                if (candidateId && unassignedTeams.includes(candidateId) && !places7_9Tour4Teams.has(candidateId)) {
                  ranking[candidateId] = 9;
                  unassignedTeams.splice(unassignedTeams.indexOf(candidateId), 1);
                  logger.info({ registrationId: candidateId.substring(0, 8) + "…" }, "[calculate-final-ranking] Place 9 assigned (fallback)");
                }
              }
            } else if (missingRank === 10) {
              // Place 10 : gagnant du match du Tour 4 du tableau 10-12
              const places10_12Match = tour4Matches.find((m: Match) => m.tableau === "places_10_12");
              
              if (places10_12Match && places10_12Match.status === "completed" && places10_12Match.winner_registration_id) {
                const candidateId = places10_12Match.winner_registration_id;
                
                if (candidateId && unassignedTeams.includes(candidateId)) {
                  ranking[candidateId] = 10;
                  unassignedTeams.splice(unassignedTeams.indexOf(candidateId), 1);
                  logger.info({ registrationId: candidateId.substring(0, 8) + "…" }, "[calculate-final-ranking] Place 10 assigned (fallback)");
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

    // Vérification finale : s'assurer que toutes les équipes sont assignées (pour TMC 12)
    if (numPairs === 12) {
      const { data: allRegistrations } = await supabaseAdmin
        .from("tournament_registrations")
        .select("id")
        .eq("tournament_id", tournamentId);
      
      const allTeamIds = new Set((allRegistrations || []).map((reg: any) => reg.id));
      const assignedTeamIds = new Set(Object.keys(ranking));
      const unassignedTeamIds = Array.from(allTeamIds).filter((id: string) => !assignedTeamIds.has(id));
      
      const assignedRanks = new Set(Object.values(ranking));
      const missingRanks: number[] = [];
      for (let i = 1; i <= 12; i++) {
        if (!assignedRanks.has(i)) {
          missingRanks.push(i);
        }
      }
      
      if (unassignedTeamIds.length > 0 || missingRanks.length > 0) {
        logger.warn(
          {
            tournamentId: tournamentId.substring(0, 8) + "…",
            unassignedTeamIds: unassignedTeamIds.map((id: string) => id.substring(0, 8) + "…"),
            missingRanks,
            currentRankings: Object.entries(ranking).map(([id, rank]) => ({ registrationId: id.substring(0, 8) + "…", rank })),
          },
          "[calculate-final-ranking] Some teams or ranks are still missing after fallback"
        );
        
        // Assigner les équipes restantes aux places restantes
        for (let i = 0; i < Math.min(unassignedTeamIds.length, missingRanks.length); i++) {
          ranking[unassignedTeamIds[i]] = missingRanks[i];
          logger.info(
            { registrationId: unassignedTeamIds[i].substring(0, 8) + "…", rank: missingRanks[i] },
            "[calculate-final-ranking] Final assignment of remaining teams"
          );
        }
      }
    }

    // Mettre à jour les classements dans la base de données
    const updatePromises = Object.entries(ranking).map(([registrationId, rank]) =>
      supabaseAdmin
        .from("tournament_registrations")
        .update({ final_ranking: rank })
        .eq("id", registrationId)
        .eq("tournament_id", tournamentId)
    );

    await Promise.all(updatePromises);
    
    // Log final pour vérification
    logger.info(
      {
        tournamentId: tournamentId.substring(0, 8) + "…",
        finalRankingsCount: Object.keys(ranking).length,
        finalRankings: Object.entries(ranking)
          .sort(([, a], [, b]) => (a as number) - (b as number))
          .map(([id, rank]) => ({ registrationId: id.substring(0, 8) + "…", rank })),
      },
      "[calculate-final-ranking] Rankings saved to database"
    );

    return NextResponse.json({
      success: true,
      rankings: ranking,
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

