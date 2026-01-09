/**
 * Calcul de la compatibilité entre deux joueurs pour le matching de partenaires
 */

interface PlayerProfile {
  id: string;
  hand?: string | null;
  preferred_side?: string | null;
  frequency?: string | null;
  best_shot?: string | null;
  niveau_padel?: number | null;
  niveau_categorie?: string | null;
}

interface CompatibilityResult {
  score: number; // 0-100
  tags: string[];
}

export function calculateCompatibility(
  currentUser: PlayerProfile,
  otherPlayer: PlayerProfile
): CompatibilityResult | null {
  // Si l'un des deux n'a pas de niveau évalué, on ne peut pas calculer la compatibilité
  if (!currentUser.niveau_padel || !otherPlayer.niveau_padel) {
    return null;
  }

  // NOTE: On ne retourne plus null pour les mêmes côtés ici
  // L'exclusion se fait dans l'API route, mais on peut quand même calculer un score

  const tags: string[] = [];
  let score = 0;
  let factors = 0;

  // 1. Compatibilité de niveau (40% du score)
  // Idéal : différence de 0.5 à 1.5 points
  const levelDiff = Math.abs(
    (currentUser.niveau_padel || 0) - (otherPlayer.niveau_padel || 0)
  );

  if (levelDiff <= 0.5) {
    score += 40;
    tags.push("Niveau similaire");
  } else if (levelDiff <= 1.0) {
    score += 35;
    tags.push("Niveau proche");
  } else if (levelDiff <= 1.5) {
    score += 30;
    tags.push("Niveau complémentaire");
  } else if (levelDiff <= 2.0) {
    score += 20;
    tags.push("Niveau différent");
  } else {
    score += 10;
  }
  factors++;

  // 2. Compatibilité main forte (15% du score)
  // Idéal : un droitier + un gaucher
  if (currentUser.hand && otherPlayer.hand) {
    if (currentUser.hand !== otherPlayer.hand) {
      score += 15;
      tags.push("Mains complémentaires");
    } else {
      score += 8;
    }
    factors++;
  }

  // 3. Compatibilité côté préféré (15% du score)
  // Idéal : un gauche + un droite, ou un indifférent
  if (currentUser.preferred_side && otherPlayer.preferred_side) {
    if (
      (currentUser.preferred_side === "left" &&
        otherPlayer.preferred_side === "right") ||
      (currentUser.preferred_side === "right" &&
        otherPlayer.preferred_side === "left")
    ) {
      score += 15;
      tags.push("Côtés complémentaires");
    } else if (
      currentUser.preferred_side === "indifferent" ||
      otherPlayer.preferred_side === "indifferent"
    ) {
      score += 12;
      tags.push("Côté flexible");
    } else {
      score += 5;
    }
    factors++;
  }

  // 4. Compatibilité fréquence (20% du score)
  // Idéal : même fréquence ou proche
  if (currentUser.frequency && otherPlayer.frequency) {
    const frequencyOrder = ["monthly", "weekly", "2-3weekly", "3+weekly"];
    const currentIndex = frequencyOrder.indexOf(currentUser.frequency);
    const otherIndex = frequencyOrder.indexOf(otherPlayer.frequency);

    if (currentIndex === otherIndex) {
      score += 20;
      tags.push("Même rythme");
    } else if (Math.abs(currentIndex - otherIndex) === 1) {
      score += 15;
      tags.push("Rythme proche");
    } else {
      score += 8;
    }
    factors++;
  }

  // 5. Compatibilité coups signature (10% du score)
  // Bonus si les coups sont complémentaires
  if (currentUser.best_shot && otherPlayer.best_shot) {
    const complementaryPairs = [
      ["smash", "defense"],
      ["vibora", "lob"],
      ["lob", "smash"],
    ];

    const isComplementary = complementaryPairs.some(
      ([shot1, shot2]) =>
        (currentUser.best_shot === shot1 &&
          otherPlayer.best_shot === shot2) ||
        (currentUser.best_shot === shot2 && otherPlayer.best_shot === shot1)
    );

    if (isComplementary) {
      score += 10;
      tags.push("Coups complémentaires");
    } else if (currentUser.best_shot === otherPlayer.best_shot) {
      score += 5;
      tags.push("Même spécialité");
    } else {
      score += 3;
    }
    factors++;
  }

  // Normaliser le score sur 100
  // Le score brut est déjà entre 0 et 100 (max: 40+15+15+20+10 = 100)
  // Donc on n'a pas besoin de diviser par factors, juste s'assurer qu'il est entre 0 et 100
  score = Math.round(score);
  score = Math.min(100, Math.max(0, score));
  
  // Boost si les joueurs ont le même niveau (compatibilité très forte même sans complémentarité parfaite)
  // Par exemple, deux joueurs de même niveau mais même main/côté sont quand même très compatibles
  if (Math.abs((currentUser.niveau_padel || 0) - (otherPlayer.niveau_padel || 0)) <= 0.5) {
    // Ajouter un bonus de 15-20 points pour les joueurs de même niveau
    // Cela garantit qu'ils auront au moins 60% de compatibilité
    score = Math.min(100, score + 18);
  }

  return {
    score,
    tags: tags.slice(0, 3), // Limiter à 3 tags max
  };
}
