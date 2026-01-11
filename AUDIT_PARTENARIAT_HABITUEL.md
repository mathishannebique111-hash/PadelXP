# AUDIT : SYSTÈME DE PARTENAIRE HABITUEL

## 📋 OBJECTIF
Permettre aux joueurs d'ajouter un "partenaire habituel" avec des demandes qui s'affichent dans l'onglet "Mon profil padel" (pas de pop-up).

## 🔍 ÉTAT ACTUEL

### ✅ Ce qui est en place

1. **Composant Frontend** (`components/mobile/PlayerPartnerCard.tsx`)
   - ✅ Affiche le partenaire accepté
   - ✅ Affiche les demandes en attente (où l'utilisateur est le `partner_id`)
   - ✅ Permet d'ajouter un partenaire avec recherche
   - ✅ Boutons "Accepter" / "Refuser" pour les demandes
   - ✅ Utilise Supabase Realtime pour les mises à jour

2. **API Backend** (`app/api/partnerships/create/route.ts`)
   - ✅ Utilise client admin pour bypass RLS
   - ✅ Vérifie les demandes existantes
   - ✅ Crée la demande de partenariat
   - ✅ Logging détaillé des erreurs

3. **Migration SQL** (`supabase/migrations/create_partnerships_and_match_proposals.sql`)
   - ✅ Crée la table `player_partnerships`
   - ✅ Crée les index nécessaires
   - ✅ Configure les RLS policies
   - ✅ Crée les triggers pour notifications (optionnel)
   - ⚠️ Vue `suggested_pairs` corrigée (utilise `niveau_padel` au lieu de `ps.overall_level`)

### ⚠️ PROBLÈMES RENCONTRÉS

1. **Table `player_partnerships` n'existait pas**
   - ✅ Cause identifiée : migration non exécutée
   - ✅ Solution : Exécuter `create_partnerships_and_match_proposals.sql`

2. **Erreur contrainte CHECK sur `notifications`**
   - ✅ Cause : Types de notifications existants non compatibles avec nouvelle contrainte
   - ✅ Solution : Script `fix_notifications_constraint_violation.sql` créé
   - ⚠️ **STATUT** : À vérifier si exécuté

3. **Erreur SQL dans vue `suggested_pairs`**
   - ✅ Cause : Colonne `ps.overall_level` inexistante
   - ✅ Solution : Vue corrigée pour utiliser `niveau_padel` directement
   - ⚠️ **STATUT** : Fichier modifié, mais migration doit être réexécutée

## 🔴 POINTS DE VÉRIFICATION

### 1. Migration SQL exécutée ?
**Question** : Avez-vous exécuté `create_partnerships_and_match_proposals.sql` avec SUCCÈS dans Supabase SQL Editor ?

**Vérification** :
```sql
-- Dans Supabase SQL Editor, exécuter :
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'player_partnerships'
);
```
- Si retourne `true` → ✅ Table existe
- Si retourne `false` → ❌ Migration non exécutée

### 2. Erreurs SQL actuelles ?
**Question** : Y a-t-il encore des erreurs SQL quand vous exécutez la migration ?

**Erreurs possibles** :
- Contrainte CHECK sur notifications → Exécuter `fix_notifications_constraint_violation.sql` AVANT
- Colonne `ps.overall_level` → ✅ Déjà corrigée dans le fichier
- Autres erreurs → À voir dans les logs Supabase

### 3. RLS Policies configurées ?
**Question** : Les RLS policies sont-elles actives sur `player_partnerships` ?

**Vérification** :
```sql
-- Vérifier si RLS est activé
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'player_partnerships';
```

### 4. API fonctionne-t-elle ?
**Question** : Quand vous cliquez sur "Envoyer la demande", que se passe-t-il ?

**Vérifications** :
- Console navigateur : Y a-t-il des erreurs 500/404 ?
- Logs serveur : Y a-t-il des erreurs dans les logs Next.js ?
- Réponse API : Que retourne l'API `/api/partnerships/create` ?

### 5. Composant charge-t-il les données ?
**Question** : Le composant `PlayerPartnerCard` charge-t-il les données depuis `player_partnerships` ?

**Vérifications** :
- Console navigateur : Y a-t-il des erreurs Supabase ?
- Network tab : Les requêtes vers `player_partnerships` fonctionnent-elles ?
- Affichage : Le composant s'affiche-t-il (même vide) ?

## 🎯 PLAN D'ACTION

### Étape 1 : Vérifier que la migration est exécutée
1. Exécuter la requête SQL de vérification ci-dessus
2. Si la table n'existe pas → Exécuter `create_partnerships_and_match_proposals.sql`

### Étape 2 : Résoudre les erreurs SQL
1. Si erreur contrainte CHECK → Exécuter `fix_notifications_constraint_violation.sql` EN PREMIER
2. Puis réexécuter `create_partnerships_and_match_proposals.sql`
3. Vérifier qu'il n'y a plus d'erreurs

### Étape 3 : Tester l'API
1. Ouvrir la console navigateur (F12)
2. Cliquer sur "Envoyer la demande"
3. Vérifier la réponse dans Network tab
4. Vérifier les logs serveur

### Étape 4 : Vérifier l'affichage
1. Se connecter avec un compte joueur A
2. Ajouter un partenaire (joueur B)
3. Se connecter avec le compte joueur B
4. Aller dans "Mon profil padel"
5. Vérifier que la demande s'affiche

## 📝 RÉSUMÉ

**Ce qui fonctionne** :
- ✅ Code frontend (composant PlayerPartnerCard)
- ✅ Code backend (API partnerships/create)
- ✅ Migration SQL (fichier corrigé)

**Ce qui bloque probablement** :
- ❓ Migration SQL non exécutée ou erreurs lors de l'exécution
- ❓ Table `player_partnerships` n'existe pas dans la base
- ❓ Erreurs RLS ou permissions

**Action immédiate** :
1. Vérifier que la table `player_partnerships` existe (requête SQL ci-dessus)
2. Si non → Exécuter les migrations SQL dans l'ordre :
   - D'abord `fix_notifications_constraint_violation.sql`
   - Puis `create_partnerships_and_match_proposals.sql`
3. Vérifier qu'il n'y a plus d'erreurs SQL
4. Tester l'envoi d'une demande depuis l'interface
