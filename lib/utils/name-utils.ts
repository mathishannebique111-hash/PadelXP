/**
 * Capitalise uniquement les débuts de mots :
 * - Prend en compte les séparateurs usuels des noms/prénoms composés : espace, tiret, apostrophe.
 * - Le reste de chaque segment est mis en minuscules.
 * - Ne capitalise pas "Mc"/"O'" de façon spéciale : on suit strictement le découpage par séparateurs.
 */
export function capitalizeName(name: string): string {
  if (!name || !name.trim()) {
    return name;
  }

  const separators = /([ -'’])/; // espace, tiret, apostrophe droite ou courbe

  // Split en conservant les séparateurs pour les réassembler ensuite
  const parts = name.trim().split(separators);

  const capitalized = parts
    .map((part) => {
      // Ne pas toucher aux séparateurs
      if (part.match(separators)) return part;
      // Segment de mot : première lettre en maj, le reste en minuscules
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join('');

  return capitalized;
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

