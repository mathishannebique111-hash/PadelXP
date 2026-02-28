/**
 * Calcule la probabilité de victoire d'un joueur contre un niveau adverse moyen.
 * Formule Logistique adaptée pour l'échelle PadelXP (0-10).
 * 
 * @param playerLevel Le niveau actuel du joueur (0-10)
 * @param opponentAvgLevel Le niveau moyen de l'équipe adverse (0-10)
 * @returns La probabilité de victoire entre 0 et 1
 */
export function calculateWinProbability(playerLevel: number, opponentAvgLevel: number): number {
    return 1 / (1 + Math.pow(10, (opponentAvgLevel - playerLevel) / 2));
}

/**
 * Détermine le facteur K (vélocité de progression) selon le nombre de matchs joués.
 * 
 * @param matchesPlayed Nombre de matchs déjà confirmés par le joueur
 * @returns Le facteur K (0.50, 0.25 ou 0.15)
 */
export function getKFactor(matchesPlayed: number): number {
    if (matchesPlayed < 10) return 0.50; // Calibration intensive
    if (matchesPlayed < 20) return 0.25; // Transition
    return 0.15; // Rythme de croisière
}

/**
 * Calcule la variation de niveau (Delta) pour un joueur après un match.
 * 
 * @param playerLevel Niveau actuel du joueur
 * @param opponentAvgLevel Niveau moyen de l'équipe adverse
 * @param matchesPlayed Nombre de matchs joués (pour le facteur K)
 * @param isWin Si le joueur a gagné ou perdu
 * @returns La variation de niveau (positive ou négative)
 */
export function calculateLevelDelta(
    playerLevel: number,
    opponentAvgLevel: number,
    matchesPlayed: number,
    isWin: boolean
): number {
    const winProb = calculateWinProbability(playerLevel, opponentAvgLevel);
    const kFactor = getKFactor(matchesPlayed);
    const actualScore = isWin ? 1.0 : 0.0;

    return kFactor * (actualScore - winProb);
}

/**
 * Simule le nouveau niveau d'un joueur, avec les bornes de sécurité [0, 10].
 */
export function simulateNewLevel(currentLevel: number, delta: number): number {
    const newLevel = currentLevel + delta;
    return Math.max(0, Math.min(10, newLevel));
}
