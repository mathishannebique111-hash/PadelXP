// Fonction centralisée pour calculer tous les badges d'un joueur
export type Badge = {
  icon: string;
  title: string;
  description: string;
};

export type PlayerStats = {
  wins: number;
  losses: number;
  matches: number;
  points: number;
  streak: number;
};

// Tous les badges disponibles
export const ALL_BADGES: Badge[] = [
  { icon: "🏆", title: "Première victoire", description: "Obtenez votre première victoire" },
  { icon: "🔥", title: "Série de 3", description: "Gagnez 3 matchs consécutifs" },
  { icon: "🔥🔥", title: "Série de 5", description: "Gagnez 5 matchs consécutifs" },
  { icon: "🔥🔥🔥", title: "Série de 7", description: "Gagnez 7 matchs consécutifs" },
  { icon: "⚡⚡⚡", title: "Série de 10", description: "Gagnez 10 matchs consécutifs" },
  { icon: "🌪️", title: "Tornade", description: "Gagnez 15 matchs consécutifs" },
  { icon: "👑", title: "Invincible", description: "Gagnez 20 matchs consécutifs" },
  { icon: "🎖️", title: "Marathonien", description: "Jouez 50 matchs" },
  { icon: "🏅", title: "Centurion", description: "Jouez 100 matchs" },
  { icon: "💯", title: "Top Scorer", description: "Obtenez 100+ points" },
  { icon: "💎", title: "Diamant", description: "Atteignez 500 points" },
  { icon: "📈", title: "En progression", description: "Ayez 5 victoires de plus que de défaites" },
  { icon: "🎯", title: "Précision", description: "Remportez 5 matchs sans en perdre aucun" },
  { icon: "🏆🏆🏆", title: "Légende", description: "Gagnez 200 matchs au total" },
  { icon: "🎾", title: "Amour du padel", description: "Jouez 200 matchs au total" },
  // Badges liés aux avis
  { icon: "🛡️", title: "Pionier", description: "Premier avis publié sur PadelLeague" },
  { icon: "💬", title: "Contributeur", description: "Laissez votre premier avis" },
];

export function getBadges(stats: PlayerStats): Badge[] {
  const { wins, losses, matches, points, streak } = stats;
  const result: Badge[] = [];

  // Première victoire
  if (wins >= 1) result.push(ALL_BADGES[0]);

  // Séries de victoires
  if (streak >= 3) result.push(ALL_BADGES[1]);
  if (streak >= 5) result.push(ALL_BADGES[2]);
  if (streak >= 7) result.push(ALL_BADGES[3]);
  if (streak >= 10) result.push(ALL_BADGES[4]);
  if (streak >= 15) result.push(ALL_BADGES[5]);

  // Invincible
  if (streak >= 20) result.push(ALL_BADGES[6]);

  // Marathonien / Centurion
  if (matches >= 50 && matches < 100) result.push(ALL_BADGES[7]);
  if (matches >= 100) result.push(ALL_BADGES[8]);

  // Points
  if (points >= 100) result.push(ALL_BADGES[9]);
  if (points >= 500) result.push(ALL_BADGES[10]);

  // En progression
  if (wins - losses >= 5) result.push(ALL_BADGES[11]);

  // Précision (5 matchs sans défaite)
  if (wins >= 5 && losses === 0) result.push(ALL_BADGES[12]);

  // Légende / Amour du padel
  if (wins >= 200) result.push(ALL_BADGES[13]);
  if (matches >= 200) result.push(ALL_BADGES[14]);

  return result;
}

