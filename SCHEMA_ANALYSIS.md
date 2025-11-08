# 🔍 Analyse du Schéma de la Table `matches`

## ❌ Erreur actuelle
```
"Could not find the 'players_hash' column of 'matches' in the schema cache"
```

## 📋 Code actuel de l'insertion (app/api/matches/submit/route.ts)

```typescript
// Ligne 108-115
const { data: match, error: e1 } = await supabase
  .from("matches")
  .insert({ 
    winner_team: Number(winner), 
    score: scoreString
    // ✅ Pas de players_hash ici
  })
  .select("id")
  .single();
```

**Le code n'utilise PAS `players_hash` dans l'insertion !**

## 🔍 Hypothèses sur la cause

L'erreur persiste malgré la suppression du code, ce qui suggère :

1. **Cache Supabase** : Le schéma peut être mis en cache côté client Supabase
2. **Trigger/Fonction SQL** : Un trigger ou une fonction pourrait référencer `players_hash`
3. **Vue matérialisée** : Une vue pourrait inclure `players_hash`
4. **Contrainte CHECK** : Une contrainte pourrait vérifier `players_hash`

## ✅ Solution : Script SQL de correction

Deux options :

### Option 1 : Créer la colonne `players_hash` (RECOMMANDÉ)

Si vous voulez garder la fonctionnalité de détection de doublons :

```sql
-- Voir fix_matches_schema.sql
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS players_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_matches_players_hash ON public.matches(players_hash);
```

### Option 2 : Supprimer complètement `players_hash`

Si vous ne voulez pas cette colonne :

```sql
DROP INDEX IF EXISTS idx_matches_players_hash;
ALTER TABLE public.matches DROP COLUMN IF EXISTS players_hash;
```

## 📝 Étapes pour vérifier le schéma réel

1. **Dans Supabase Dashboard :**
   - Allez dans Table Editor → Table `matches`
   - Liste toutes les colonnes visibles
   - Notez les colonnes existantes

2. **Exécutez cette requête SQL dans Supabase :**
   ```sql
   SELECT 
     column_name, 
     data_type, 
     is_nullable,
     column_default
   FROM information_schema.columns 
   WHERE table_schema = 'public' 
     AND table_name = 'matches'
   ORDER BY ordinal_position;
   ```

3. **Vérifiez les triggers :**
   ```sql
   SELECT 
     trigger_name,
     event_manipulation,
     action_statement
   FROM information_schema.triggers
   WHERE event_object_table = 'matches';
   ```

## 🎯 Colonnes minimales attendues pour `matches`

Basé sur le code actuel, la table `matches` doit avoir au minimum :

- `id` (UUID, PRIMARY KEY)
- `winner_team` (INTEGER ou SMALLINT)
- `score` (TEXT ou VARCHAR)
- `created_at` (TIMESTAMPTZ, automatique)

Optionnel :
- `players_hash` (TEXT) - seulement si créée
- `status` (TEXT) - pour le système de confirmation
- `confirmed_at` (TIMESTAMPTZ)
- `league_id` (UUID, nullable)

## ✅ Action immédiate

**Exécutez le script `fix_matches_schema.sql` dans Supabase SQL Editor**

Cela créera la colonne `players_hash` si elle n'existe pas, ce qui devrait résoudre l'erreur.

