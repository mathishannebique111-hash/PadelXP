# SYSTÈME DE CHAT INTERNE JOUEUR ↔ ADMIN

## 📋 CHECKLIST D'INSTALLATION

### ÉTAPE 1 : MARQUER LE COMPTE ADMIN

Exécuter dans **Supabase SQL Editor** :

```sql
-- 1. Récupérer l'UUID du compte admin
SELECT id, email FROM auth.users WHERE email = 'contactpadelxp@gmail.com';

-- 2. COPIER L'UUID RETOURNÉ et l'utiliser dans la commande suivante :
-- REMPLACER 'REMPLACER-PAR-UUID-DU-COMPTE-ADMIN' par l'UUID réel
UPDATE profiles 
SET is_admin = true 
WHERE id = 'REMPLACER-PAR-UUID-DU-COMPTE-ADMIN';

-- 3. Vérifier que ça a fonctionné :
SELECT p.id, p.email, p.is_admin 
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'contactpadelxp@gmail.com';
-- Devrait retourner is_admin = true
```

### ÉTAPE 2 : CRÉER LES TABLES ET RLS

Exécuter le fichier SQL complet :
- **Fichier** : `supabase/migrations/create_support_chat_system.sql`

Ce fichier crée :
- ✅ Table `conversations` (une par joueur)
- ✅ Table `messages` (contenu des échanges)
- ✅ Fonction trigger pour mettre à jour automatiquement les conversations
- ✅ Row Level Security (RLS) pour joueurs et admin
- ✅ Vue `admin_conversations_view` pour l'interface admin
- ✅ Index pour optimiser les performances

### ÉTAPE 3 : ACTIVER REALTIME (IMPORTANT)

Dans **Supabase Dashboard** → **Database** → **Replication** :

1. Activer la réplication pour la table `conversations`
2. Activer la réplication pour la table `messages`

Ou exécuter dans **Supabase SQL Editor** (nécessite privilèges superuser) :

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

### ÉTAPE 4 : VÉRIFIER LES FICHIERS CRÉÉS

✅ **Migrations SQL** : `supabase/migrations/create_support_chat_system.sql`
✅ **API Route** : `app/api/messages/send/route.ts`
✅ **Interface Joueur** : `app/(protected)/contact/page.tsx`
✅ **Interface Admin** : `app/(admin)/admin/messages/page.tsx`
✅ **Layout Admin** : `app/(admin)/layout.tsx`
✅ **Lien Navigation** : Ajouté dans `components/PlayerSidebar.tsx`

## 🎯 FONCTIONNALITÉS IMPLÉMENTÉES

### Côté Joueur (`/contact`)
- ✅ Interface de chat mobile-first
- ✅ Création automatique de conversation au premier message
- ✅ Messages en temps réel (Supabase Realtime)
- ✅ Affichage des messages admin/joueur différenciés
- ✅ Marquage automatique des messages comme lus

### Côté Admin (`/admin/messages`)
- ✅ Dashboard desktop-first avec 2 colonnes
- ✅ Liste des conversations avec :
  - Avatar + Nom + Prénom + Club
  - Badge "non lu" pour messages non lus
  - Aperçu du dernier message
- ✅ Filtrage par club
- ✅ Recherche par nom/email/club
- ✅ Messages en temps réel
- ✅ Compteur de conversations non lues
- ✅ Lien "Voir profil" vers le profil joueur

## 🔒 SÉCURITÉ

- ✅ **RLS activé** : Les joueurs ne voient que leur conversation
- ✅ **Admin uniquement** : Layout admin vérifie `is_admin = true`
- ✅ **Validation** : Messages non vides uniquement
- ✅ **Protection routes** : Redirection si non-admin tente d'accéder à `/admin/*`

## 🧪 TESTS À EFFECTUER

1. **Test joueur** :
   - Se connecter comme joueur
   - Aller sur `/contact`
   - Envoyer un message
   - Vérifier que la conversation est créée

2. **Test admin** :
   - Se connecter avec `contactpadelxp@gmail.com`
   - Aller sur `/admin/messages`
   - Voir la conversation du joueur
   - Répondre au message
   - Vérifier que le message arrive en temps réel côté joueur

3. **Test filtrage** :
   - Admin : Filtrer par club
   - Admin : Rechercher un joueur par nom

4. **Test temps réel** :
   - Ouvrir 2 onglets (joueur + admin)
   - Envoyer un message depuis l'un
   - Vérifier qu'il apparaît instantanément dans l'autre

## 📝 NOTES IMPORTANTES

- ⚠️ **Realtime** : Doit être activé dans Supabase Dashboard pour que les messages en temps réel fonctionnent
- ⚠️ **Admin account** : Le compte `contactpadelxp@gmail.com` doit exister et être marqué `is_admin = true`
- ⚠️ **Club ID** : Si un joueur n'a pas de `club_id`, une valeur par défaut est utilisée (`00000000-0000-0000-0000-000000000000`)

## 🐛 DÉPANNAGE

**Problème** : Les messages ne s'affichent pas en temps réel
- **Solution** : Vérifier que Realtime est activé pour `conversations` et `messages` dans Supabase Dashboard

**Problème** : L'admin ne voit pas les conversations
- **Solution** : Vérifier que `is_admin = true` dans la table `profiles` pour le compte admin

**Problème** : Erreur 403 lors de l'accès à `/admin/messages`
- **Solution** : Vérifier que le compte connecté a `is_admin = true`
