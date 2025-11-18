/**
 * Configuration centralisée des Price IDs Stripe pour les boosts de points
 * 
 * Les variables d'environnement doivent être définies dans .env.local :
 * - NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_1 : Price ID pour 1 boost
 * - NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_5 : Price ID pour 5 boosts (pack)
 * - NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_10 : Price ID pour 10 boosts (pack)
 * 
 * Note: Utilisation de getters pour forcer l'évaluation au runtime plutôt qu'au chargement du module
 */

export const BOOST_PRICE_IDS = {
  get x1(): string {
    // Forcer l'accès au runtime
    return (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_1) ||
           (typeof process !== 'undefined' && process.env?.STRIPE_PRICE_PLAYER_BOOST) ||
           '';
  },
  get x5(): string {
    return (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_5) || '';
  },
  get x10(): string {
    return (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_10) || '';
  },
};

/**
 * Vérifie que tous les Price IDs sont configurés
 */
export function validateBoostPriceIds(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!BOOST_PRICE_IDS.x1) {
    missing.push('NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_1 ou STRIPE_PRICE_PLAYER_BOOST');
  }
  if (!BOOST_PRICE_IDS.x5) {
    missing.push('NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_5');
  }
  if (!BOOST_PRICE_IDS.x10) {
    missing.push('NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_10');
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

