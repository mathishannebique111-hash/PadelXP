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

/**
 * Valide si un joueur existe avec ce nom exact (prénom + nom)
 * Retourne le joueur s'il existe, ou une erreur sinon
 */
export async function validateExactPlayer(fullName: string): Promise<{ valid: boolean; player?: PlayerSearchResult; error?: string }> {
  if (!fullName || !fullName.trim()) {
    return { valid: false, error: "Nom du joueur requis" };
  }

  try {
    const response = await fetch(`/api/player/search?query=${encodeURIComponent(fullName)}&exact=true`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return { valid: false, error: "Erreur lors de la recherche du joueur" };
    }

    const data = await response.json();
    if (data.players && data.players.length > 0) {
      // Filtrer pour trouver une correspondance exacte (insensible à la casse/accents)
      const normalize = (str: string) => str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const normalizedQuery = normalize(fullName);

      const exactMatch = data.players.find((p: PlayerSearchResult) => {
        const full = normalize(`${p.first_name} ${p.last_name}`);
        return full === normalizedQuery;
      });

      if (exactMatch) {
        return { valid: true, player: exactMatch };
      }
    }

    return { valid: false, error: "Aucun joueur trouvé avec ce nom exact" };
  } catch (error) {
    console.error("Error validating player:", error);
    return { valid: false, error: "Erreur technique lors de la validation" };
  }
}
