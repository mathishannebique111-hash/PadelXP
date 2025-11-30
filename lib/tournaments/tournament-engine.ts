/**
 * Moteur de gestion de tournois - Logique core
 */

import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import type { 
  Tournament, 
  TournamentRegistration, 
  PairRanking,
  MatchFormat 
} from "@/lib/types/tournaments";

// Calculer les points d'un joueur à partir de ses matchs
async function calculatePlayerPoints(playerId: string, clubId?: string): Promise<number> {
  const supabase = createServiceClient();
  // Récupérer les matchs du joueur
  let participantsQuery = supabase
    .from('match_participants')
    .select('match_id, team, matches!inner(winner_team_id, team1_id, team2_id)')
    .eq('user_id', playerId)
    .eq('player_type', 'user');
  
  const { data: participants, error } = await participantsQuery;
  
  if (error || !participants) {
    logger.warn({ 
      playerId: playerId.substring(0, 8) + "…",
      error 
    }, 'Cannot fetch player matches for points calculation');
    return 0;
  }
  
  // Calculer wins et losses
  let wins = 0;
  let losses = 0;
  
  for (const p of participants) {
    const match = p.matches as any;
    if (!match || !match.winner_team_id) continue;
    
    const winnerTeam = match.winner_team_id === match.team1_id ? 1 : 2;
    if (p.team === winnerTeam) {
      wins++;
    } else {
      losses++;
    }
  }
  
  // Formule : (wins * 10) + (losses * 3)
  const points = (wins * 10) + (losses * 3);
  
  // Vérifier si le joueur a un avis (bonus +10)
  const { data: review } = await supabase
    .from('reviews')
    .select('id')
    .eq('user_id', playerId)
    .limit(1)
    .maybeSingle();
  
  const bonusPoints = review ? 10 : 0;
  
  return points + bonusPoints;
}

// Calcul du poids de paire
export async function calculatePairWeight(
  player1Id: string, 
  player2Id: string
): Promise<number> {
  const [points1, points2] = await Promise.all([
    calculatePlayerPoints(player1Id),
    calculatePlayerPoints(player2Id)
  ]);
  
  const weight = points1 + points2;
  
  logger.info({ 
    player1Id: player1Id.substring(0, 8) + "…", 
    player2Id: player2Id.substring(0, 8) + "…", 
    points1,
    points2,
    weight 
  }, 'Pair weight calculated');
  
  return weight;
}

// Classer toutes les paires
export async function rankRegisteredPairs(
  tournamentId: string
): Promise<PairRanking[]> {
  const supabase = createServiceClient();
  const { data: registrations, error } = await supabase
    .from('tournament_registrations')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('status', 'confirmed')
    .order('pair_weight', { ascending: false });
  
  if (error || !registrations) {
    logger.error({ 
      tournamentId: tournamentId.substring(0, 8) + "…", 
      error 
    }, 'Error ranking pairs');
    return [];
  }
  
  const rankedPairs: PairRanking[] = registrations.map((reg, index) => ({
    registration_id: reg.id,
    player1_id: reg.player1_id,
    player2_id: reg.player2_id,
    pair_weight: reg.pair_weight,
    ranking_position: index + 1,
    is_seed: false,
    seed_number: undefined
  }));
  
  logger.info({ 
    tournamentId: tournamentId.substring(0, 8) + "…", 
    totalPairs: rankedPairs.length 
  }, 'Pairs ranked by weight');
  
  return rankedPairs;
}

// Calculer nombre de têtes de série
export function calculateNumSeeds(totalPairs: number): number {
  const minSeeds = Math.max(1, Math.floor(totalPairs / 8));
  const maxSeeds = Math.floor(totalPairs / 2);
  const defaultSeeds = Math.floor(totalPairs / 4);
  
  return Math.max(minSeeds, Math.min(defaultSeeds, maxSeeds));
}

// Assigner les têtes de série
export async function assignSeeds(
  tournamentId: string,
  rankedPairs: PairRanking[]
): Promise<void> {
  const supabase = createServiceClient();
  const numSeeds = calculateNumSeeds(rankedPairs.length);
  
  for (let i = 0; i < Math.min(numSeeds, rankedPairs.length); i++) {
    const pair = rankedPairs[i];
    
    const { error } = await supabase
      .from('tournament_registrations')
      .update({
        is_seed: true,
        seed_number: i + 1
      })
      .eq('id', pair.registration_id);
    
    if (error) {
      logger.error({ 
        tournamentId: tournamentId.substring(0, 8) + "…",
        registrationId: pair.registration_id.substring(0, 8) + "…",
        error 
      }, 'Error assigning seed');
    } else {
      logger.info({ 
        tournamentId: tournamentId.substring(0, 8) + "…", 
        registrationId: pair.registration_id.substring(0, 8) + "…", 
        seedNumber: i + 1 
      }, 'Seed assigned');
    }
  }
  
  logger.info({ 
    tournamentId: tournamentId.substring(0, 8) + "…", 
    numSeeds 
  }, 'All seeds assigned');
}

// Calculer exemptions (byes)
export function calculateByes(totalPairs: number): number[] {
  const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(totalPairs)));
  const numByes = nextPowerOf2 - totalPairs;
  
  if (numByes > 0) {
    return Array.from({ length: numByes }, (_, i) => i + 1);
  }
  
  return [];
}

// Générer tableau élimination directe
export async function generateKnockoutBracket(
  tournament: Tournament,
  rankedPairs: PairRanking[]
): Promise<void> {
  const supabase = createServiceClient();
  logger.info({ 
    tournamentId: tournament.id.substring(0, 8) + "…", 
    numPairs: rankedPairs.length 
  }, 'Generating knockout bracket');
  
  const numRounds = Math.ceil(Math.log2(rankedPairs.length));
  const exemptSeeds = calculateByes(rankedPairs.length);
  
  const firstRoundMatches: Array<{team1?: PairRanking, team2?: PairRanking}> = [];
  
  for (let i = 0; i < rankedPairs.length; i += 2) {
    firstRoundMatches.push({
      team1: rankedPairs[i],
      team2: rankedPairs[i + 1] || undefined
    });
  }
  
  for (let i = 0; i < firstRoundMatches.length; i++) {
    const match = firstRoundMatches[i];
    
    const { error } = await supabase.from('tournament_matches').insert({
      tournament_id: tournament.id,
      round_type: getRoundType(numRounds, 1),
      round_number: 1,
      match_order: i + 1,
      team1_registration_id: match.team1?.registration_id,
      team2_registration_id: match.team2?.registration_id,
      is_bye: !match.team2,
      status: match.team2 ? 'scheduled' : 'completed',
      winner_registration_id: !match.team2 ? match.team1?.registration_id : undefined
    });
    
    if (error) {
      logger.error({ 
        tournamentId: tournament.id.substring(0, 8) + "…",
        matchOrder: i + 1,
        error 
      }, 'Error creating match');
    }
  }
  
  logger.info({ 
    tournamentId: tournament.id.substring(0, 8) + "…", 
    matchesCreated: firstRoundMatches.length 
  }, 'Knockout bracket generated');
}

function getRoundType(totalRounds: number, currentRound: number): string {
  const roundsFromEnd = totalRounds - currentRound;
  
  switch(roundsFromEnd) {
    case 0: return 'final';
    case 1: return 'semis';
    case 2: return 'quarters';
    case 3: return 'round_of_16';
    case 4: return 'round_of_32';
    case 5: return 'round_of_64';
    default: return 'qualifications';
  }
}

// Générer poules
export async function generatePools(
  tournament: Tournament,
  rankedPairs: PairRanking[]
): Promise<void> {
  const supabase = createServiceClient();
  logger.info({ 
    tournamentId: tournament.id.substring(0, 8) + "…", 
    numPairs: rankedPairs.length, 
    poolSize: tournament.pool_size 
  }, 'Generating pools');
  
  const poolSize = tournament.pool_size || 4;
  const numPools = Math.ceil(rankedPairs.length / poolSize);
  
  const pools: PairRanking[][] = Array.from({ length: numPools }, () => []);
  
  for (let i = 0; i < rankedPairs.length; i++) {
    const poolIndex = i % numPools;
    pools[poolIndex].push(rankedPairs[i]);
  }
  
  for (let i = 0; i < pools.length; i++) {
    const { data: pool, error } = await supabase
      .from('tournament_pools')
      .insert({
        tournament_id: tournament.id,
        pool_number: i + 1,
        pool_type: 'main_draw',
        num_teams: pools[i].length,
        format: tournament.pool_format || 'D1',
        status: 'pending'
      })
      .select()
      .single();
    
    if (error || !pool) {
      logger.error({ 
        tournamentId: tournament.id.substring(0, 8) + "…",
        poolNumber: i + 1,
        error 
      }, 'Error creating pool');
      continue;
    }
    
    for (const pair of pools[i]) {
      await supabase
        .from('tournament_registrations')
        .update({ pool_id: pool.id, phase: 'main_draw' })
        .eq('id', pair.registration_id);
    }
    
    await generatePoolMatches(tournament.id, pool.id, pools[i]);
  }
  
  logger.info({ 
    tournamentId: tournament.id.substring(0, 8) + "…", 
    numPools 
  }, 'Pools generated');
}

async function generatePoolMatches(
  tournamentId: string,
  poolId: string,
  pairs: PairRanking[]
): Promise<void> {
  const supabase = createServiceClient();
  const matches: Array<{team1: PairRanking, team2: PairRanking}> = [];
  
  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) {
      matches.push({ team1: pairs[i], team2: pairs[j] });
    }
  }
  
  for (let i = 0; i < matches.length; i++) {
    const { error } = await supabase.from('tournament_matches').insert({
      tournament_id: tournamentId,
      pool_id: poolId,
      round_type: 'pool',
      match_order: i + 1,
      team1_registration_id: matches[i].team1.registration_id,
      team2_registration_id: matches[i].team2.registration_id,
      status: 'scheduled'
    });
    
    if (error) {
      logger.error({ 
        poolId: poolId.substring(0, 8) + "…",
        matchOrder: i + 1,
        error 
      }, 'Error creating pool match');
    }
  }
  
  logger.info({ 
    poolId: poolId.substring(0, 8) + "…", 
    matchesCreated: matches.length 
  }, 'Pool matches generated');
}

// Planifier matchs automatiquement
export async function scheduleMatches(
  tournament: Tournament
): Promise<void> {
  const supabase = createServiceClient();
  logger.info({ 
    tournamentId: tournament.id.substring(0, 8) + "…" 
  }, 'Auto-scheduling matches');
  
  const { data: matches, error } = await supabase
    .from('tournament_matches')
    .select('*')
    .eq('tournament_id', tournament.id)
    .is('scheduled_time', null)
    .order('round_number', { ascending: true })
    .order('match_order', { ascending: true });
  
  if (error || !matches) {
    logger.error({ 
      tournamentId: tournament.id.substring(0, 8) + "…",
      error 
    }, 'Error fetching matches for scheduling');
    return;
  }
  
  const courts = tournament.available_courts;
  const matchDuration = tournament.match_duration_minutes;
  
  let currentTime = new Date(tournament.start_date);
  let courtIndex = 0;
  
  for (const match of matches) {
    await supabase
      .from('tournament_matches')
      .update({
        court_number: courts[courtIndex],
        scheduled_time: currentTime.toISOString()
      })
      .eq('id', match.id);
    
    courtIndex++;
    if (courtIndex >= courts.length) {
      courtIndex = 0;
      currentTime = new Date(currentTime.getTime() + matchDuration * 60000);
    }
  }
  
  logger.info({ 
    tournamentId: tournament.id.substring(0, 8) + "…", 
    matchesScheduled: matches.length 
  }, 'Matches scheduled');
}

// Valider score
export function validateScore(
  score: any,
  format: MatchFormat
): { valid: boolean; error?: string } {
  // TODO: Implémenter validation complète
  return { valid: true };
}

