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

    // Mettre à jour les classements dans la base de données
    const updatePromises = Object.entries(ranking).map(([registrationId, rank]) =>
      supabaseAdmin
        .from("tournament_registrations")
        .update({ final_ranking: rank })
        .eq("id", registrationId)
        .eq("tournament_id", tournamentId)
    );

    await Promise.all(updatePromises);

    logger.info(
      {
        tournamentId: tournamentId.substring(0, 8) + "…",
        rankingsCount: Object.keys(ranking).length,
      },
      "[calculate-final-ranking] Final ranking calculated"
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

