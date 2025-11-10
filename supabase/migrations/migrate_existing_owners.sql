-- Script pour migrer les propriétaires de clubs existants dans la table club_admins
-- Ce script convertit correctement les types UUID et TEXT

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
  AND (
    p.club_id IS NOT NULL 
    OR u.raw_user_meta_data->>'club_id' IS NOT NULL
  )
  -- Ne sélectionner que les comptes clubs (pas les joueurs)
  AND (
    u.raw_user_meta_data->>'role' IS NULL 
    OR u.raw_user_meta_data->>'role' != 'player'
  )
ON CONFLICT (club_id, user_id) DO NOTHING;

-- Vérifier le résultat
SELECT 
  club_id, 
  email, 
  role, 
  invited_at 
FROM club_admins 
ORDER BY invited_at DESC;

