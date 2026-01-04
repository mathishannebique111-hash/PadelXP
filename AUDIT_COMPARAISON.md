# AUDIT COMPLET : Comparaison "Vos statistiques" vs "Classement global"

## Date : 2025-01-27
## Objectif : Identifier les différences entre PlayerSummary et calculatePlayerLeaderboard

---

## 1. RÉCUPÉRATION DES DONNÉES INITIALES

### PlayerSummary (Vos statistiques)
- **Fichier** : `components/PlayerSummary.tsx`
- **Lignes** : 26-52
- **Méthode** :
  1. Récupère `match_participants` avec `.eq("user_id", profileId)` et `.eq("player_type", "user")`
  2. Récupère le `club_id` depuis `profiles` avec `supabaseAdmin`
  3. Récupère TOUS les matchs du joueur via `.in("id", matchIds)`

### calculatePlayerLeaderboard (Classement global)
- **Fichier** : `lib/utils/player-leaderboard-utils.ts`
- **Lignes** : 51-102
- **Méthode** :
  1. Récupère TOUS les `match_participants` avec `.eq("player_type", "user")` (SANS filtre user_id initial)
  2. Récupère TOUS les matchs via `.in("id", uniqueMatchIds)`

**DIFFÉRENCE IMPORTANTE** :
- PlayerSummary récupère d'abord les participants d'UN seul joueur
- calculatePlayerLeaderboard récupère TOUS les participants de TOUS les joueurs

---

## 2. FILTRAGE PAR LIMITE QUOTIDIENNE

### PlayerSummary
- **Ligne** : 85-89
- **Fonction** : `filterMatchesByDailyLimit(...)`
- **Paramètres** :
  - `mp.map((p: any) => ({ match_id: p.match_id, user_id: profileId }))`
  - `(allMs || []).map((m: any) => ({ id: m.id, played_at: m.played_at || m.created_at }))`
  - `MAX_MATCHES_PER_DAY` (= 2)
- **Résultat** : `Set<string>` de match_ids valides
- **Note** : Applique la limite sur TOUS les matchs du joueur (tous clubs confondus)

### calculatePlayerLeaderboard
- **Ligne** : 106-116
- **Fonction** : `filterMatchesByDailyLimitPerUser(...)`
- **Paramètres** :
  - `allParticipants.filter(p => p.player_type === "user" && p.user_id).map(p => ({ match_id: p.match_id, user_id: p.user_id }))`
  - `Array.from(matchesMap.entries()).map(([id, match]) => ({ id, played_at: match.played_at || match.created_at }))`
  - `MAX_MATCHES_PER_DAY` (= 2)
- **Résultat** : `Map<string, Set<string>>` (userId -> Set de match_ids valides)
- **Note** : Applique la limite pour CHAQUE joueur individuellement

**DIFFÉRENCE IMPORTANTE** :
- PlayerSummary : utilise `filterMatchesByDailyLimit` qui retourne un `Set<string>`
- calculatePlayerLeaderboard : utilise `filterMatchesByDailyLimitPerUser` qui retourne un `Map<userId, Set<matchId>>`
- Les deux utilisent la même constante `MAX_MATCHES_PER_DAY = 2`

---

## 3. FILTRAGE PAR CLUB

### PlayerSummary
- **Lignes** : 94-145
- **Méthode** :
  1. Si `playerClubId` existe :
     - Récupère TOUS les participants de ces matchs (users ET guests)
     - Récupère les profils pour vérifier les `club_id`
     - Filtre : `profilesQuery.eq("club_id", playerClubId)`
     - Groupe les participants par match
     - Filtre les matchs : ne garde que ceux où TOUS les participants users appartiennent au même club
  2. Construit `validMatchIds` (array de match_ids valides)

### calculatePlayerLeaderboard
- **Lignes** : 120-201
- **Méthode** :
  1. Récupère les profils de TOUS les participants
     - Si `clubId` existe : `.eq("club_id", clubId)`
  2. Crée `validUserIds` (Set des userIds du même club)
  3. Filtre les participants : ne garde que ceux dont `user_id` est dans `validUserIds`
  4. Groupe les participants par match
  5. Filtre les matchs : ne garde que ceux où TOUS les participants users appartiennent au même club
  6. Construit `validMatchIds` (Set de match_ids valides)

**DIFFÉRENCE IMPORTANTE** :
- PlayerSummary : `validMatchIds` est un **Array**
- calculatePlayerLeaderboard : `validMatchIds` est un **Set**

---

## 4. APPLICATION DES FILTRES (Club + Limite quotidienne)

### PlayerSummary
- **Lignes** : 163-177
- **Méthode** :
  ```typescript
  filteredMp = mp.filter((p: any) => {
    const isValidForClub = !playerClubId || validMatchIds.includes(p.match_id);
    const isValidForDailyLimit = validMatchIdsForPoints.has(p.match_id);
    const matchExists = byId[p.match_id] !== undefined;
    const hasValidWinner = matchExists && byId[p.match_id]?.winner_team !== undefined;
    const shouldInclude = isValidForClub && isValidForDailyLimit && hasValidWinner;
    return shouldInclude;
  });
  ```
- **Note** : Filtre `mp` (participants du joueur) avec les deux conditions

### calculatePlayerLeaderboard
- **Lignes** : 209-218
- **Méthode** :
  ```typescript
  const finalFilteredParticipants = filteredParticipants.filter((p: any) => {
    const isValidForClub = validMatchIds.has(p.match_id);
    if (p.player_type === "user" && p.user_id) {
      const allowedMatches = validMatchIdsForPointsByUser.get(p.user_id);
      const isValidForDailyLimit = allowedMatches ? allowedMatches.has(p.match_id) : false;
      return isValidForClub && isValidForDailyLimit;
    }
    return isValidForClub;
  });
  ```
- **Note** : Filtre `filteredParticipants` (TOUS les participants) avec les deux conditions

**DIFFÉRENCE IMPORTANTE** :
- PlayerSummary : utilise `validMatchIds.includes()` (Array)
- calculatePlayerLeaderboard : utilise `validMatchIds.has()` (Set)
- calculatePlayerLeaderboard : utilise `validMatchIdsForPointsByUser.get(p.user_id)` pour obtenir les matchs valides par joueur

---

## 5. CALCUL DES VICTOIRES/DÉFAITES

### PlayerSummary
- **Lignes** : 185-206
- **Méthode** :
  - Parcourt `filteredMp` (participants filtrés)
  - Pour chaque participant, détermine si c'est une victoire ou défaite
  - Incrémente `wins`, `losses`, `matches`
  - Collecte `winMatches` (Set des match_ids gagnés)

### calculatePlayerLeaderboard
- **Lignes** : 241-285
- **Méthode** :
  - Parcourt `agg` (participants enrichis filtrés)
  - Pour chaque participant, détermine si c'est une victoire ou défaite
  - Groupe par `playerId` (user_id ou guest_id)
  - Incrémente `wins`, `losses`, `matches` par joueur
  - Collecte `winMatchesByPlayer` (Map<playerId, Set<matchIds>>)

**DIFFÉRENCE IMPORTANTE** :
- PlayerSummary : calcule pour UN seul joueur
- calculatePlayerLeaderboard : calcule pour TOUS les joueurs

---

## 6. CALCUL DES POINTS

### PlayerSummary
- **Lignes** : 213-256
- **Méthode** :
  1. Calcule le bonus avis (reviewsBonus) : +10 si au moins un avis valide
  2. Appelle `calculatePointsWithBoosts(...)`
     - Paramètres : `wins`, `losses`, `filteredMp.map(p => p.match_id)`, `winMatches`, `profileId`, `reviewsBonus`, `challengePoints`
  3. Retourne les points totaux

### calculatePlayerLeaderboard
- **Lignes** : 324-465
- **Méthode** :
  1. Pour chaque joueur :
     - Calcule le bonus avis (reviewsBonus) : +10 si au moins un avis valide
     - Calcule les challengePoints depuis `profiles.points`
  2. Appelle `calculatePointsForMultiplePlayers(...)`
     - Paramètres : Array de `{ userId, wins, losses, winMatches, bonus, challengePoints }`
  3. Retourne un Map<userId, totalPoints>

**DIFFÉRENCE IMPORTANTE** :
- PlayerSummary : appelle `calculatePointsWithBoosts` pour UN joueur
- calculatePlayerLeaderboard : appelle `calculatePointsForMultiplePlayers` pour TOUS les joueurs
- Les deux utilisent la même logique sous-jacente (calculatePointsWithBoosts est appelé par calculatePointsForMultiplePlayers)

---

## 7. RÉSUMÉ DES DIFFÉRENCES CRITIQUES

1. **Portée des données** :
   - PlayerSummary : travaille sur UN seul joueur
   - calculatePlayerLeaderboard : travaille sur TOUS les joueurs

2. **Structure de filtrage quotidien** :
   - PlayerSummary : `Set<string>` de match_ids
   - calculatePlayerLeaderboard : `Map<userId, Set<matchId>>` par joueur

3. **Structure de filtrage club** :
   - PlayerSummary : `Array<string>` de match_ids
   - calculatePlayerLeaderboard : `Set<string>` de match_ids

4. **Vérification de filtrage** :
   - PlayerSummary : `validMatchIds.includes(p.match_id)` (Array)
   - calculatePlayerLeaderboard : `validMatchIds.has(p.match_id)` (Set)

5. **Application limite quotidienne** :
   - PlayerSummary : `validMatchIdsForPoints.has(p.match_id)` (Set global)
   - calculatePlayerLeaderboard : `validMatchIdsForPointsByUser.get(p.user_id).has(p.match_id)` (Set par joueur)

---

## 8. POINTS DE VÉRIFICATION POTENTIELS

1. **Timing** : Le classement global est-il recalculé après l'enregistrement d'un match ?
2. **Cache** : Y a-t-il un cache activé quelque part qui pourrait retourner d'anciennes données ?
3. **Ordre des filtres** : L'ordre d'application des filtres (club puis quotidien vs quotidien puis club) pourrait-il causer des différences ?
4. **Données initiales** : Les données initiales du classement global viennent-elles du serveur ou du client ?

---

## 9. QUESTIONS À RÉSOUDRE

1. Pourquoi PlayerSummary se met à jour mais pas calculatePlayerLeaderboard ?
2. Les données du classement global sont-elles vraiment recalculées après un match ?
3. Y a-t-il un cache quelque part qui n'est pas invalidé ?
4. Les filtres sont-ils appliqués dans le même ordre dans les deux cas ?

