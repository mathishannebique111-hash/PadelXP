/**
 * Utilitaires pour la gestion des joueurs (users et guests)
 */

/**
 * Normalise un nom pour la comparaison (supprime accents, espaces multiples, etc.)
 */
export function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Détermine le nom d'affichage d'un joueur selon la règle :
 * - Si prénom unique dans la ligue : "Prénom"
 * - Si prénom en doublon : "Prénom Nom"
 */
export function getPlayerDisplayName(
  player: { first_name: string; last_name: string },
  allPlayers: Array<{ first_name: string; last_name?: string }>
): string {
  const normalizedFirstName = normalizeName(player.first_name);

  const sameFirstNameCount = allPlayers.filter((p) =>
    normalizeName(p.first_name) === normalizedFirstName
  ).length;

  if (sameFirstNameCount > 1) {
    return `${player.first_name} ${player.last_name || ''}`.trim();
  }

  return player.first_name;
}

/**
 * Type pour un joueur (user ou guest)
 */
export type PlayerType = 'user' | 'guest';

export interface PlayerSearchResult {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string | null;
  type: PlayerType;
  display_name: string;
  club_name?: string | null;
  is_external?: boolean;
  email?: string | null;
}
