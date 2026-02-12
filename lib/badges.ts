// Fonction centralisée pour calculer tous les badges d'un joueur
export type Badge = {
  icon: string;
  title: string;
  description: string;
  isPremium?: boolean;
};

export type PlayerStats = {
  wins: number;
  losses: number;
  matches: number;
  points: number;
  streak: number;
  referralCount?: number;
};

// Tous les badges disponibles
export const ALL_BADGES: Badge[] = [
  { icon: "Trophy", title: "Première victoire", description: "Obtenez votre première victoire" },
  { icon: "Flame", title: "Série de 3", description: "Gagnez 3 matchs consécutifs" },
  { icon: "Flame", title: "Série de 5", description: "Gagnez 5 matchs consécutifs" },
  { icon: "Timer", title: "Marathonien", description: "Jouez 50 matchs" },
  { icon: "Star", title: "Meilleur scoreur", description: "Obtenez 100+ points" },
  { icon: "Flame", title: "Série de 7", description: "Gagnez 7 matchs consécutifs" },
  { icon: "Flame", title: "Série de 10", description: "Gagnez 10 matchs consécutifs" },
  { icon: "Target", title: "Précision", description: "Remportez 5 matchs sans en perdre aucun" },
  { icon: "TrendingUp", title: "En progression", description: "Ayez 5 victoires de plus que de défaites" },
  { icon: "Flame", title: "Série de 15", description: "Gagnez 15 matchs consécutifs" },
  { icon: "Flame", title: "Série de 20", description: "Gagnez 20 matchs consécutifs" },
  { icon: "Milestone", title: "Centurion", description: "Jouez 100 matchs" },
  { icon: "Gem", title: "Diamant", description: "Atteignez 500 points", isPremium: true },
  { icon: "Crown", title: "Légende", description: "Gagnez 200 matchs au total", isPremium: true },
  { icon: "Heart", title: "Amour du padel", description: "Jouez 200 matchs au total" },
  // Badges liés aux avis
  { icon: "MessageSquare", title: "Contributeur", description: "Laissez votre premier avis" },
  // Badge parrainage
  { icon: "Users", title: "Ambassadeur", description: "Parrainez 2 joueurs", isPremium: true },
  // Badge Premium
  { icon: "Crown", title: "Premium", description: "Membre Premium PadelXP", isPremium: true },
];

export function getBadges(stats: PlayerStats): Badge[] {
  const { wins, losses, matches, points, streak, referralCount } = stats;
  const result: Badge[] = [];

  // Première victoire
  if (wins >= 1) result.push(ALL_BADGES[0]);

  // Séries de victoires
  if (streak >= 3) result.push(ALL_BADGES[1]);
  if (streak >= 5) result.push(ALL_BADGES[2]);

  // Marathonien (entre Série de 5 et Série de 7)
  if (matches >= 50 && matches < 100) result.push(ALL_BADGES[3]);

  // Meilleur scoreur (entre Série de 5 et Série de 7)
  if (points >= 100) result.push(ALL_BADGES[4]);

  // Série de 7
  if (streak >= 7) result.push(ALL_BADGES[5]);

  // Série de 10
  if (streak >= 10) result.push(ALL_BADGES[6]);

  // Précision (entre Série de 10 et série de 15)
  if (wins >= 5 && losses === 0) result.push(ALL_BADGES[7]);

  // En progression (entre Série de 10 et série de 15)
  if (wins - losses >= 5) result.push(ALL_BADGES[8]);

  // série de 15
  if (streak >= 15) result.push(ALL_BADGES[9]);

  // série de 20
  if (streak >= 20) result.push(ALL_BADGES[10]);

  // Centurion
  if (matches >= 100) result.push(ALL_BADGES[11]);

  // Diamant
  if (points >= 500) result.push(ALL_BADGES[12]);

  // Légende / Amour du padel
  if (wins >= 200) result.push(ALL_BADGES[13]);
  if (matches >= 200) result.push(ALL_BADGES[14]);

  // Ambassadeur (2+ parrainages effectués)
  if ((referralCount || 0) >= 2) result.push(ALL_BADGES[16]);

  return result;
}

