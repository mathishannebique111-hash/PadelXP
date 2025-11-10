-- ⚠️ SCRIPT CORRIGÉ : Migrer UNIQUEMENT les propriétaires de clubs existants
-- Ce script ne migre QUE les utilisateurs avec role='owner' dans leurs métadonnées

-- ÉTAPE 1 : Supprimer toutes les entrées incorrectes (joueurs qui ont été ajoutés par erreur)
TRUNCATE TABLE club_admins;

-- ÉTAPE 2 : Insérer UNIQUEMENT les vrais propriétaires de clubs
INSERT INTO club_admins (club_id, user_id, email, role)
SELECT 
  COALESCE(p.club_id::text, u.raw_user_meta_data->>'club_id') as club_id,
  u.id as user_id,
  u.email,
  'owner' as role
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE 
  u.email IS NOT NULL
  -- ✅ FILTRE CRITIQUE : Ne prendre QUE les propriétaires de clubs
  -- Les propriétaires ont "role": "owner" dans raw_user_meta_data
  AND u.raw_user_meta_data->>'role' = 'owner'
  AND (
    p.club_id IS NOT NULL 
    OR u.raw_user_meta_data->>'club_id' IS NOT NULL
  )
ON CONFLICT (club_id, user_id) DO NOTHING;

-- ÉTAPE 3 : Vérifier le résultat (devrait afficher UNIQUEMENT les propriétaires)
SELECT 
  ca.club_id, 
  ca.email, 
  ca.role, 
  ca.invited_at,
  u.raw_user_meta_data->>'role' as metadata_role,
  u.raw_user_meta_data->>'full_name' as full_name
FROM club_admins ca
JOIN auth.users u ON u.id = ca.user_id
ORDER BY ca.invited_at DESC;

-- ✅ Si la requête ci-dessus affiche uniquement les propriétaires (pas les joueurs), c'est correct !

