/**
 * Calcule la distance de Levenshtein entre deux chaînes de caractères.
 * Cette distance mesure le nombre minimum d'opérations (insertions, suppressions, substitutions)
 * nécessaires pour transformer une chaîne en une autre.
 * Utile pour la recherche floue et la détection de doublons.
 */
export function levenshteinDistance(s1: string, s2: string): number {
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1, // suppression
                matrix[i][j - 1] + 1, // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }

    return matrix[len1][len2];
}

/**
 * Normalise une chaîne de caractères pour la comparaison :
 * - Minuscules
 * - Sans accents
 * - Trim
 */
export function normalizeString(str: string): string {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

/**
 * Calcule le pourcentage de similarité entre deux chaînes.
 * Retourne un nombre entre 0 et 1 (1 = identique).
 */
export function calculateSimilarity(s1: string, s2: string): number {
    const longer = s1.length > s2.length ? s1 : s2;
    if (longer.length === 0) {
        return 1.0;
    }
    return (longer.length - levenshteinDistance(s1, s2)) / longer.length;
}
