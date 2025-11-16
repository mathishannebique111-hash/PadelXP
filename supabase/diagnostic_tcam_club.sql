-- ============================================
-- DIAGNOSTIC: Vérifier les données du club TCAM
-- ============================================
-- Exécutez ce script dans Supabase SQL Editor pour diagnostiquer le problème

-- 1. Vérifier si le club TCAM existe
SELECT 
  'CLUB INFO' as section,
  id, 
  name, 
  slug, 
  logo_url,
  code_invitation,
  status,
  created_at
FROM clubs 
WHERE slug ILIKE '%tcam%' OR name ILIKE '%tcam%'
LIMIT 5;

-- 2. Vérifier les profils associés au club TCAM
SELECT 
  'PROFILES FOR TCAM' as section,
  p.id,
  p.display_name,
  p.email,
  p.club_id,
  p.club_slug
FROM profiles p
WHERE p.club_slug ILIKE '%tcam%' 
   OR p.club_id IN (SELECT id FROM clubs WHERE slug ILIKE '%tcam%' OR name ILIKE '%tcam%')
LIMIT 10;

-- 3. Vérifier les administrateurs du club TCAM
SELECT 
  'CLUB ADMINS FOR TCAM' as section,
  ca.user_id,
  ca.email,
  ca.role,
  ca.club_id,
  ca.activated_at,
  c.name as club_name,
  c.slug as club_slug
FROM club_admins ca
JOIN clubs c ON ca.club_id = c.id
WHERE c.slug ILIKE '%tcam%' OR c.name ILIKE '%tcam%'
LIMIT 10;

-- 4. Vérifier les politiques RLS sur la table clubs
SELECT 
  'RLS POLICIES ON CLUBS' as section,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'clubs';

-- 5. Vérifier les politiques RLS sur la table club_admins
SELECT 
  'RLS POLICIES ON CLUB_ADMINS' as section,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'club_admins';

-- 6. Vérifier si le fichier JSON des infos publiques existe
SELECT 
  'PUBLIC INFO FILES' as section,
  c.id as club_id,
  c.name as club_name,
  c.slug as club_slug,
  'Vérifier manuellement dans Storage > club-public-info > ' || c.id || '.json' as file_location
FROM clubs c
WHERE c.slug ILIKE '%tcam%' OR c.name ILIKE '%tcam%';









