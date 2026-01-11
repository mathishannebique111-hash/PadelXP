/**
 * Fonction utilitaire pour calculer la catégorie depuis le niveau padel
 */
export function getCategorieFromLevel(niveau: number | null | undefined): string | null {
  if (niveau === null || niveau === undefined) {
    return null;
  }

  const levelInt = Math.floor(niveau);
  
  const categories: Record<number, string> = {
    1: "Débutant - Découverte",
    2: "Débutant - Perfectionnement",
    3: "Intermédiaire - Élémentaire",
    4: "Intermédiaire - Structuré",
    5: "Confirmé",
    6: "Avancé",
    7: "Expert Régional",
    8: "Expert National",
    9: "Pré-Professionnel",
    10: "Professionnel",
  };

  return categories[levelInt] ?? null;
}
