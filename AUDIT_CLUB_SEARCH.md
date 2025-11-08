# Audit et Corrections - Recherche d'Adversaires par Club

## Résumé des modifications

### 1. API `/api/players/search` - Sécurité renforcée

**Changements:**
- ✅ **Ignore les paramètres `club_*` venant du client** pour éviter la manipulation
- ✅ **Lit le user depuis la session** côté serveur
- ✅ **Dérive `serverClubId`** depuis le profil de l'utilisateur authentifié
- ✅ **Applique `eq('club_id', serverClubId)` AVANT** tout autre filtre texte
- ✅ **Utilise le client admin** (Service Role) pour bypass RLS si nécessaire
- ✅ **Logs détaillés** : `serverClubId` résolu et nombre de profils retournés

**Fichier modifié:** `app/api/players/search/route.ts`

### 2. Composant `PlayerAutocomplete` - Protection côté client

**Changements:**
- ✅ **Empêche les requêtes** tant que `clubId` est vide
- ✅ **Affiche un avertissement** si le club n'est pas chargé
- ✅ **Logs améliorés** pour le débogage

**Fichier modifié:** `components/PlayerAutocomplete.tsx`

### 3. Scripts SQL

#### `fix_profiles_rls.sql` - Policies RLS pour profiles
- Active RLS sur la table `profiles`
- Crée une policy `profiles_select_same_club` permettant aux utilisateurs de lire les profils des membres de leur club
- Crée des policies pour UPDATE et INSERT sur son propre profil

**Exécution:**
```sql
-- Dans Supabase SQL Editor
-- Copier-coller le contenu de fix_profiles_rls.sql et exécuter
```

#### `backfill_tcam_data.sql` - Normalisation des données TCAM
- Normalise `club_slug` pour tous les profils du club TCAM
- Renseigne `club_id` pour les profils qui n'ont que `club_slug`
- Affiche un résumé des profils normalisés

**Exécution:**
```sql
-- Dans Supabase SQL Editor
-- Copier-coller le contenu de backfill_tcam_data.sql et exécuter
```

### 4. Tests E2E

**Fichier:** `tests/e2e/player-search-club-isolation.test.ts`

**Scénarios testés:**
1. Utilisateur TCAM ne voit que les membres TCAM
2. Utilisateur Amiens Padel ne voit que les membres Amiens Padel
3. Deux utilisateurs de clubs différents tapent le même préfixe et voient des résultats différents

**Exécution:**
```bash
# Installer Playwright
npm install -D @playwright/test

# Configurer les variables d'environnement
export TCAM_USER_EMAIL="tcam-user@test.com"
export TCAM_USER_PASSWORD="test-password"
export AMIENS_USER_EMAIL="amiens-user@test.com"
export AMIENS_USER_PASSWORD="test-password"

# Exécuter les tests
npx playwright test tests/e2e/player-search-club-isolation.test.ts
```

## Checklist de déploiement

### Étape 1: Exécuter les scripts SQL

1. **Vérifier/ajuster RLS:**
   - Ouvrir Supabase Dashboard → SQL Editor
   - Exécuter `fix_profiles_rls.sql`
   - Vérifier que les policies sont créées

2. **Normaliser les données TCAM:**
   - Exécuter `backfill_tcam_data.sql`
   - Vérifier le résumé affiché
   - Ré-exécuter si nécessaire jusqu'à ce que tous les profils soient normalisés

### Étape 2: Vérifier les logs

1. Ouvrir la console du navigateur (F12)
2. Aller sur `/match/new`
3. Rechercher un joueur
4. Vérifier les logs:
   - `[Search] Resolved serverClubId: ...` - Le club est bien résolu
   - `[Search] Applied club_id filter FIRST: ...` - Le filtre est appliqué en premier
   - `[Search] Found X profiles` - Nombre de profils trouvés
   - `[Search] Returning X results` - Résultats finaux

### Étape 3: Tests manuels

1. **Test avec utilisateur TCAM:**
   - Se connecter avec un compte TCAM
   - Aller sur `/match/new`
   - Rechercher un joueur
   - Vérifier que seuls les membres TCAM apparaissent

2. **Test avec utilisateur Amiens Padel:**
   - Se connecter avec un compte Amiens Padel
   - Aller sur `/match/new`
   - Rechercher un joueur
   - Vérifier que seuls les membres Amiens Padel apparaissent

3. **Test de sécurité:**
   - Essayer de modifier les paramètres dans l'URL
   - Vérifier que les résultats restent filtrés par le club de l'utilisateur connecté

## Dépannage

### Problème: Aucun résultat ne s'affiche

**Vérifications:**
1. Le profil de l'utilisateur a-t-il `club_id` ou `club_slug` défini ?
2. Les autres joueurs du club ont-ils `club_id` correspondant ?
3. Les logs montrent-ils `serverClubId: null` ?

**Solution:**
- Exécuter `backfill_tcam_data.sql` pour normaliser les données
- Vérifier que le club existe dans la table `clubs`

### Problème: Des joueurs d'autres clubs apparaissent

**Vérifications:**
1. Les logs montrent-ils le bon `serverClubId` ?
2. Le filtre `eq('club_id', serverClubId)` est-il appliqué ?
3. Les profils retournés ont-ils le bon `club_id` ?

**Solution:**
- Vérifier les logs de l'API
- S'assurer que `serverClubId` est bien résolu depuis la session
- Vérifier que les profils ont bien `club_id` renseigné

### Problème: Erreur RLS

**Vérifications:**
1. La policy `profiles_select_same_club` existe-t-elle ?
2. RLS est-il activé sur la table `profiles` ?

**Solution:**
- Exécuter `fix_profiles_rls.sql`
- Vérifier dans Supabase Dashboard → Authentication → Policies

## Architecture de sécurité

```
┌─────────────────┐
│  Client Browser │
│  PlayerAutocomplete │
└────────┬────────┘
         │ Requête GET /api/players/search?q=...
         │ (sans paramètres club_*)
         ▼
┌─────────────────┐
│  API Route      │
│  /api/players/search │
│                  │
│  1. Lire session │
│  2. Dériver      │
│     serverClubId │
│  3. Appliquer    │
│     eq(club_id)  │
│     EN PREMIER   │
│  4. Appliquer    │
│     filtres texte│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supabase       │
│  (Service Role) │
│  Bypass RLS     │
└─────────────────┘
```

## Notes importantes

1. **Sécurité:** Les paramètres `club_*` venant du client sont maintenant **complètement ignorés**. Le club est toujours dérivé depuis la session serveur.

2. **Performance:** Le filtre `club_id` est appliqué **en premier** dans la requête SQL, ce qui permet à PostgreSQL d'utiliser l'index sur `club_id` pour optimiser la requête.

3. **RLS:** Si RLS bloque les requêtes, le client admin (Service Role) est utilisé pour bypass, mais le filtre `club_id` garantit toujours l'isolation.

4. **Backfill:** Le script `backfill_tcam_data.sql` doit être exécuté pour normaliser les données existantes. Il peut être ré-exécuté plusieurs fois sans problème.


