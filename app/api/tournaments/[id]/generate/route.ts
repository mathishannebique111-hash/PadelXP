import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
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

// Fonction : déterminer le nombre de têtes de série
function determineNumberOfSeeds(numPairs: number): number {
  if (numPairs <= 8) return 2;
  if (numPairs <= 16) return 4;
  if (numPairs <= 32) return 8;
  if (numPairs <= 64) return 16;
  return 16; // Max 16 têtes de série
}

// Fonction helper : mélanger un tableau (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Fonction : générer le tableau éliminatoire
async function generateKnockoutBracket(
  supabase: any,
  tournament: any,
  sortedPairs: any[],
  numSeeds: number
) {
  const numPairs = sortedPairs.length;
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(numPairs))); // 8, 16, 32, 64

  // Créer le tableau vide avec positions
  const bracket: (any | null)[] = new Array(bracketSize).fill(null);

  // 1. Placer la tête de série 1 en position 1
  bracket[0] = sortedPairs[0];

  // 2. Placer la tête de série 2 en position finale
  bracket[bracketSize - 1] = sortedPairs[1];

  // 3. Placer les têtes de série 3 et 4 (si elles existent)
  if (numSeeds >= 4) {
    // TS3 et TS4 sont tirées au sort entre les positions permettant de rencontrer TS1 et TS2 en demi-finale
    const ts3_positions = [bracketSize / 2 - 1, bracketSize / 2]; // Milieu du tableau
    const ts3_pos = ts3_positions[Math.floor(Math.random() * 2)];
    const ts4_pos = ts3_positions.find((p) => p !== ts3_pos)!;

    bracket[ts3_pos] = sortedPairs[2];
    bracket[ts4_pos] = sortedPairs[3];
  }

  // 4. Placer les têtes de série 5-8 (si elles existent)
  if (numSeeds >= 8) {
    // Positions stratégiques pour ne rencontrer les 4 premières qu'en quarts
    const positions_5_8 = [
      bracketSize / 4 - 1,
      bracketSize / 4,
      (3 * bracketSize) / 4 - 1,
      (3 * bracketSize) / 4,
    ];

    // Tirer au sort l'ordre
    const shuffled_5_8 = shuffleArray([4, 5, 6, 7]);
    for (let i = 0; i < 4; i++) {
      bracket[positions_5_8[i]] = sortedPairs[shuffled_5_8[i]];
    }
  }

  // 5. Placer les têtes de série 9-16 (si elles existent)
  if (numSeeds >= 16) {
    // Positions pour rencontrer les TS 1-8 au 2ème tour
    const positions_9_16 = [];
    for (let i = 0; i < 8; i++) {
      positions_9_16.push(i * (bracketSize / 8));
    }

    const shuffled_9_16 = shuffleArray([...Array(8)].map((_, i) => 8 + i));
    for (let i = 0; i < 8; i++) {
      const pos = positions_9_16[i];
      if (bracket[pos] === null) {
        bracket[pos] = sortedPairs[shuffled_9_16[i]];
      }
    }
  }

  // 6. Tirer au sort les paires restantes (non têtes de série)
  const nonSeededPairs = sortedPairs.slice(numSeeds);
  const shuffledNonSeeded = shuffleArray(nonSeededPairs);

  let nonSeededIndex = 0;
  for (let i = 0; i < bracketSize; i++) {
    if (bracket[i] === null && nonSeededIndex < shuffledNonSeeded.length) {
      bracket[i] = shuffledNonSeeded[nonSeededIndex++];
    }
  }

  // 7. Créer les matchs du premier tour
  const firstRound = `round_of_${bracketSize}`;
  let matchNumber = 1;

  for (let i = 0; i < bracketSize; i += 2) {
    const pair1 = bracket[i];
    const pair2 = bracket[i + 1];

    // Gérer les byes (si une position est vide)
    const isBye = !pair1 || !pair2;

    await supabase.from("tournament_matches").insert({
      tournament_id: tournament.id,
      round_type: firstRound,
      match_order: matchNumber++,
      team1_registration_id: pair1?.id || null,
      team2_registration_id: pair2?.id || null,
      is_bye: isBye,
      status: isBye ? "completed" : "scheduled",
      winner_registration_id: isBye ? (pair1?.id || pair2?.id) : null,
    });
  }

  logger.info(
    {
      tournamentId: tournament.id.substring(0, 8) + "…",
      bracketSize,
      matchesCreated: matchNumber - 1,
    },
    "[generate] Knockout bracket generated"
  );
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

    const { id } = params;

    // 1. Récupérer le tournoi
    const { data: tournament, error: tournamentError } = await supabase
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
        "[generate] Tournament not found"
      );
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    // 2. Vérifier autorisation (admin du club)
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Admin client not configured" },
        { status: 500 }
      );
    }

    const { data: clubAdmin } = await supabaseAdmin
      .from("club_admins")
      .select("club_id")
      .eq("user_id", user.id)
      .eq("club_id", tournament.club_id)
      .not("activated_at", "is", null)
      .maybeSingle();

    if (!clubAdmin || clubAdmin.club_id !== tournament.club_id) {
      logger.warn(
        {
          userId: user.id.substring(0, 8) + "…",
          tournamentId: id.substring(0, 8) + "…",
        },
        "[generate] Forbidden: User is not admin of this tournament's club"
      );
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Vérifier statut
    if (tournament.status !== "registration_closed") {
      return NextResponse.json(
        {
          error:
            "Le tournoi doit être en statut 'registration_closed' pour générer le tableau",
        },
        { status: 400 }
      );
    }

    // 4. Récupérer les inscriptions validées
    const { data: registrations, error: regError } = await supabaseAdmin
      .from("tournament_registrations")
      .select("*")
      .eq("tournament_id", id)
      .eq("status", "confirmed")
      .order("pair_total_rank", { ascending: true });

    if (regError) {
      logger.error(
        {
          tournamentId: id.substring(0, 8) + "…",
          error: regError.message,
        },
        "[generate] Error fetching registrations"
      );
      return NextResponse.json(
        { error: "Error fetching registrations" },
        { status: 500 }
      );
    }

    if (!registrations || registrations.length === 0) {
      return NextResponse.json(
        { error: "Aucune inscription validée trouvée" },
        { status: 400 }
      );
    }

    // 5. Vérifier limite d'équipes
    const maxTeams = tournament.max_teams || 16;
    if (registrations.length !== maxTeams) {
      return NextResponse.json(
        {
          error: `Nombre d'équipes incorrect : ${registrations.length}/${maxTeams}. Le tableau doit être complet.`,
        },
        { status: 400 }
      );
    }

    // 6. Trier les paires par classement (ordre croissant = meilleures en premier)
    const sortedPairs = [...registrations].sort(
      (a, b) => (a.pair_total_rank || 0) - (b.pair_total_rank || 0)
    );

    // 7. Déterminer le nombre de têtes de série
    const numSeeds = determineNumberOfSeeds(sortedPairs.length);

    // 8. Attribuer les numéros de têtes de série
    for (let i = 0; i < numSeeds; i++) {
      await supabaseAdmin
        .from("tournament_registrations")
        .update({ seed_number: i + 1 })
        .eq("id", sortedPairs[i].id);

      sortedPairs[i].seed_number = i + 1;
    }

    // 9. Générer le tableau selon le format
    if (tournament.tournament_type === "official_knockout") {
      await generateKnockoutBracket(
        supabaseAdmin,
        tournament,
        sortedPairs,
        numSeeds
      );
    } else {
      return NextResponse.json(
        {
          error:
            "Type de tournoi non supporté (seul official_knockout est implémenté)",
        },
        { status: 400 }
      );
    }

    // 10. Mettre à jour le statut
    await supabaseAdmin
      .from("tournaments")
      .update({ status: "draw_published" })
      .eq("id", id);

    logger.info(
      {
        tournamentId: id.substring(0, 8) + "…",
        numPairs: sortedPairs.length,
        numSeeds,
      },
      "[generate] Tournament bracket generated successfully"
    );

    return NextResponse.json({
      success: true,
      numPairs: sortedPairs.length,
      numSeeds,
    });
  } catch (error: any) {
    logger.error(
      { error: error.message, stack: error.stack },
      "[generate] Error generating tournament bracket"
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
