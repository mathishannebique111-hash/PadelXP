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
 * Prix affichés des boosts (en euros)
 * Peuvent être définis dans .env.local :
 * - NEXT_PUBLIC_BOOST_PRICE_1 : Prix pour 1 boost
 * - NEXT_PUBLIC_BOOST_PRICE_5 : Prix pour 5 boosts
 * - NEXT_PUBLIC_BOOST_PRICE_10 : Prix pour 10 boosts
 */
export const BOOST_PRICES = {
  get x1(): number {
    try {
      const price = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BOOST_PRICE_1;
      if (price) {
        const parsed = parseFloat(price);
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
        console.warn('[BOOST_PRICES] Invalid NEXT_PUBLIC_BOOST_PRICE_1 value:', price);
      }
      return 0.79;
    } catch (error) {
      console.error('[BOOST_PRICES] Error parsing x1 price:', error);
      return 0.79;
    }
  },
  get x5(): number {
    try {
      const price = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BOOST_PRICE_5;
      if (price) {
        const parsed = parseFloat(price);
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
        console.warn('[BOOST_PRICES] Invalid NEXT_PUBLIC_BOOST_PRICE_5 value:', price);
      }
      return 3.95;
    } catch (error) {
      console.error('[BOOST_PRICES] Error parsing x5 price:', error);
      return 3.95;
    }
  },
  get x10(): number {
    try {
      const price = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BOOST_PRICE_10;
      if (price) {
        const parsed = parseFloat(price);
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
        console.warn('[BOOST_PRICES] Invalid NEXT_PUBLIC_BOOST_PRICE_10 value:', price);
      }
      return 7.10;
    } catch (error) {
      console.error('[BOOST_PRICES] Error parsing x10 price:', error);
      return 7.10;
    }
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

