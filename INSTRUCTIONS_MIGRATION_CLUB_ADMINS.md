# Migration : Table club_admins

## Instructions pour exécuter la migration

### Étape 1 : Exécuter le SQL dans Supabase

1. Connectez-vous à votre projet Supabase : https://app.supabase.com
2. Allez dans **SQL Editor** (dans le menu latéral)
3. Créez une nouvelle requête
4. Copiez le contenu du fichier `supabase/migrations/create_club_admins_table.sql`
5. Exécutez la requête (bouton "Run")

### Étape 2 : Vérifier la création de la table

Exécutez cette requête pour vérifier :

```sql
SELECT * FROM club_admins LIMIT 10;
```

### Étape 3 : Migration des propriétaires existants (IMPORTANT)

Si vous avez déjà des clubs existants, vous devez ajouter les propriétaires actuels dans la table `club_admins`. 

Exécutez ce script SQL :

```sql
-- Insérer les propriétaires existants dans club_admins
INSERT INTO club_admins (club_id, user_id, email, role)
SELECT 
  COALESCE(p.club_id, (u.raw_user_meta_data->>'club_id')::text) as club_id,
  u.id as user_id,
  u.email,
  'owner' as role
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE 
  u.email IS NOT NULL
  AND (
    p.club_id IS NOT NULL 
    OR u.raw_user_meta_data->>'club_id' IS NOT NULL
  )
  AND u.raw_user_meta_data->>'role' IS NULL -- Seulement les propriétaires, pas les joueurs
ON CONFLICT (club_id, user_id) DO NOTHING;
```

### Fonctionnalités activées

✅ Les administrateurs existants apparaissent dans "Rôles et accès"
✅ Les nouveaux administrateurs invités reçoivent un email
✅ Les admins invités peuvent se connecter via la page connexion club
✅ Les admins invités ont accès à toutes les fonctionnalités du dashboard
✅ La liste des administrateurs est affichée dans la page "Rôles et accès"

### Vérification

Après la migration, vérifiez que :
1. Votre email apparaît dans "Rôles et accès" en tant que propriétaire
2. Vous pouvez inviter d'autres administrateurs
3. Les administrateurs invités peuvent se connecter

### Rollback (en cas de problème)

Si vous devez annuler la migration :

```sql
DROP TABLE IF EXISTS club_admins CASCADE;
```

⚠️ **Attention** : Cela supprimera toutes les données des administrateurs invités !

