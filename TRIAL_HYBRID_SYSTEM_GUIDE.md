# 🎯 Système d'essai gratuit hybride - Guide complet

## 📋 Récapitulatif du système

### Vue d'ensemble

Le système d'essai hybride permet de maximiser les conversions en offrant **3 niveaux d'extension** pour les clubs qui démarrent progressivement :

1. **Essai de base** : 14 jours gratuits pour tous les nouveaux clubs
2. **Extension automatique** : +16 jours (total 30 jours) si seuils d'engagement atteints
3. **Extension proposée** : +15 jours offerts au jour 12 si engagement moyen
4. **Extension manuelle** : Prolongation par un admin pour cas particuliers

---

## 🎮 Fonctionnement détaillé

### 1. Essai de base (14 jours)

**À l'inscription d'un club :**
- ✅ Essai gratuit de **14 jours** démarre automatiquement
- ✅ Stockage de `trial_start_date`, `trial_base_end_date` (J+14), `trial_current_end_date` (J+14)
- ✅ Statut initial : `trial_status = "active"`
- ✅ Aucune carte bancaire requise
- ✅ Accès complet à toutes les fonctionnalités premium

**Fichiers concernés :**
- `app/api/clubs/register/route.ts` - Initialise l'essai à 14 jours
- `lib/trial-hybrid.ts` - Fonction `initiateTrial()`

---

### 2. Extension automatique (14 → 30 jours)

**Conditions de déclenchement :**
Le club débloque automatiquement **+16 jours** (passage de J+14 à J+30) si, pendant les 14 premiers jours, il atteint **AU MOINS UN** de ces critères :

- ✅ **≥ 10 joueurs** inscrits au club
- ✅ **≥ 20 matchs** enregistrés par les joueurs du club
- ✅ **≥ 5 connexions au dashboard** par le club

**Action automatique :**
- Vérification après chaque action importante (ajout joueur, match, connexion dashboard)
- Mise à jour de `trial_current_end_date` : J+14 → J+30
- `trial_status = "extended_auto"`
- `extension_type = "automatic"`
- `extension_reason = "10_players" | "20_matches" | "5_logins"`
- Email de notification (à implémenter)
- Notification in-app (à implémenter)

**Fichiers concernés :**
- `lib/trial-hybrid.ts` - Fonctions `checkAutoExtensionEligibility()`, `grantAutoExtension()`
- `lib/hooks/use-trial-engagement.ts` - `updateTrialEngagementAfterAction()`
- `app/api/trial/check-extensions/route.ts` - Vérification quotidienne (cron)

---

### 3. Extension proposée (+15 jours au jour 12)

**Conditions de proposition :**
Au **jour 12** de l'essai, si le club n'a **PAS** encore déclenché l'extension automatique mais montre des signaux d'engagement moyen, lui proposer automatiquement **+15 jours supplémentaires**.

**Signaux d'engagement moyen** (au moins 2 sur 4) :
- ✅ Entre **4-9 joueurs** inscrits (pas encore 10)
- ✅ Entre **10-19 matchs** enregistrés (pas encore 20)
- ✅ **≥ 3 connexions** au dashboard dans les 12 derniers jours
- ✅ **≥ 1 invitation** de joueur envoyée

**Action semi-automatique :**
- Vérification automatique au jour 12
- Si 2+ signaux présents :
  - Email personnalisé : "Besoin de plus de temps ? Cliquez ici pour obtenir 15 jours supplémentaires"
  - Banner dans le dashboard avec bouton "Obtenir +15 jours"
- Si le club clique (accepte) :
  - Mise à jour `trial_current_end_date` : J+14 → J+29
  - `trial_status = "extended_proposed"`
  - `extension_type = "requested_by_club"`
- Si le club ne clique pas, essai expire à J+14 normalement

**Fichiers concernés :**
- `lib/trial-hybrid.ts` - Fonctions `checkProposedExtensionEligibility()`, `acceptProposedExtension()`
- `app/api/trial/check-extensions/route.ts` - Vérification au jour 12
- `app/api/trial/accept-proposed/route.ts` - Acceptation de l'extension

---

### 4. Extension manuelle (Intervention admin)

**Dashboard admin :**
- Liste tous les clubs en essai avec :
  - Nom du club, jours restants, statut d'essai
  - Métriques clés : joueurs, matchs, challenges, connexions
  - Score d'engagement visuel (low/medium/high)

**Fonctionnalité :**
- L'admin peut prolonger l'essai de **N jours** (input flexible : +7, +14, +30, etc.)
- Champ optionnel : "Raison de l'extension" (notes internes)
- Mise à jour `trial_current_end_date` selon la durée choisie
- `trial_status = "extended_manual"`
- `extension_type = "admin_manual"`
- `extension_notes = raison saisie`
- Option : envoyer email personnalisé au club

**Fichiers concernés :**
- `app/api/trial/manual-extension/route.ts` - API pour extension manuelle
- `lib/trial-hybrid.ts` - Fonction `grantManualExtension()`
- Dashboard admin (à créer) : `/app/dashboard/admin/trials/page.tsx`

---

## 📊 Métriques d'engagement

Les métriques sont mises à jour automatiquement via des **triggers SQL** :

- ✅ **`total_players_count`** - Mis à jour automatiquement via trigger sur `profiles`
- ✅ **`total_matches_count`** - Mis à jour automatiquement via trigger sur `matches`
- ✅ **`total_challenges_count`** - Mis à jour via code TypeScript (lecture depuis Storage)
- ✅ **`dashboard_login_count`** - Incrémenté manuellement via `incrementDashboardLoginCount()`
- ✅ **`invitations_sent_count`** - Incrémenté manuellement via `incrementInvitationsSentCount()`

---

## 🧪 Guide de test

### Prérequis

1. ✅ Exécuter la migration SQL (`TRIAL_HYBRID_SYSTEM_MIGRATION.sql`) dans Supabase
2. ✅ Vérifier que les triggers sont créés
3. ✅ Vérifier que les fonctions RPC sont créées

### Test 1 : Essai de base (14 jours)

**Objectif :** Vérifier qu'un nouveau club démarre avec 14 jours d'essai

**Étapes :**
1. Créer un nouveau club via `/clubs/signup`
2. Vérifier dans Supabase que :
   ```sql
   SELECT 
     id, 
     name, 
     trial_start_date, 
     trial_base_end_date, 
     trial_current_end_date,
     trial_status
   FROM clubs
   WHERE id = 'votre-club-id';
   ```
3. Vérifier que :
   - `trial_start_date` = date actuelle
   - `trial_base_end_date` = date actuelle + 14 jours
   - `trial_current_end_date` = date actuelle + 14 jours
   - `trial_status` = 'active'

**Résultat attendu :** ✅ Essai de 14 jours initialisé correctement

---

### Test 2 : Extension automatique (10 joueurs)

**Objectif :** Vérifier que l'extension automatique se déclenche à 10 joueurs

**Étapes :**
1. Créer un nouveau club (ou utiliser un club existant en essai)
2. Ajouter 10 joueurs au club (via invitation ou création de profils)
3. Vérifier que le trigger met à jour `total_players_count` :
   ```sql
   SELECT total_players_count FROM clubs WHERE id = 'votre-club-id';
   ```
4. Appeler manuellement la vérification d'extension :
   ```bash
   curl -X POST http://localhost:3000/api/trial/check-extensions \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```
   Ou appeler directement dans le code :
   ```typescript
   import { checkAutoExtensionEligibility, grantAutoExtension } from '@/lib/trial-hybrid';
   const eligibility = await checkAutoExtensionEligibility(clubId);
   if (eligibility.eligible) {
     await grantAutoExtension(clubId, eligibility.reason!);
   }
   ```
5. Vérifier dans Supabase :
   ```sql
   SELECT 
     trial_current_end_date,
     trial_status,
     auto_extension_unlocked,
     auto_extension_reason
   FROM clubs
   WHERE id = 'votre-club-id';
   ```

**Résultat attendu :**
- ✅ `trial_current_end_date` = date de début + 30 jours
- ✅ `trial_status` = 'extended_auto'
- ✅ `auto_extension_unlocked` = true
- ✅ `auto_extension_reason` = '10_players'

---

### Test 3 : Extension automatique (20 matchs)

**Objectif :** Vérifier que l'extension automatique se déclenche à 20 matchs

**Étapes :**
1. Créer un nouveau club avec quelques joueurs
2. Enregistrer 20 matchs (via l'interface ou l'API)
3. Vérifier que le trigger met à jour `total_matches_count`
4. Appeler la vérification d'extension (comme Test 2)
5. Vérifier que `auto_extension_reason` = '20_matches'

**Résultat attendu :** ✅ Extension automatique déclenchée à 20 matchs

---

### Test 4 : Extension automatique (5 connexions au dashboard)

**Objectif :** Vérifier que l'extension automatique se déclenche à 5 connexions au dashboard

**Étapes :**
1. Créer un nouveau club
2. Se connecter 5 fois au dashboard (le compteur `dashboard_login_count` s'incrémente automatiquement)
3. Appeler `updateEngagementMetrics(clubId)` pour mettre à jour le compteur
4. Appeler la vérification d'extension
5. Vérifier que `auto_extension_reason` = '5_logins'

**Résultat attendu :** ✅ Extension automatique déclenchée à 5 connexions au dashboard

---

### Test 5 : Extension proposée (jour 12)

**Objectif :** Vérifier que l'extension proposée est offerte au jour 12

**Étapes :**
1. Créer un nouveau club
2. **Modifier manuellement la date de début** pour simuler le jour 12 :
   ```sql
   UPDATE clubs
   SET trial_start_date = NOW() - INTERVAL '12 days'
   WHERE id = 'votre-club-id';
   ```
3. Ajouter 6 joueurs et 15 matchs (signaux d'engagement moyen)
4. Appeler la vérification d'extension :
   ```bash
   curl -X POST http://localhost:3000/api/trial/check-extensions
   ```
5. Vérifier dans Supabase :
   ```sql
   SELECT 
     proposed_extension_sent,
     proposed_extension_sent_date
   FROM clubs
   WHERE id = 'votre-club-id';
   ```

**Résultat attendu :**
- ✅ `proposed_extension_sent` = true
- ✅ `proposed_extension_sent_date` = date actuelle
- ✅ Email envoyé (si implémenté)
- ✅ Banner affiché dans le dashboard (si implémenté)

---

### Test 6 : Acceptation de l'extension proposée

**Objectif :** Vérifier que le club peut accepter l'extension proposée

**Étapes :**
1. Suivre les étapes du Test 5 pour avoir une extension proposée
2. Appeler l'API d'acceptation :
   ```bash
   curl -X POST http://localhost:3000/api/trial/accept-proposed \
     -H "Cookie: votre-session-cookie"
   ```
   Ou depuis le frontend :
   ```typescript
   const response = await fetch('/api/trial/accept-proposed', {
     method: 'POST',
   });
   ```
3. Vérifier dans Supabase :
   ```sql
   SELECT 
     trial_current_end_date,
     trial_status,
     proposed_extension_accepted
   FROM clubs
   WHERE id = 'votre-club-id';
   ```

**Résultat attendu :**
- ✅ `trial_current_end_date` = date de début + 29 jours (14 + 15)
- ✅ `trial_status` = 'extended_proposed'
- ✅ `proposed_extension_accepted` = true

---

### Test 7 : Extension manuelle (admin)

**Objectif :** Vérifier qu'un admin peut prolonger manuellement un essai

**Étapes :**
1. Créer un club en essai
2. Appeler l'API d'extension manuelle :
   ```bash
   curl -X POST http://localhost:3000/api/trial/manual-extension \
     -H "Cookie: votre-session-cookie" \
     -H "Content-Type: application/json" \
     -d '{
       "clubId": "votre-club-id",
       "days": 30,
       "notes": "Extension pour test"
     }'
   ```
3. Vérifier dans Supabase :
   ```sql
   SELECT 
     trial_current_end_date,
     trial_status,
     manual_extension_granted,
     manual_extension_days,
     manual_extension_notes
   FROM clubs
   WHERE id = 'votre-club-id';
   ```

**Résultat attendu :**
- ✅ `trial_current_end_date` = date actuelle + 30 jours
- ✅ `trial_status` = 'extended_manual'
- ✅ `manual_extension_granted` = true
- ✅ `manual_extension_days` = 30
- ✅ `manual_extension_notes` = 'Extension pour test'

---

### Test 8 : Calcul des jours restants

**Objectif :** Vérifier que le calcul des jours restants fonctionne correctement

**Étapes :**
1. Créer un club avec une date de fin connue
2. Appeler la fonction :
   ```typescript
   import { getTrialDaysRemaining } from '@/lib/trial-hybrid';
   const days = getTrialDaysRemaining(club.trial_current_end_date);
   ```
3. Vérifier que le résultat correspond à la différence entre aujourd'hui et la date de fin

**Résultat attendu :** ✅ Calcul correct des jours restants

---

### Test 9 : Expiration de l'essai

**Objectif :** Vérifier que l'essai expire correctement

**Étapes :**
1. Créer un club avec une date de fin passée :
   ```sql
   UPDATE clubs
   SET trial_current_end_date = NOW() - INTERVAL '1 day'
   WHERE id = 'votre-club-id';
   ```
2. Appeler la fonction d'expiration :
   ```typescript
   import { expireTrial } from '@/lib/trial-hybrid';
   await expireTrial(clubId);
   ```
3. Vérifier dans Supabase :
   ```sql
   SELECT trial_status FROM clubs WHERE id = 'votre-club-id';
   ```

**Résultat attendu :** ✅ `trial_status` = 'expired'

---

### Test 10 : Score d'engagement

**Objectif :** Vérifier que le score d'engagement est calculé correctement

**Étapes :**
1. Créer un club avec différentes métriques
2. Appeler la fonction :
   ```typescript
   import { getTrialEngagementScore } from '@/lib/trial-hybrid';
   const score = await getTrialEngagementScore(clubId);
   ```
3. Vérifier que le score correspond aux métriques :
   - **High** : ≥ 6 points (10+ joueurs OU 20+ matchs OU 1+ challenge + connexions)
   - **Medium** : 3-5 points (4-9 joueurs OU 10-19 matchs OU connexions)
   - **Low** : < 3 points

**Résultat attendu :** ✅ Score calculé correctement selon les métriques

---

## 🔧 Commandes utiles pour les tests

### Vérifier l'état d'un club
```sql
SELECT 
  id,
  name,
  trial_start_date,
  trial_base_end_date,
  trial_current_end_date,
  trial_status,
  auto_extension_unlocked,
  auto_extension_reason,
  proposed_extension_sent,
  proposed_extension_accepted,
  manual_extension_granted,
  total_players_count,
  total_matches_count,
  total_challenges_count,
  dashboard_login_count,
  invitations_sent_count
FROM clubs
WHERE id = 'votre-club-id';
```

### Simuler le jour 12
```sql
UPDATE clubs
SET trial_start_date = NOW() - INTERVAL '12 days',
    trial_base_end_date = NOW() + INTERVAL '2 days',
    trial_current_end_date = NOW() + INTERVAL '2 days'
WHERE id = 'votre-club-id';
```

### Réinitialiser un essai pour tester
```sql
UPDATE clubs
SET 
  trial_start_date = NOW(),
  trial_base_end_date = NOW() + INTERVAL '14 days',
  trial_current_end_date = NOW() + INTERVAL '14 days',
  trial_status = 'active',
  auto_extension_unlocked = false,
  auto_extension_reason = NULL,
  proposed_extension_sent = false,
  proposed_extension_accepted = NULL,
  manual_extension_granted = false
WHERE id = 'votre-club-id';
```

---

## 📝 Checklist de test complète

- [ ] Test 1 : Essai de base (14 jours)
- [ ] Test 2 : Extension automatique (10 joueurs)
- [ ] Test 3 : Extension automatique (20 matchs)
- [ ] Test 4 : Extension automatique (5 connexions au dashboard)
- [ ] Test 5 : Extension proposée (jour 12)
- [ ] Test 6 : Acceptation extension proposée
- [ ] Test 7 : Extension manuelle (admin)
- [ ] Test 8 : Calcul jours restants
- [ ] Test 9 : Expiration essai
- [ ] Test 10 : Score d'engagement

---

## 🚨 Points d'attention

1. **Triggers SQL** : Les compteurs de joueurs et matchs sont mis à jour automatiquement, mais les challenges doivent être comptés via le code TypeScript (Storage)

2. **Vérification quotidienne** : Configurer un cron job pour appeler `/api/trial/check-extensions` quotidiennement

3. **Emails** : Les emails ne sont pas encore implémentés, mais les hooks sont prêts

4. **Dashboard admin** : L'interface admin pour les extensions manuelles n'est pas encore créée

5. **Compatibilité** : Le système utilise `trial_current_end_date` au lieu de `trial_end_date` pour gérer les extensions

---

## 📚 Fichiers clés

- `TRIAL_HYBRID_SYSTEM_MIGRATION.sql` - Migration SQL
- `lib/trial-hybrid.ts` - Fonctions utilitaires
- `app/api/trial/check-extensions/route.ts` - Vérification automatique
- `app/api/trial/accept-proposed/route.ts` - Acceptation extension proposée
- `app/api/trial/manual-extension/route.ts` - Extension manuelle
- `lib/hooks/use-trial-engagement.ts` - Hooks pour mettre à jour les métriques

