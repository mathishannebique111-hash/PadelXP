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

// Types utilitaires
type RegistrationPair = {
  id: string;
  tournament_id: string;
  pair_total_rank: number | null;
  player1_rank?: number | null;
  player2_rank?: number | null;
  seed_number?: number | null;
  [key: string]: any;
};

type PreparedDraw = {
  sortedPairs: RegistrationPair[];
  numSeeds: number;
  bracketSize: number;
};

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

// Déterminer le type de round en fonction de la taille du tableau
function getRoundTypeFromBracketSize(bracketSize: number): string {
  switch (bracketSize) {
    case 64:
      return "round_of_64";
    case 32:
      return "round_of_32";
    case 16:
      return "round_of_16";
    case 8:
      return "quarters";
    case 4:
      return "semis";
    default:
      return "qualifications";
  }
}

// Préparation des paires pour le tirage (commune à tous les formats)
function preparePairsForDraw(registrations: any[]): PreparedDraw {
  // S'assurer que pair_total_rank est bien renseigné
  const withComputedRank: RegistrationPair[] = registrations.map((reg) => {
    let pair_total_rank = reg.pair_total_rank as number | null;
    if (
      (pair_total_rank === null || typeof pair_total_rank === "undefined") &&
      typeof reg.player1_rank === "number" &&
      typeof reg.player2_rank === "number"
    ) {
      pair_total_rank = reg.player1_rank + reg.player2_rank;
    }

    return {
      ...reg,
      pair_total_rank: pair_total_rank ?? Number.MAX_SAFE_INTEGER,
    };
  });

  const sortedPairs = withComputedRank.sort(
    (a, b) => (a.pair_total_rank || 0) - (b.pair_total_rank || 0)
  );

  const numPairs = sortedPairs.length;
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(numPairs))); // 4, 8, 16, 32, 64
  const numSeeds = determineNumberOfSeeds(numPairs);

  return { sortedPairs, numSeeds, bracketSize };
}

// Génération : élimination directe officielle
async function generateOfficialKnockout(
  supabase: any,
  tournament: any,
  sortedPairs: RegistrationPair[],
  numSeeds: number,
  bracketSize: number
) {
  const numPairs = sortedPairs.length;

  // Créer le tableau vide avec positions
  const bracket: (RegistrationPair | null)[] = new Array(bracketSize).fill(
    null
  );

  // 1. TS1 en haut du tableau
  bracket[0] = sortedPairs[0];

  // 2. TS2 en bas du tableau
  if (numSeeds >= 2 && sortedPairs[1]) {
    bracket[bracketSize - 1] = sortedPairs[1];
  }

  // 3. TS3 et TS4
  if (numSeeds >= 4 && sortedPairs[2] && sortedPairs[3]) {
    const ts3Positions = [bracketSize / 2 - 1, bracketSize / 2]; // Milieu du tableau
    const ts3Pos = ts3Positions[Math.floor(Math.random() * 2)];
    const ts4Pos = ts3Positions.find((p) => p !== ts3Pos)!;

    bracket[ts3Pos] = sortedPairs[2];
    bracket[ts4Pos] = sortedPairs[3];
  }

  // 4. TS5–8
  if (numSeeds >= 8) {
    const positions5_8 = [
      bracketSize / 4 - 1,
      bracketSize / 4,
      (3 * bracketSize) / 4 - 1,
      (3 * bracketSize) / 4,
    ];

    const shuffled5_8 = shuffleArray([4, 5, 6, 7]);
    for (let i = 0; i < 4 && i < positions5_8.length; i++) {
      const pairIndex = shuffled5_8[i];
      if (sortedPairs[pairIndex]) {
        bracket[positions5_8[i]] = sortedPairs[pairIndex];
      }
    }
  }

  // 5. TS9–16
  if (numSeeds >= 16) {
    const positions9_16: number[] = [];
    for (let i = 0; i < 8; i++) {
      positions9_16.push(i * (bracketSize / 8));
    }

    const shuffled9_16 = shuffleArray(
      [...Array(8)].map((_, i) => 8 + i) // indices 8 à 15
    );
    for (let i = 0; i < 8; i++) {
      const pos = positions9_16[i];
      if (bracket[pos] === null) {
        const pairIndex = shuffled9_16[i];
        if (sortedPairs[pairIndex]) {
          bracket[pos] = sortedPairs[pairIndex];
        }
      }
    }
  }

  // 6. Paires non têtes de série
  const nonSeededPairs = sortedPairs.slice(numSeeds, numPairs);
  const shuffledNonSeeded = shuffleArray(nonSeededPairs);

  let nonSeededIndex = 0;
  for (let i = 0; i < bracketSize; i++) {
    if (bracket[i] === null && nonSeededIndex < shuffledNonSeeded.length) {
      bracket[i] = shuffledNonSeeded[nonSeededIndex++];
    }
  }

  const firstRound = getRoundTypeFromBracketSize(bracketSize);
  let matchNumber = 1;

  for (let i = 0; i < bracketSize; i += 2) {
    const pair1 = bracket[i];
    const pair2 = bracket[i + 1];

    const isBye = !pair1 || !pair2;

    await supabase.from("tournament_matches").insert({
      tournament_id: tournament.id,
      round_type: firstRound,
      round_number: 1,
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
    "[generate] official_knockout bracket generated"
  );
}

// Génération : poules + tableau final (V1 : poules uniquement)
async function generateOfficialPoolsAndFinal(
  supabase: any,
  tournament: any,
  sortedPairs: RegistrationPair[]
) {
  const numPairs = sortedPairs.length;
  const numPools = numPairs / 4; // 4 équipes par poule (4, 8, 12, 16, …, 64 ⇒ multiple de 4)

  if (!Number.isInteger(numPools)) {
    throw new Error(
      "Erreur : nombre d'équipes invalide pour une répartition en poules de 4"
    );
  }

  // Règle : il faut au moins 2 têtes de série par poule
  const requiredSeeds = numPools * 2;
  if (numPairs < requiredSeeds) {
    throw new Error(
      "Erreur : nombre d'équipes insuffisant pour garantir 2 têtes de série par poule"
    );
  }

  // Les équipes sont déjà triées par classement/poids via preparePairsForDraw.
  // On identifie les têtes de série à partir du champ seed_number.
  const seeds = sortedPairs
    .filter((p) => typeof p.seed_number === "number")
    .sort((a, b) => (a.seed_number! || 0) - (b.seed_number! || 0));

  if (seeds.length < requiredSeeds) {
    throw new Error("Erreur : répartition invalide des têtes de série");
  }

  const pools: RegistrationPair[][] = Array.from(
    { length: numPools },
    () => []
  );

  // 1) Répartition des têtes de série en SERPENTIN
  let direction = 1;
  let poolIndex = 0;

  for (let i = 0; i < requiredSeeds; i++) {
    const team = seeds[i];
    pools[poolIndex].push(team);

    poolIndex += direction;

    // Changement de direction en bout de tableau
    if (poolIndex >= numPools) {
      direction = -1;
      poolIndex = numPools - 1;
    } else if (poolIndex < 0) {
      direction = 1;
      poolIndex = 0;
    }
  }

  // 2) Répartition des autres équipes (non têtes de série)
  const nonSeedTeams = sortedPairs.filter(
    (p) =>
      typeof p.seed_number !== "number" ||
      (typeof p.seed_number === "number" && p.seed_number! > requiredSeeds)
  );

  // On complète chaque poule jusqu'à 4 équipes, en boucle simple
  let nonSeedIndex = 0;
  let currentPool = 0;

  while (nonSeedIndex < nonSeedTeams.length) {
    if (pools[currentPool].length < 4) {
      pools[currentPool].push(nonSeedTeams[nonSeedIndex]);
      nonSeedIndex++;
    }
    currentPool = (currentPool + 1) % numPools;
  }

  // 3) Validations après répartition
  for (let i = 0; i < pools.length; i++) {
    const poolTeams = pools[i];
    if (poolTeams.length !== 4) {
      throw new Error(
        `Erreur : la poule ${i + 1} ne respecte pas la taille maximale (4 équipes)`
      );
    }

    const seedCount = poolTeams.filter(
      (p) => typeof p.seed_number === "number" && p.seed_number! <= requiredSeeds
    ).length;

    if (seedCount !== 2) {
      throw new Error(
        `Erreur : la poule ${i + 1} contient ${seedCount} têtes de série au lieu de 2`
      );
    }
  }

  // Création des poules + matchs
  for (let i = 0; i < pools.length; i++) {
    const { data: pool, error: poolError } = await supabase
      .from("tournament_pools")
      .insert({
        tournament_id: tournament.id,
        pool_number: i + 1,
        pool_type: "main_draw",
        num_teams: pools[i].length,
        format: tournament.pool_format || "D1",
        status: "pending",
      })
      .select()
      .single();

    if (poolError || !pool) {
      logger.error(
        {
          tournamentId: tournament.id.substring(0, 8) + "…",
          poolNumber: i + 1,
          error: poolError?.message,
        },
        "[generate] Error creating pool"
      );
      continue;
    }

    // Affecter la poule aux inscriptions
    for (const pair of pools[i]) {
      await supabase
        .from("tournament_registrations")
        .update({ pool_id: pool.id, phase: "main_draw" })
        .eq("id", pair.id);
    }

    // Générer les matchs de poule en round-robin avec ordre "tours"
    const poolTeams = pools[i];
    const n = poolTeams.length;
    const matches: { team1: RegistrationPair; team2: RegistrationPair }[] = [];

    if (n === 4) {
      // Ordre recommandé :
      // Tour 1 : A-B, C-D
      // Tour 2 : A-C, B-D
      // Tour 3 : A-D, B-C
      const indicesOrder: [number, number][] = [
        [0, 1],
        [2, 3],
        [0, 2],
        [1, 3],
        [0, 3],
        [1, 2],
      ];
      for (const [a, b] of indicesOrder) {
        if (poolTeams[a] && poolTeams[b]) {
          matches.push({ team1: poolTeams[a], team2: poolTeams[b] });
        }
      }
    } else if (n === 3) {
      // Tour 1 : A-B
      // Tour 2 : A-C
      // Tour 3 : B-C
      const indicesOrder: [number, number][] = [
        [0, 1],
        [0, 2],
        [1, 2],
      ];
      for (const [a, b] of indicesOrder) {
        if (poolTeams[a] && poolTeams[b]) {
          matches.push({ team1: poolTeams[a], team2: poolTeams[b] });
        }
      }
    } else {
      // Fallback générique tous-contre-tous
      for (let a = 0; a < n; a++) {
        for (let b = a + 1; b < n; b++) {
          matches.push({ team1: poolTeams[a], team2: poolTeams[b] });
        }
      }
    }

    for (let m = 0; m < matches.length; m++) {
      const { error: matchError } = await supabase
        .from("tournament_matches")
        .insert({
          tournament_id: tournament.id,
          pool_id: pool.id,
          round_type: "pool",
          round_number: 1,
          match_order: m + 1,
          team1_registration_id: matches[m].team1.id,
          team2_registration_id: matches[m].team2.id,
          status: "scheduled",
        });

      if (matchError) {
        logger.error(
          {
            poolId: pool.id.substring(0, 8) + "…",
            matchOrder: m + 1,
            error: matchError.message,
          },
          "[generate] Error creating pool match"
        );
      }
    }
  }

  logger.info(
    {
      tournamentId: tournament.id.substring(0, 8) + "…",
      numPools,
    },
    "[generate] official_pools generated (pools only, TODO: final draw)"
  );
}

// Génération : Americano
async function generateAmericano(
  supabase: any,
  tournament: any,
  sortedPairs: RegistrationPair[]
) {
  const numPairs = sortedPairs.length;

  // Générer toutes les confrontations possibles (round-robin)
  const allMatchups: { team1: RegistrationPair; team2: RegistrationPair }[] =
    [];
  for (let i = 0; i < numPairs; i++) {
    for (let j = i + 1; j < numPairs; j++) {
      allMatchups.push({ team1: sortedPairs[i], team2: sortedPairs[j] });
    }
  }

  const shuffledMatchups = shuffleArray(allMatchups);

  // Limiter le nombre de matchs par équipe (~3–4)
  const maxMatchesPerTeam = numPairs <= 4 ? numPairs - 1 : 4;
  const matchCount = new Map<string, number>();
  const selected: { team1: RegistrationPair; team2: RegistrationPair }[] = [];

  for (const m of shuffledMatchups) {
    const c1 = matchCount.get(m.team1.id) ?? 0;
    const c2 = matchCount.get(m.team2.id) ?? 0;
    if (c1 >= maxMatchesPerTeam || c2 >= maxMatchesPerTeam) continue;

    selected.push(m);
    matchCount.set(m.team1.id, c1 + 1);
    matchCount.set(m.team2.id, c2 + 1);
  }

  let matchOrder = 1;

  for (const m of selected) {
    const { error } = await supabase.from("tournament_matches").insert({
      tournament_id: tournament.id,
      // NOTE: le schéma actuel de la table limite les valeurs de round_type.
      // On utilise 'qualifications' comme valeur générique compatible,
      // et on se base sur tournament.tournament_type === 'americano' pour l'interprétation.
      round_type: "qualifications",
      round_number: 1,
      match_order,
      team1_registration_id: m.team1.id,
      team2_registration_id: m.team2.id,
      status: "scheduled",
    });

    if (error) {
      logger.error(
        {
          tournamentId: tournament.id.substring(0, 8) + "…",
          matchOrder,
          error: error.message,
        },
        "[generate] Error creating americano match"
      );
    }

    matchOrder++;
  }

  logger.info(
    {
      tournamentId: tournament.id.substring(0, 8) + "…",
      numPairs,
      matchesCreated: selected.length,
    },
    "[generate] Americano schedule generated"
  );
}

// Génération : Round-robin pur (toutes les paires se rencontrent)
async function generateRoundRobin(
  supabase: any,
  tournament: any,
  sortedPairs: RegistrationPair[]
) {
  const numPairs = sortedPairs.length;
  const matches: { team1: RegistrationPair; team2: RegistrationPair }[] = [];

  for (let i = 0; i < numPairs; i++) {
    for (let j = i + 1; j < numPairs; j++) {
      matches.push({ team1: sortedPairs[i], team2: sortedPairs[j] });
    }
  }

  let matchOrder = 1;

  for (const m of matches) {
    const { error } = await supabase.from("tournament_matches").insert({
      tournament_id: tournament.id,
      round_type: "pool",
      round_number: 1,
      match_order,
      team1_registration_id: m.team1.id,
      team2_registration_id: m.team2.id,
      status: "scheduled",
    });

    if (error) {
      logger.error(
        {
          tournamentId: tournament.id.substring(0, 8) + "…",
          matchOrder,
          error: error.message,
        },
        "[generate] Error creating round-robin match"
      );
    }

    matchOrder++;
  }

  logger.info(
    {
      tournamentId: tournament.id.substring(0, 8) + "…",
      numPairs,
      matchesCreated: matches.length,
    },
    "[generate] Round-robin schedule generated"
  );
}

// Génération : TMC (Tournoi Multi-Chances)
// Objectif : garantir 3 matchs par équipe, avec tableaux de classement.
// Note : V1 supporte 8 et 16 équipes. Pour d'autres tailles, on retournera une erreur explicite.
async function generateTmc(
  supabase: any,
  tournament: any,
  sortedPairs: RegistrationPair[],
  bracketSize: number
) {
  const numPairs = sortedPairs.length;

  if (numPairs !== 8 && numPairs !== 12 && numPairs !== 16) {
    throw new Error(
      "Erreur : le format TMC est uniquement supporté pour 8, 12 ou 16 équipes."
    );
  }

  // 1) Créer le bracket principal avec placement standard pour TMC
  const mainBracketSize = bracketSize; // 8, 12 ou 16

  // Pour TMC 16 équipes : placement standard selon le guide
  // [0,15], [7,8], [3,12], [4,11], [1,14], [6,9], [2,13], [5,10]
  let bracket: (RegistrationPair | null)[] = [];
  
  if (numPairs === 16) {
    // Placement standard TMC 16 équipes
    const pairs = [
      [0, 15],  // TS1 vs 16ème
      [7, 8],   // TS8 vs 9ème
      [3, 12],  // TS4 vs 13ème
      [4, 11],  // TS5 vs 12ème
      [1, 14],  // TS2 vs 15ème
      [6, 9],   // TS7 vs 10ème
      [2, 13],  // TS3 vs 14ème
      [5, 10]   // TS6 vs 11ème
    ];
    
    for (const [idx1, idx2] of pairs) {
      bracket.push(sortedPairs[idx1]);
      bracket.push(sortedPairs[idx2]);
    }
  } else if (numPairs === 12) {
    // TMC 12 équipes : Tour 1 = 6 matchs, AUCUN bye
    // Toutes les 12 équipes jouent au premier tour
    bracket = new Array(mainBracketSize).fill(null);
    
    // Placement des 12 équipes pour créer 6 matchs sans byes
    // On utilise seulement les 12 premières positions (0-11) pour créer 6 matchs
    // Structure : [0,1], [2,3], [4,5], [6,7], [8,9], [10,11]
    // Les positions 12-15 restent vides (non utilisées)
    
    // Placement standard : TS1, TS2, TS3, TS4 aux positions clés
    // TS1 en position 0
    bracket[0] = sortedPairs[0];
    // TS2 en position 11 (dernière position utilisée)
    bracket[11] = sortedPairs[1];
    // TS3 en position 5 (milieu)
    bracket[5] = sortedPairs[2];
    // TS4 en position 6 (milieu)
    bracket[6] = sortedPairs[3];
    
    // TS5 à TS12 : placer dans les positions restantes
    // Positions disponibles : 1, 2, 3, 4, 7, 8, 9, 10
    const availablePositions = [1, 2, 3, 4, 7, 8, 9, 10];
    let pairIndex = 4; // Commencer à TS5 (index 4)
    for (const pos of availablePositions) {
      if (pairIndex < numPairs) {
        bracket[pos] = sortedPairs[pairIndex++];
      }
    }
    
    // Vérification : 12 équipes placées dans les positions 0-11 = 6 matchs sans byes
  } else {
    // TMC 8 équipes : placement déterministe meilleur vs moins bon
    // TS1 vs TS8, TS4 vs TS5, TS3 vs TS6, TS2 vs TS7
    // sortedPairs est déjà trié par niveau (TS1 = index 0, TS8 = index 7)
    bracket = new Array(mainBracketSize).fill(null);
    const mapping = [0, 7, 3, 4, 2, 5, 1, 6]; // positions dans bracket
    mapping.forEach((pairIndex, bracketPos) => {
      if (sortedPairs[pairIndex]) {
        bracket[bracketPos] = sortedPairs[pairIndex];
      }
    });
  }

  // 2) Créer les matchs du premier tour
  // Pour TMC 12 : 6 matchs (12 équipes / 2), AUCUN bye
  // Pour TMC 8 : 4 matchs (8 équipes / 2)
  // Pour TMC 16 : 8 matchs (16 équipes / 2)
  const firstRound = getRoundTypeFromBracketSize(mainBracketSize);
  const createdMatches: {
    id: string;
    order: number;
  }[] = [];

  let matchOrder = 1;
  // Pour TMC 12, on crée seulement 6 matchs (positions 0-11), AUCUN bye
  const maxPosition = numPairs === 12 ? 12 : mainBracketSize;
  for (let i = 0; i < maxPosition; i += 2) {
    const pair1 = bracket[i];
    const pair2 = bracket[i + 1];
    // Pour TMC 12, il ne doit jamais y avoir de bye au Tour 1
    const isBye = numPairs === 12 ? false : (!pair1 || !pair2);

    // Préparer les données d'insertion
    const insertData: any = {
      tournament_id: tournament.id,
      round_type: firstRound,
      round_number: 1,
      match_order: matchOrder,
      team1_registration_id: pair1?.id || null,
      team2_registration_id: pair2?.id || null,
      is_bye: isBye,
      status: isBye ? "completed" : "scheduled",
      winner_registration_id: isBye ? (pair1?.id || pair2?.id) : null,
    };

    // Ajouter le champ tableau pour TMC 8/12/16 (si la colonne existe)
    if (numPairs === 8 || numPairs === 12 || numPairs === 16) {
      insertData.tableau = "principal";
    }

    let { data, error } = await supabase
      .from("tournament_matches")
      .insert(insertData)
      .select("id")
      .single();

    // Si l'erreur indique que la colonne tableau n'existe pas, réessayer sans
    if (error && error.message?.includes("tableau")) {
      delete insertData.tableau;
      const retry = await supabase
        .from("tournament_matches")
        .insert(insertData)
        .select("id")
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error || !data) {
      logger.error(
        {
          tournamentId: tournament.id.substring(0, 8) + "…",
          roundType: firstRound,
          matchOrder,
          error: error?.message,
          errorDetails: error,
        },
        "[generate] Error creating TMC first-round match"
      );
      throw new Error(
        `Erreur lors de la génération du premier tour TMC: ${error?.message || "Erreur inconnue"}`
      );
    }

    createdMatches.push({ id: data.id, order: matchOrder });
    matchOrder++;
  }

  // 3) Générer la structure de classement en fonction du nombre d'équipes
  // Pour TMC 8 : progression tour par tour via /advance/tmc-next-round
  if (numPairs === 12 || numPairs === 16) {
    // TMC 12 et 16 équipes : on génère uniquement le Tour 1 (8èmes de finale pour 16, 1/8 avec byes pour 12)
    // Les tours suivants seront générés progressivement via la route /advance/tmc-next-round
    // Pas de matchs de classement créés ici, ils seront générés au Tour 4
  }

  logger.info(
    {
      tournamentId: tournament.id.substring(0, 8) + "…",
      numPairs,
      mainBracketSize,
    },
    "[generate] TMC bracket generated (V1 – main draw + classification skeleton)"
  );
}

// Génération : Double élimination (V1 – bracket principal + TODO losers bracket)
async function generateDoubleElimination(
  supabase: any,
  tournament: any,
  sortedPairs: RegistrationPair[],
  bracketSize: number
) {
  // V1 : on génère uniquement le winners bracket (élimination directe classique).
  await generateOfficialKnockout(
    supabase,
    tournament,
    sortedPairs,
    determineNumberOfSeeds(sortedPairs.length),
    bracketSize
  );

  // TODO: créer le losers bracket lié aux matchs via next_match_id / positions.
  logger.info(
    {
      tournamentId: tournament.id.substring(0, 8) + "…",
    },
    "[generate] Double elimination winners bracket generated (TODO: losers bracket)"
  );
}

// Génération : Poules + 3 tableaux (V1 – poules uniquement)
async function generatePoolsTripleDraw(
  supabase: any,
  tournament: any,
  sortedPairs: RegistrationPair[]
) {
  // V1 : on réutilise la génération de poules standard.
  await generateOfficialPoolsAndFinal(supabase, tournament, sortedPairs);

  // TODO: à partir des classements de poules, répartir dans 3 tableaux (A/B/C).
  logger.info(
    {
      tournamentId: tournament.id.substring(0, 8) + "…",
    },
    "[generate] Pools for triple-draw generated (TODO: 3 separate knockout brackets)"
  );
}

// Génération : Mexicano (V1 simplifiée, rounds fixes)
async function generateMexicano(
  supabase: any,
  tournament: any,
  sortedPairs: RegistrationPair[]
) {
  const numPairs = sortedPairs.length;
  const rounds =
    numPairs <= 4 ? 2 : numPairs <= 8 ? 3 : 4; // heuristique simple pour V1

  for (let round = 0; round < rounds; round++) {
    // Rotation simple des indices pour varier les oppositions
    const rotated = [...sortedPairs.slice(round), ...sortedPairs.slice(0, round)];

    let matchOrder = 1;
    for (let i = 0; i < rotated.length; i += 2) {
      const team1 = rotated[i];
      const team2 = rotated[i + 1];
      if (!team1 || !team2) continue;

      const { error } = await supabase.from("tournament_matches").insert({
        tournament_id: tournament.id,
        // Cf. commentaire dans generateAmericano : on reste sur une valeur autorisée
        round_type: "qualifications",
        round_number: round + 1,
        match_order,
        team1_registration_id: team1.id,
        team2_registration_id: team2.id,
        status: "scheduled",
      });

      if (error) {
        logger.error(
          {
            tournamentId: tournament.id.substring(0, 8) + "…",
            round: round + 1,
            matchOrder,
            error: error.message,
          },
          "[generate] Error creating mexicano match"
        );
      }

      matchOrder++;
    }
  }

  logger.info(
    {
      tournamentId: tournament.id.substring(0, 8) + "…",
      numPairs,
      rounds,
    },
    "[generate] Mexicano rounds generated (V1)"
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

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
          error: "Veuillez clore les inscriptions pour générer le tableau",
        },
        { status: 400 }
      );
    }

    // 4. Récupérer toutes les inscriptions pour vérifier qu'elles sont toutes validées
    const { data: allRegistrations, error: allRegError } = await supabaseAdmin
      .from("tournament_registrations")
      .select("id, status")
      .eq("tournament_id", id);

    if (allRegError) {
      logger.error(
        {
          tournamentId: id.substring(0, 8) + "…",
          error: allRegError.message,
        },
        "[generate] Error fetching all registrations"
      );
      return NextResponse.json(
        { error: "Erreur lors de la récupération des inscriptions" },
        { status: 500 }
      );
    }

    // Vérifier qu'il y a au moins une inscription
    if (!allRegistrations || allRegistrations.length === 0) {
      return NextResponse.json(
        { error: "Aucune inscription trouvée. Veuillez d'abord accepter des inscriptions." },
        { status: 400 }
      );
    }

    // Vérifier que toutes les inscriptions sont validées
    const nonValidatedRegistrations = allRegistrations.filter(
      (reg) => reg.status !== "confirmed" && reg.status !== "validated"
    );

    if (nonValidatedRegistrations.length > 0) {
      return NextResponse.json(
        {
          error: `Toutes les inscriptions doivent être validées avant de générer le tableau. ${nonValidatedRegistrations.length} inscription(s) en attente de validation.`,
        },
        { status: 400 }
      );
    }

    // 5. Récupérer les inscriptions validées / confirmées pour la génération
    const { data: registrations, error: regError } = await supabaseAdmin
      .from("tournament_registrations")
      .select("*")
      .eq("tournament_id", id)
      .in("status", ["confirmed", "validated"])
      .order("pair_total_rank", { ascending: true });

    if (regError) {
      logger.error(
        {
          tournamentId: id.substring(0, 8) + "…",
          error: regError.message,
        },
        "[generate] Error fetching validated registrations"
      );
      return NextResponse.json(
        { error: "Erreur lors de la récupération des inscriptions validées" },
        { status: 500 }
      );
    }

    if (!registrations || registrations.length === 0) {
      return NextResponse.json(
        { error: "Aucune inscription validée trouvée" },
        { status: 400 }
      );
    }

    // 6. Vérifier taille supportée pour les formats officiels
    const numPairs = registrations.length;
    const allowedSizes = [
      4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64,
    ];
    if (!allowedSizes.includes(numPairs)) {
      return NextResponse.json(
        {
          error:
            `Nombre d'inscriptions insuffisant. Le tournoi nécessite au moins 4 inscriptions validées. Actuellement : ${numPairs} inscription(s) validée(s). Seuls 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60 ou 64 équipes sont supportées pour la génération automatique.`,
        },
        { status: 400 }
      );
    }

    // 5bis. Validation spécifique TMC 8 : formats autorisés
    if (tournament.tournament_type === "tmc" && numPairs === 8) {
      const allowedTmc8Formats = ["A1", "B1", "C1", "D1"] as const;
      if (!allowedTmc8Formats.includes(tournament.match_format as any)) {
        return NextResponse.json(
          {
            error:
              "Format de match non autorisé pour un TMC 8 équipes. Formats acceptés : A1, B1, C1, D1.",
          },
          { status: 400 }
        );
      }
    }

    // 6. Préparer les paires (tri, seeds, taille de tableau)
    const { sortedPairs, numSeeds, bracketSize } =
      preparePairsForDraw(registrations);

    // Pour les tournois avec poules, on calcule les têtes de série selon :
    // nb_tetes_de_serie = nb_poules × 2
    const isPoolTournament =
      tournament.tournament_type === "official_pools" ||
      tournament.tournament_type === "pools_triple_draw";

    const numPoolsForSeeding = isPoolTournament ? numPairs / 4 : 0;
    const requiredSeedsForPools = isPoolTournament
      ? numPoolsForSeeding * 2
      : 0;

    if (isPoolTournament && !Number.isInteger(numPoolsForSeeding)) {
      return NextResponse.json(
        {
          error:
            "Erreur : nombre d'équipes invalide pour une répartition en poules de 4",
        },
        { status: 400 }
      );
    }

    if (isPoolTournament && numPairs < requiredSeedsForPools) {
      return NextResponse.json(
        {
          error:
            "Erreur : nombre d'équipes insuffisant pour garantir 2 têtes de série par poule",
        },
        { status: 400 }
      );
    }

    const effectiveNumSeeds = isPoolTournament
      ? Math.min(requiredSeedsForPools, sortedPairs.length)
      : numSeeds;

    // Pour TMC 12 et TMC 8 : toutes les équipes sont têtes de série (TS1 à TSN)
    const isTmc12 = tournament.tournament_type === "tmc" && numPairs === 12;
    const isTmc8 = tournament.tournament_type === "tmc" && numPairs === 8;
    const numSeedsToAssign = (isTmc12 || isTmc8) ? numPairs : effectiveNumSeeds;

    // Attribuer les numéros de têtes de série selon le nombre calculé
    for (let i = 0; i < numSeedsToAssign && i < sortedPairs.length; i++) {
      await supabaseAdmin
        .from("tournament_registrations")
        .update({ seed_number: i + 1 })
        .eq("id", sortedPairs[i].id);

      sortedPairs[i].seed_number = i + 1;
    }

    // 7. Vérifier qu'aucun match n'existe déjà (éviter double génération)
    const { data: existingMatches, error: matchesError } = await supabaseAdmin
      .from("tournament_matches")
      .select("id")
      .eq("tournament_id", id)
      .limit(1);

    if (matchesError) {
      logger.error(
        {
          tournamentId: id.substring(0, 8) + "…",
          error: matchesError.message,
        },
        "[generate] Error checking existing matches"
      );
      return NextResponse.json(
        { error: "Erreur lors de la vérification des matchs existants" },
        { status: 500 }
      );
    }

    if (existingMatches && existingMatches.length > 0) {
      return NextResponse.json(
        {
          error:
            "Des matchs existent déjà pour ce tournoi. Le tirage ne peut pas être regénéré.",
        },
        { status: 400 }
      );
    }

    // 8. Générer selon le type de tournoi
    logger.info(
      {
        tournamentId: id.substring(0, 8) + "…",
        type: tournament.tournament_type,
        numPairs,
        numSeeds: effectiveNumSeeds,
        bracketSize,
      },
      "[generate] Starting draw generation"
    );

    if (tournament.tournament_type === "official_knockout") {
      await generateOfficialKnockout(
        supabaseAdmin,
        tournament,
        sortedPairs,
        effectiveNumSeeds,
        bracketSize
      );
    } else if (tournament.tournament_type === "tmc") {
      await generateTmc(supabaseAdmin, tournament, sortedPairs, bracketSize);
    } else if (tournament.tournament_type === "double_elimination") {
      await generateDoubleElimination(
        supabaseAdmin,
        tournament,
        sortedPairs,
        bracketSize
      );
    } else if (tournament.tournament_type === "official_pools") {
      await generateOfficialPoolsAndFinal(
        supabaseAdmin,
        tournament,
        sortedPairs
      );
    } else if (tournament.tournament_type === "pools_triple_draw") {
      await generatePoolsTripleDraw(supabaseAdmin, tournament, sortedPairs);
    } else if (tournament.tournament_type === "round_robin") {
      await generateRoundRobin(supabaseAdmin, tournament, sortedPairs);
    } else if (tournament.tournament_type === "americano") {
      await generateAmericano(supabaseAdmin, tournament, sortedPairs);
    } else if (tournament.tournament_type === "mexicano") {
      await generateMexicano(supabaseAdmin, tournament, sortedPairs);
    } else {
      return NextResponse.json(
        { error: "Type de tournoi non supporté" },
        { status: 400 }
      );
    }

    // 9. Mettre à jour le statut
    await supabaseAdmin
      .from("tournaments")
      .update({ status: "draw_published" })
      .eq("id", id);

    logger.info(
      {
        tournamentId: id.substring(0, 8) + "…",
        numPairs,
        numSeeds: effectiveNumSeeds,
      },
      "[generate] Tournament draw generated successfully"
    );

    return NextResponse.json({
      success: true,
      numPairs: sortedPairs.length,
      numSeeds: effectiveNumSeeds,
    });
  } catch (error: any) {
    logger.error(
      { error: error.message, stack: error.stack },
      "[generate] Error generating tournament bracket"
    );

    // Si l'erreur est une validation fonctionnelle (message explicite),
    // on la renvoie telle quelle au client avec un statut 400.
    if (typeof error?.message === "string" && error.message.startsWith("Erreur")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
