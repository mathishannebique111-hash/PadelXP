/**
 * Capitalise la première lettre d'un nom ou prénom
 * Exemples:
 * - "jean" -> "Jean"
 * - "JEAN" -> "Jean"
 * - "jean-pierre" -> "Jean-pierre"
 * - "mcdonald" -> "McDonald" (gère les préfixes)
 */
export function capitalizeName(name: string): string {
  if (!name || !name.trim()) {
    return name;
  }

  const trimmed = name.trim();
  
  // Gérer les préfixes comme "Mc", "O'", "De", etc.
  const prefixes = ['mc', "o'", 'de', 'du', 'da', 'von', 'van', 'le', 'la'];
  const lowerName = trimmed.toLowerCase();
  
  for (const prefix of prefixes) {
    if (lowerName.startsWith(prefix) && trimmed.length > prefix.length) {
      // Capitaliser le préfixe et la lettre suivante
      return prefix.charAt(0).toUpperCase() + prefix.slice(1) + 
             trimmed.charAt(prefix.length).toUpperCase() + 
             trimmed.slice(prefix.length + 1).toLowerCase();
    }
  }
  
  // Cas standard: capitaliser la première lettre, le reste en minuscules
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

/**
 * Capitalise le prénom et le nom de famille
 */
export function capitalizeFullName(firstName: string, lastName: string): {
  firstName: string;
  lastName: string;
} {
  return {
    firstName: capitalizeName(firstName),
    lastName: capitalizeName(lastName),
  };
}

