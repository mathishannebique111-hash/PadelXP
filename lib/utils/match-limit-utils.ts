/**
 * Utilitaires pour filtrer les matchs selon la limite quotidienne
 */

/**
 * Filtre les matchs pour ne garder que les 2 premiers matchs par jour pour chaque joueur
 * IMPORTANT: Les matchs qui dépassent la limite quotidienne sont exclus du calcul des points.
 * Cela signifie que NI les victoires (+10 points) NI les défaites (+3 points) ne comptent
 * pour les matchs qui dépassent la limite de 2 matchs par jour.
 * 
 * @param matchParticipants Array de participants avec match_id et user_id
 * @param matchesData Map ou Array de matchs avec id et played_at
 * @param maxMatchesPerDay Nombre maximum de matchs par jour (défaut: 2)
 * @returns Set des match_ids qui doivent être comptés pour les points
 */
export function filterMatchesByDailyLimit<T extends { match_id: string; user_id: string }>(
  matchParticipants: T[],
  matchesData: Array<{ id: string; played_at: string }> | Map<string, { played_at: string }>,
  maxMatchesPerDay: number = 2
): Set<string> {
  const validMatchIds = new Set<string>();
  
  // Convertir matchesData en Map si c'est un Array
  const matchesMap = matchesData instanceof Map 
    ? matchesData 
    : new Map(matchesData.map(m => [m.id, { played_at: m.played_at }]));

  // Grouper les participants par user_id
  const participantsByUser = new Map<string, T[]>();
  matchParticipants.forEach(p => {
    if (!p.user_id) return;
    if (!participantsByUser.has(p.user_id)) {
      participantsByUser.set(p.user_id, []);
    }
    participantsByUser.get(p.user_id)!.push(p);
  });

  // Pour chaque joueur, filtrer ses matchs par jour
  participantsByUser.forEach((participants, userId) => {
    // Grouper les matchs par date
    const matchesByDate = new Map<string, Array<{ match_id: string; played_at: Date }>>();
    
    participants.forEach(p => {
      const match = matchesMap.get(p.match_id);
      if (!match || !match.played_at) return;
      
      const playedAt = new Date(match.played_at);
      const dateKey = playedAt.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!matchesByDate.has(dateKey)) {
        matchesByDate.set(dateKey, []);
      }
      matchesByDate.get(dateKey)!.push({
        match_id: p.match_id,
        played_at: playedAt
      });
    });

    // Pour chaque jour, ne garder que les maxMatchesPerDay premiers matchs
    matchesByDate.forEach((dayMatches, dateKey) => {
      // Trier par played_at (plus ancien en premier)
      const sortedMatches = dayMatches.sort((a, b) => 
        a.played_at.getTime() - b.played_at.getTime()
      );
      
      // Ne garder que les maxMatchesPerDay premiers
      sortedMatches.slice(0, maxMatchesPerDay).forEach(m => {
        validMatchIds.add(m.match_id);
      });
    });
  });

  return validMatchIds;
}


