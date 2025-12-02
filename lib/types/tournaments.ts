/**
 * Types TypeScript pour le système de tournois
 */

export type TournamentType =
  | "official_knockout" // Élimination directe (TDL)
  | "tmc" // Tournoi Multi-Chances
  | "double_elimination"
  | "official_pools" // Poules + tableau final
  | "pools_triple_draw" // Poules + 3 tableaux (principal / intermédiaire / consolation)
  | "round_robin" // Round-robin pur
  | "americano"
  | "mexicano"
  | "custom";

export type MatchFormat = 
  | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'D1' | 'D2' | 'E' | 'F';

export type TournamentStatus = 
  | 'draft' | 'open' | 'registration_closed' | 'draw_published' 
  | 'in_progress' | 'completed' | 'cancelled';

export type RegistrationStatus = 
  | 'pending' | 'confirmed' | 'waiting_list' | 'rejected' | 'withdrawn';

export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

export type ForfaitType = 
  | 'none' | 'excused' | 'not_excused' | 'abandon' | 'no_show';

export type RoundType = 
  | 'pool' | 'qualifications' | 'round_of_64' | 'round_of_32' 
  | 'round_of_16' | 'quarters' | 'semis' | 'final' | 'third_place';

export type MatchStatus = 
  | 'scheduled' | 'ready' | 'in_progress' | 'completed' | 'cancelled' | 'forfeit';

export interface Tournament {
  id: string;
  club_id: string;
  name: string;
  description?: string;
  category: string;
  tournament_type: TournamentType;
  match_format: MatchFormat;
  pool_size?: number;
  pool_format?: string;
  num_pools?: number;
  main_draw_size?: number;
  num_seeds?: number;
  num_wild_cards?: number;
  punto_de_oro: boolean;
  coaching_allowed: boolean;
  registration_open_date: string;
  registration_close_date: string;
  draw_publication_date?: string;
  start_date: string;
  end_date: string;
  available_courts: number[];
  match_duration_minutes: number;
  inscription_fee: number;
  prize_money?: PrizeMoney;
  stripe_product_id?: string;
  status: TournamentStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TournamentRegistration {
  id: string;
  tournament_id: string;
  player1_id: string;
  player2_id: string;
  player1_classification?: string;
  player2_classification?: string;
  pair_weight: number;
  registration_order: number;
  is_seed: boolean;
  seed_number?: number;
  is_wild_card: boolean;
  is_bye: boolean;
  phase: 'waiting_list' | 'qualifications' | 'main_draw' | 'eliminated';
  pool_id?: string;
  status: RegistrationStatus;
  rejection_reason?: string;
  original_player1_id?: string;
  original_player2_id?: string;
  change_reason?: string;
  change_justification_file?: string;
  change_approved: boolean;
  forfait_type: ForfaitType;
  forfait_date?: string;
  medical_certificate_url?: string;
  disciplinary_points: number;
  payment_status: PaymentStatus;
  stripe_payment_intent_id?: string;
  paid_at?: string;
  amount_paid?: number;
  created_at: string;
  updated_at: string;
}

export interface TournamentMatch {
  id: string;
  tournament_id: string;
  pool_id?: string;
  round_type: RoundType;
  round_number?: number;
  match_order?: number;
  team1_registration_id?: string;
  team2_registration_id?: string;
  court_number?: number;
  scheduled_time?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  score?: MatchScore;
  winner_registration_id?: string;
  is_bye: boolean;
  forfait_team_id?: string;
  forfait_type?: ForfaitType;
  status: MatchStatus;
  next_match_id?: string;
  next_match_position?: 'team1' | 'team2';
  created_at: string;
  updated_at: string;
}

export interface MatchScore {
  sets: SetScore[];
  super_tiebreak?: TiebreakScore;
  punto_de_oro_used: boolean;
  final_score: string;
}

export interface SetScore {
  team1: number;
  team2: number;
  tiebreak?: TiebreakScore;
}

export interface TiebreakScore {
  team1: number;
  team2: number;
}

export interface PrizeMoney {
  winners: number;
  finalists: number;
  semis: number;
  quarters?: number;
  eighths?: number;
}

export interface TournamentPool {
  id: string;
  tournament_id: string;
  pool_number: number;
  pool_type: 'qualification' | 'main_draw';
  num_teams: number;
  format: string;
  status: 'pending' | 'in_progress' | 'completed';
  completed_at?: string;
  created_at: string;
}

export interface TournamentParticipant {
  id: string;
  tournament_id: string;
  player_id: string;
  total_points: number;
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  games_won: number;
  games_lost: number;
  current_ranking?: number;
  final_ranking?: number;
  created_at: string;
  updated_at: string;
}

export interface DisciplinaryPoints {
  id: string;
  player_id: string;
  tournament_id?: string;
  points: number;
  reason: string;
  incident_date: string;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
}

export interface PairRanking {
  registration_id: string;
  player1_id: string;
  player2_id: string;
  pair_weight: number;
  ranking_position: number;
  is_seed: boolean;
  seed_number?: number;
}

export interface BracketMatch {
  match_id: string;
  position: number;
  team1?: PairRanking;
  team2?: PairRanking;
  winner?: string;
  next_match_position?: number;
}

// Format descriptions constants
export const MATCH_FORMATS = {
  A1: { description: '3 sets à 6 jeux, tie-break à 6-6, avec avantage', sets: 3, games: 6 },
  A2: { description: '3 sets à 6 jeux, tie-break à 6-6, PUNTO DE ORO', sets: 3, games: 6 },
  B1: { description: '2 sets à 6 jeux + super tie-break 10pts, avec avantage', sets: 2, games: 6 },
  B2: { description: '2 sets à 6 jeux + super tie-break 10pts, PUNTO DE ORO', sets: 2, games: 6 },
  C1: { description: '2 sets à 4 jeux, tie-break à 4-4 + super tie-break 10pts, avec avantage', sets: 2, games: 4 },
  C2: { description: '2 sets à 4 jeux, tie-break à 4-4 + super tie-break 10pts, PUNTO DE ORO', sets: 2, games: 4 },
  D1: { description: '1 set à 9 jeux, tie-break à 8-8, avec avantage', sets: 1, games: 9 },
  D2: { description: '1 set à 9 jeux, tie-break à 8-8, PUNTO DE ORO', sets: 1, games: 9 },
  E: { description: '1 super tie-break à 10 points', sets: 1, games: 0 },
  F: { description: '1 set à 4 jeux, PUNTO DE ORO, tie-break à 3-3', sets: 1, games: 4 },
} as const;

export const TOURNAMENT_CATEGORIES = [
  'MD100', 'MD200', 'MD300', 'MD400', 'MD500', 'MD700', 'MD1000',
  'WD50', 'WD100', 'WD200', 'WD300', 'WD500', 'WD700', 'WD1000',
  'MXOPEN'
] as const;

