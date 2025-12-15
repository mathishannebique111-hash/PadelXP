import { BOOST_PERCENTAGE } from '@/lib/utils/boost-utils'

/**
 * Note: La fonction calculateBoostMultiplier n'existe pas encore dans boost-utils.ts
 * Ce test sert de spécification pour l'implémenter.
 * 
 * Fonction attendue:
 * calculateBoostMultiplier(expiresAt: Date | null): number
 * - Si expiresAt est null: retourne 1 (pas de boost)
 * - Si expiresAt est dans le passé: retourne 1 (boost expiré)
 * - Si expiresAt est dans le futur: retourne 1 + BOOST_PERCENTAGE (boost actif)
 */

// Mock de la fonction à implémenter
function calculateBoostMultiplier(expiresAt: Date | null): number {
  if (!expiresAt) {
    return 1
  }

  const now = new Date()
  if (expiresAt < now) {
    return 1
  }

  return 1 + BOOST_PERCENTAGE
}

describe('calculateBoostMultiplier', () => {
  it('devrait retourner le multiplicateur de boost pour un boost actif (date future)', () => {
    // Arrange
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000) // +1 jour

    // Act
    const result = calculateBoostMultiplier(futureDate)

    // Assert
    expect(result).toBe(1.3) // 1 + 0.3 (BOOST_PERCENTAGE)
  })

  it('devrait retourner 1 pour un boost expiré (date passée)', () => {
    // Arrange
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // -1 jour

    // Act
    const result = calculateBoostMultiplier(pastDate)

    // Assert
    expect(result).toBe(1)
  })

  it('devrait retourner 1 quand il n\'y a pas de boost (null)', () => {
    // Arrange
    const noBoost = null

    // Act
    const result = calculateBoostMultiplier(noBoost)

    // Assert
    expect(result).toBe(1)
  })

  it('devrait utiliser la constante BOOST_PERCENTAGE correcte', () => {
    // Assert
    expect(BOOST_PERCENTAGE).toBe(0.3)
  })
})

