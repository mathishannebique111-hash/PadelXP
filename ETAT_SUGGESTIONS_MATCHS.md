# ÉTAT ACTUEL : SYSTÈME DE SUGGESTIONS DE PAIRES POUR MATCHS

## 📋 RÉSUMÉ EXÉCUTIF

Le système de suggestions de paires pour des matchs est **partiellement implémenté** :
- ✅ **Infrastructure backend** : Table `match_proposals`, APIs, migrations SQL
- ✅ **Page frontend** : `/find-match` existe
- ⚠️ **État fonctionnel** : À vérifier (peut nécessiter des ajustements)

---

## ✅ CE QUI EST EN PLACE

### 1. **Base de données** (`create_partnerships_and_match_proposals.sql`)

**Table `match_proposals`** :
- ✅ Structure créée avec :
  - `proposer_player1_id`, `proposer_player2_id` (l'équipe qui propose)
  - `challenged_player1_id`, `challenged_player2_id` (l'équipe challengée)
  - `status` : 'pending', 'accepted_by_p1', 'accepted_by_p2', 'accepted', 'declined', 'expired'
  - `match_date`, `club_id`, `message`
  - `expires_at` (7 jours par défaut)
- ✅ Index créés
- ✅ RLS policies configurées
- ✅ Triggers pour notifications

**Vue `suggested_pairs`** :
- ✅ Vue SQL créée pour suggérer des paires de joueurs
- ✅ Utilise `niveau_padel` directement
- ✅ Filtre par club et niveau (différence max 2.0)
- ✅ Score de compatibilité calculé

### 2. **APIs Backend**

**`/api/match-proposals/create`** :
- ✅ Route créée
- ✅ Validation des données
- ✅ Vérifie que le joueur a un partenaire accepté
- ✅ Vérifie que les joueurs challengés sont distincts
- ✅ Crée la proposition de match

**`/api/match-proposals/respond`** :
- ✅ Route créée
- ✅ Gère les réponses (accepter/refuser)
- ✅ Gère les acceptations partielles (accepted_by_p1, accepted_by_p2)
- ✅ Met à jour le statut

### 3. **Page Frontend**

**`/find-match`** (`app/(protected)/find-match/page.tsx`) :
- ✅ Page créée
- ✅ Récupère le partenaire habituel de l'utilisateur
- ✅ Récupère les paires suggérées depuis la vue `suggested_pairs`
- ✅ Affiche les paires dans une liste
- ✅ Modal pour proposer un match
- ✅ Bouton pour proposer un match à une paire

---

## ⚠️ CE QUI EST À VÉRIFIER

### 1. **Vue `suggested_pairs`**
- ⚠️ **Problème potentiel** : La vue dans `create_partnerships_and_match_proposals.sql` est simplifiée
- ⚠️ Elle utilise directement `niveau_padel` (pas de calcul de statistiques)
- ✅ **Solution** : La vue complète avec statistiques est dans `improve_partner_suggestions.sql`
- ⚠️ **Note** : Deux vues `suggested_pairs` peuvent exister (dans `create_partnerships_and_match_proposals.sql` et `improve_partner_suggestions.sql`)
- ⚠️ La dernière vue créée écrase la précédente

### 2. **Intégration Frontend**
- ⚠️ La page `/find-match` utilise la vue `suggested_pairs`
- ⚠️ Doit vérifier quelle vue est utilisée (simplifiée ou complète)
- ⚠️ Doit vérifier que les données correspondent au format attendu

### 3. **Workflow complet**
- ⚠️ **Workflow attendu** :
  1. Joueur A + Partenaire habituel de A → voient des paires suggérées
  2. Ils proposent un match à une paire (Joueur C + Joueur D)
  3. Joueur C et D reçoivent une notification
  4. Chacun peut accepter/refuser
  5. Si les deux acceptent → match créé (ou statut 'accepted')
- ⚠️ **À vérifier** : Le workflow complet fonctionne-t-il de bout en bout ?

---

## 🔍 POINTS DE VÉRIFICATION

### 1. Migration SQL exécutée ?
```sql
-- Vérifier si la table existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'match_proposals'
);
```

### 2. Vue `suggested_pairs` active ?
```sql
-- Vérifier quelle vue est active
SELECT view_definition 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name = 'suggested_pairs';
```

### 3. APIs fonctionnent ?
- Tester `/api/match-proposals/create`
- Tester `/api/match-proposals/respond`
- Vérifier les logs serveur

### 4. Page `/find-match` accessible ?
- Vérifier que la page s'affiche
- Vérifier que les paires suggérées s'affichent
- Vérifier que le modal de proposition fonctionne

---

## 🎯 PROCHAINES ÉTAPES RECOMMANDÉES

1. **Vérifier l'état de la base de données**
   - Table `match_proposals` existe ?
   - Vue `suggested_pairs` existe et est correcte ?

2. **Tester le workflow complet**
   - Se connecter avec un compte joueur A (avec partenaire)
   - Aller sur `/find-match`
   - Vérifier que les paires s'affichent
   - Proposer un match
   - Se connecter avec un compte challengé
   - Vérifier la notification
   - Accepter/refuser

3. **Vérifier les notifications**
   - Les triggers SQL créent-ils des notifications ?
   - Les notifications s'affichent-elles dans l'interface ?

4. **Corriger si nécessaire**
   - Si la vue `suggested_pairs` est simplifiée → utiliser celle de `improve_partner_suggestions.sql`
   - Si les APIs ne fonctionnent pas → vérifier les logs
   - Si la page ne s'affiche pas → vérifier les erreurs frontend

---

## 📝 NOTES IMPORTANTES

- **Deux systèmes de suggestions** :
  - `suggested_partners` : Pour trouver un partenaire habituel (utilisé dans l'onglet "Mon profil padel")
  - `suggested_pairs` : Pour trouver des paires pour proposer un match (utilisé dans `/find-match`)

- **Workflow différent** :
  - **Partenaire habituel** : 1 joueur → propose à 1 autre joueur → devient partenaire
  - **Proposition de match** : 1 paire (2 joueurs) → propose un match à 1 autre paire (2 joueurs) → match créé si accepté

- **Dépendances** :
  - Le système de propositions de match nécessite que les joueurs aient un **partenaire habituel accepté**
  - Si un joueur n'a pas de partenaire habituel, il ne peut pas proposer de match
