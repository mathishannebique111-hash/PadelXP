export type LeaderboardEntry = {
  rank: number;
  user_id: string;
  player_name: string;
  points: number;
  wins: number;
  losses: number;
  matches: number;
  badges: string[];
  isGuest?: boolean;
};

export type UserProfile = {
  id: string;
  display_name: string;
  phone?: string;
  avatar_url?: string;
  stats?: {
    points: number;
    wins: number;
    losses: number;
    matches: number;
  };
  badges?: Badge[];
};

export type Badge = {
  code: string;
  name: string;
  description?: string;
  icon?: string;
};
