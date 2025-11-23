/**
 * Utilitaires pour la gestion des avis utilisateurs
 */

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at?: string;
  user_id: string;
  profiles: {
    display_name: string;
  } | null;
}

export interface ReviewStats {
  totalReviews: number;
  positiveReviews: number;
  averageRating: number;
  satisfactionRate: number; // Pourcentage d'avis >= 4 étoiles
}

/**
 * Filtre les avis positifs (4 étoiles ou plus)
 */
export function getPositiveReviews(reviews: Review[]): Review[] {
  return reviews.filter(review => review.rating >= 4);
}

/**
 * Filtre les avis négatifs ou neutres (3 étoiles ou moins)
 */
export function getOtherReviews(reviews: Review[]): Review[] {
  return reviews.filter(review => review.rating <= 3);
}

/**
 * Calcule les statistiques des avis
 */
export function calculateReviewStats(reviews: Review[]): ReviewStats {
  const totalReviews = reviews.length;
  
  if (totalReviews === 0) {
    return {
      totalReviews: 0,
      positiveReviews: 0,
      averageRating: 0,
      satisfactionRate: 0,
    };
  }

  const positiveReviews = reviews.filter(r => r.rating >= 4).length;
  const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
  const averageRating = Math.round((totalRating / totalReviews) * 10) / 10;
  const satisfactionRate = Math.round((positiveReviews / totalReviews) * 100);

  return {
    totalReviews,
    positiveReviews,
    averageRating,
    satisfactionRate,
  };
}

/**
 * Trie les avis par date décroissante (plus récents en premier)
 */
export function sortReviewsByDate(reviews: Review[], ascending: boolean = false): Review[] {
  return [...reviews].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return ascending ? dateA - dateB : dateB - dateA;
  });
}

/**
 * Limite le nombre d'avis retournés
 */
export function limitReviews(reviews: Review[], limit: number): Review[] {
  return reviews.slice(0, limit);
}

/**
 * Compte le nombre de mots dans un texte
 */
export function countWords(text: string | null | undefined): number {
  if (!text || typeof text !== 'string') {
    return 0;
  }
  
  // Nettoyer le texte et compter les mots
  const cleaned = text.trim();
  if (cleaned.length === 0) {
    return 0;
  }
  
  // Diviser par les espaces et filtrer les chaînes vides
  const words = cleaned.split(/\s+/).filter(word => word.length > 0);
  return words.length;
}

/**
 * Vérifie si un avis est valide pour l'attribution des points/badge
 * Un avis est valide si :
 * - rating > 3 (4 ou 5 étoiles) : toujours valide
 * - rating <= 3 ET words > 6 : valide
 * Sinon : invalide (rating <= 3 ET words <= 6)
 */
export function isReviewValidForBonus(rating: number, comment: string | null | undefined): boolean {
  // Si rating > 3, toujours valide
  if (rating > 3) {
    return true;
  }
  
  // Si rating <= 3, vérifier le nombre de mots
  const wordCount = countWords(comment);
  return wordCount > 6;
}

/**
 * Prépare les avis pour l'affichage : filtre, trie et limite
 */
export function prepareReviewsForDisplay(
  reviews: Review[],
  options: {
    minRating?: number;
    sortByDate?: boolean;
    ascending?: boolean;
    limit?: number;
  } = {}
): Review[] {
  let filteredReviews = reviews;

  // Filtrer par note minimale si spécifié
  if (options.minRating !== undefined) {
    filteredReviews = filteredReviews.filter(r => r.rating >= options.minRating!);
  }

  // Trier par date si demandé
  if (options.sortByDate !== false) {
    filteredReviews = sortReviewsByDate(filteredReviews, options.ascending || false);
  }

  // Limiter le nombre si spécifié
  if (options.limit !== undefined) {
    filteredReviews = limitReviews(filteredReviews, options.limit);
  }

  return filteredReviews;
}

