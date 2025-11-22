# 📋 Guide d'exécution des migrations SQL

## Scripts SQL à exécuter dans Supabase SQL Editor

Exécutez ces scripts dans l'ordre dans le SQL Editor de Supabase (https://supabase.com/dashboard/project/YOUR_PROJECT/sql)

### ✅ 1. Script principal : Système de conversations pour avis modérés

**Fichier :** `lib/supabase/migrations/create_review_conversations_system.sql`

**À exécuter :** OUI - Ce script est nécessaire pour le système de conversations d'avis modérés

**Ce qu'il fait :**
- Crée la table `review_conversations` pour stocker les conversations liées aux avis modérés
- Crée la table `review_messages` pour stocker les messages échangés
- Configure les RLS policies
- Ajoute les triggers pour mettre à jour `last_message_at`

**Comment l'exécuter :**
1. Ouvrez le fichier `lib/supabase/migrations/create_review_conversations_system.sql`
2. Copiez tout le contenu
3. Allez dans Supabase Dashboard → SQL Editor
4. Collez le script dans l'éditeur
5. Cliquez sur "Run" (ou appuyez sur Ctrl+Enter / Cmd+Enter)

---

### ✅ 2. Script : Ajouter la colonne `is_hidden` aux avis

**Fichier :** `lib/supabase/migrations/add_is_hidden_to_reviews.sql`

**À exécuter :** OUI - Si pas déjà fait

**Ce qu'il fait :**
- Ajoute la colonne `is_hidden` à la table `reviews` pour masquer les avis modérés

**Vérification :**
```sql
-- Vérifier si la colonne existe déjà
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'reviews' 
AND column_name = 'is_hidden';
```

Si la colonne existe déjà, vous pouvez sauter ce script.

---

### ✅ 3. Script : Ajouter la colonne `points` aux profils

**Fichier :** `lib/supabase/migrations/add_points_column_to_profiles.sql`

**À exécuter :** OUI - Si pas déjà fait

**Ce qu'il fait :**
- Ajoute la colonne `points` à la table `profiles` pour stocker les points bonus (comme les 10 points pour le premier avis)

**Vérification :**
```sql
-- Vérifier si la colonne existe déjà
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'points';
```

Si la colonne existe déjà, vous pouvez sauter ce script.

---

### ⚠️ 4. Script : Masquer les avis existants qui doivent être modérés

**Fichier :** `lib/supabase/migrations/hide_existing_moderated_reviews.sql`

**À exécuter :** OPTIONNEL - Seulement si vous voulez masquer les avis existants qui correspondent aux critères de modération

**Ce qu'il fait :**
- Identifie les avis existants avec 3 étoiles ou moins ET 6 mots ou moins
- Les marque comme `is_hidden = TRUE`

**Note :** Ce script est optionnel et ne fait que traiter les avis existants. Les nouveaux avis seront automatiquement traités par le code.

---

## Ordre d'exécution recommandé

1. ✅ `add_is_hidden_to_reviews.sql` (si pas déjà fait)
2. ✅ `add_points_column_to_profiles.sql` (si pas déjà fait)
3. ✅ `create_review_conversations_system.sql` (OBLIGATOIRE)
4. ⚠️ `hide_existing_moderated_reviews.sql` (optionnel)

---

## Vérifications après exécution

### Vérifier que les tables existent :
```sql
-- Vérifier review_conversations
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'review_conversations';

-- Vérifier review_messages
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'review_messages';
```

### Vérifier que les colonnes existent :
```sql
-- Vérifier is_hidden dans reviews
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'reviews' 
AND column_name = 'is_hidden';

-- Vérifier points dans profiles
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'points';
```

---

## En cas d'erreur

Si vous obtenez une erreur du type "table already exists" ou "column already exists", c'est normal. Les scripts utilisent `CREATE TABLE IF NOT EXISTS` et `IF NOT EXISTS`, donc ils sont idempotents (peuvent être exécutés plusieurs fois sans problème).

---

## Résumé

**Script OBLIGATOIRE à exécuter maintenant :**
- `lib/supabase/migrations/create_review_conversations_system.sql`

**Scripts à vérifier/exécuter si pas déjà faits :**
- `lib/supabase/migrations/add_is_hidden_to_reviews.sql`
- `lib/supabase/migrations/add_points_column_to_profiles.sql`

**Script optionnel :**
- `lib/supabase/migrations/hide_existing_moderated_reviews.sql`

