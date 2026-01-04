# AUDIT COMPLET : Mécanisme de rechargement "Vos statistiques" vs "Classement global"

## Date : 2025-01-27
## Objectif : Identifier pourquoi le classement global ne se met pas à jour alors que "vos statistiques" si

---

## 1. COMMENT "VOS STATISTIQUES" SE RECHARGE

### PlayerSummary (Composant serveur)
- **Fichier** : `components/PlayerSummary.tsx`
- **Type** : Composant serveur React (pas de "use client")
- **Méthode de rechargement** : Via `revalidatePath("/home")` dans `app/api/matches/submit/route.ts`
- **Ligne** : 625 dans `app/api/matches/submit/route.ts`
  ```typescript
  revalidatePath("/home", "page");
  ```

### Flux de rechargement pour PlayerSummary :
1. Match enregistré → `app/api/matches/submit/route.ts`
2. `revalidatePath("/home", "page")` est appelé
3. Next.js invalide le cache de la page `/home`
4. Quand l'utilisateur revient sur `/home`, Next.js re-rend la page côté serveur
5. `PlayerSummary` est re-exécuté avec les nouvelles données depuis la DB
6. Les nouvelles données s'affichent

**AVANTAGE** : Le rechargement est automatique via le système de cache de Next.js. Pas besoin de logique client complexe.

---

## 2. COMMENT "CLASSEMENT GLOBAL" SE RECHARGE

### LeaderboardContent (Composant client)
- **Fichier** : `components/LeaderboardContent.tsx`
- **Type** : Composant client React (`"use client"`)
- **Méthode de rechargement** : Via appel API `/api/leaderboard` depuis le client
- **Lignes** : 43-115 dans `components/LeaderboardContent.tsx`

### Flux de rechargement pour LeaderboardContent :
1. Match enregistré → `app/api/matches/submit/route.ts`
2. `MatchForm` dispatch un événement `matchSubmitted` et met `lastMatchTime` dans localStorage
3. `LeaderboardContent` écoute l'événement `matchSubmitted` et `storage`
4. Après 2 secondes de délai, `LeaderboardContent` appelle `/api/leaderboard`
5. `/api/leaderboard` appelle `calculatePlayerLeaderboard(clubId)`
6. Les données sont mises à jour dans l'état React du composant

**PROBLÈME POTENTIEL** : Le rechargement dépend de plusieurs mécanismes (événements, localStorage, polling) qui peuvent échouer.

---

## 3. COMPARAISON DES MÉCANISMES DE RECHARGEMENT

| Aspect | PlayerSummary | LeaderboardContent |
|--------|---------------|-------------------|
| Type de composant | Serveur | Client |
| Rechargement | Automatique via Next.js | Manuel via API |
| Déclencheur | `revalidatePath("/home")` | Événement `matchSubmitted` + localStorage |
| Délai | Immédiat (au prochain render) | 2 secondes |
| Dépendances | Cache Next.js | Événements window, localStorage, fetch API |
| Complexité | Simple (géré par Next.js) | Complexe (plusieurs mécanismes) |

---

## 4. VÉRIFICATION DU REVALIDATEPATH

### Dans app/api/matches/submit/route.ts
- **Ligne 625** : `revalidatePath("/home", "page");`
- **Note** : Ceci devrait recharger TOUTE la page `/home`, y compris PlayerSummary
- **MAIS** : LeaderboardContent est un composant client qui ne se recharge PAS automatiquement via revalidatePath
- **PROBLÈME** : `revalidatePath` ne recharge que les composants serveur, pas les composants client

---

## 5. VÉRIFICATION DES ÉVÉNEMENTS DANS MATCHFORM

### Dans components/MatchForm.tsx
- **Lignes 1077-1100** : Code qui dispatch les événements après enregistrement du match
- **Événements dispatchés** :
  1. `CustomEvent("matchSubmitted")` - pour le même onglet
  2. `localStorage.setItem("lastMatchTime", ...)` - pour le polling
  3. `localStorage.setItem("matchSubmitted", "true")` - pour cross-tab
  4. `window.dispatchEvent(new Event("storage"))` - pour déclencher storage events
  5. `router.refresh()` - pour forcer le rechargement Next.js

**PROBLÈME POTENTIEL** : Si LeaderboardContent n'est pas monté quand l'événement est dispatché, l'événement est perdu.

---

## 6. VÉRIFICATION DES ÉCOUTEURS DANS LEADERBOARDCONTENT

### Dans components/LeaderboardContent.tsx
- **Lignes 117-200** : useEffect qui configure les écouteurs
- **Mécanismes de détection** :
  1. Événement custom `matchSubmitted` (même onglet)
  2. Événement `storage` (cross-tab)
  3. Polling toutes les 2 secondes (vérifie `lastMatchTime`)
  4. Vérification au montage (si `lastMatchTime` < 30 secondes)
  5. Vérification au focus de la fenêtre

**PROBLÈME POTENTIEL** : Si le composant est monté avec `display: none`, les écouteurs sont-ils toujours actifs ?

---

## 7. VÉRIFICATION DE LA DISPONIBILITÉ DU COMPOSANT

### Dans components/PlayerProfileTabs.tsx
- **Lignes 63-77** : Utilise `display: 'block' : 'none'` pour montrer/cacher les onglets
- **Note** : LeaderboardContent est toujours monté dans le DOM, juste caché avec CSS
- **IMPLICATION** : Les écouteurs devraient toujours fonctionner car le composant est monté

---

## 8. VÉRIFICATION DE L'API /api/leaderboard

### Dans app/api/leaderboard/route.ts
- **Ligne 6** : `export const dynamic = 'force-dynamic';`
- **Ligne 36** : `const leaderboard = await calculatePlayerLeaderboard(userClubId);`
- **Note** : L'API est forcée en mode dynamique, donc elle devrait toujours recalculer
- **PROBLÈME POTENTIEL** : Si `calculatePlayerLeaderboard` utilise un cache, même si l'API est dynamique, le cache pourrait retourner d'anciennes données

---

## 9. VÉRIFICATION DU CACHE DANS CALCULATEPLAYERLEADERBOARD

### Dans lib/utils/player-leaderboard-utils.ts
- **Lignes 47-49** : Commentaire indique "DÉSACTIVATION TEMPORAIRE DU CACHE POUR DEBUGGING"
- **Ligne 553** : Commentaire "CACHE DÉSACTIVÉ TEMPORAIREMENT POUR DEBUGGING"
- **IMPLICATION** : Le cache Redis est désactivé, donc `calculatePlayerLeaderboard` devrait toujours recalculer

---

## 10. POINTS CRITIQUES IDENTIFIÉS

### Problème 1 : Timing
- PlayerSummary se recharge immédiatement via Next.js
- LeaderboardContent attend 2 secondes avant de recharger
- **QUESTION** : 2 secondes suffisent-elles pour que le match soit enregistré en DB ?

### Problème 2 : Mécanisme de rechargement
- PlayerSummary : Rechargement automatique et fiable (Next.js)
- LeaderboardContent : Rechargement manuel avec plusieurs points de défaillance possibles
- **QUESTION** : Les événements sont-ils bien dispatchés et reçus ?

### Problème 3 : Données initiales
- LeaderboardContent reçoit `initialLeaderboard` depuis le serveur
- Si l'utilisateur n'a pas navigué depuis l'enregistrement du match, `initialLeaderboard` contient les anciennes données
- Le rechargement via API devrait mettre à jour, mais peut-être que les données ne changent pas ?
- **QUESTION** : L'API `/api/leaderboard` retourne-t-elle vraiment de nouvelles données ?

### Problème 4 : RevalidatePath ne recharge pas les composants client
- `revalidatePath("/home")` recharge les composants serveur
- LeaderboardContent est un composant client, donc il n'est PAS rechargé par revalidatePath
- **IMPLICATION** : Le rechargement doit se faire manuellement via l'API

---

## 11. QUESTIONS À RÉSOUDRE

1. **Les événements sont-ils bien dispatchés ?**
   - Vérifier les logs dans MatchForm quand un match est enregistré
   - Vérifier si `matchSubmitted` est bien dispatché

2. **Les événements sont-ils bien reçus ?**
   - Vérifier les logs dans LeaderboardContent
   - Vérifier si les écouteurs sont bien configurés

3. **L'API retourne-t-elle de nouvelles données ?**
   - Vérifier les logs de `/api/leaderboard`
   - Vérifier les logs de `calculatePlayerLeaderboard`
   - Comparer les points retournés avant et après l'enregistrement d'un match

4. **Le délai de 2 secondes est-il suffisant ?**
   - Vérifier si le match est bien enregistré en DB avant que LeaderboardContent ne recharge

5. **Le composant est-il bien monté ?**
   - Vérifier si LeaderboardContent est monté même quand l'onglet n'est pas actif
   - Vérifier si les écouteurs sont toujours actifs

---

## 12. RECOMMANDATIONS

1. **Ajouter des logs détaillés** dans :
   - MatchForm : pour voir si les événements sont dispatchés
   - LeaderboardContent : pour voir si les événements sont reçus
   - `/api/leaderboard` : pour voir ce qui est retourné
   - `calculatePlayerLeaderboard` : pour voir les points calculés

2. **Vérifier le timing** :
   - Réduire le délai à 1 seconde ou moins
   - Vérifier si le match est bien enregistré avant le rechargement

3. **Vérifier les données retournées** :
   - Comparer les points retournés par l'API avant et après l'enregistrement
   - Vérifier si les points changent réellement dans la DB

4. **Simplifier le mécanisme de rechargement** :
   - Utiliser `router.refresh()` pour forcer le rechargement de la page
   - Ou utiliser un système de polling plus agressif

