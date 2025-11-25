-- ============================================
-- MISE À JOUR SIMPLE DU CLUB PADEL ROUEN
-- ============================================
-- Version simplifiée pour mettre à jour directement
-- Exécutez ce script dans Supabase SQL Editor

-- ÉTAPE 1 : Vérifier quel club correspond à "padel rouen"
SELECT 
  id,
  name,
  slug,
  code_invitation,
  postal_code,
  city
FROM clubs
WHERE LOWER(name) LIKE '%padel%rouen%' 
   OR LOWER(slug) LIKE '%rouen%'
   OR LOWER(name) LIKE '%rouen%'
ORDER BY created_at DESC;

-- ÉTAPE 2 : Une fois que vous avez identifié le bon club, 
-- remplacez 'CLUB_ID_ICI' par l'ID réel du club et ajustez les valeurs ci-dessous

-- Exemple de mise à jour (décommentez et modifiez selon vos besoins) :
/*
UPDATE clubs
SET 
  name = 'Padel Rouen',                    -- Nouveau nom du club
  code_invitation = 'PADELROUEN76000',     -- Code = nom en majuscules sans espaces + code postal
  postal_code = '76000',                   -- Code postal (5 chiffres)
  updated_at = NOW()
WHERE id = 'CLUB_ID_ICI';                  -- Remplacez par l'ID réel du club

-- Vérifier le résultat
SELECT 
  id,
  name,
  slug,
  code_invitation,
  postal_code,
  updated_at
FROM clubs
WHERE id = 'CLUB_ID_ICI';
*/

