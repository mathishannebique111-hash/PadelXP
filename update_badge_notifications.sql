-- Script pour mettre à jour les notifications de badges existantes
-- Remplace les noms de badges en anglais ou mal formatés par les versions françaises correctes

-- 1. Mettre à jour "Top Scorer" -> "Meilleur scoreur"
UPDATE public.notifications
SET data = jsonb_set(
  data,
  '{badge_name}',
  '"Meilleur scoreur"',
  false
)
WHERE type IN ('badge', 'badge_unlocked')
  AND (data->>'badge_name' = 'Top Scorer' OR LOWER(data->>'badge_name') = 'top scorer');

-- 2. Normaliser "série de 15" -> "Série de 15" (majuscule)
UPDATE public.notifications
SET data = jsonb_set(
  data,
  '{badge_name}',
  '"Série de 15"',
  false
)
WHERE type IN ('badge', 'badge_unlocked')
  AND LOWER(data->>'badge_name') = 'série de 15';

-- 3. Normaliser "série de 20" -> "Série de 20" (majuscule)
UPDATE public.notifications
SET data = jsonb_set(
  data,
  '{badge_name}',
  '"Série de 20"',
  false
)
WHERE type IN ('badge', 'badge_unlocked')
  AND LOWER(data->>'badge_name') = 'série de 20';

-- Vérifier le résultat - Afficher toutes les notifications de badges mises à jour
SELECT 
  id,
  type,
  data->>'badge_name' as badge_name,
  data->>'badge_icon' as badge_icon,
  created_at
FROM public.notifications
WHERE type IN ('badge', 'badge_unlocked')
ORDER BY created_at DESC
LIMIT 20;

-- Statistiques des badges dans les notifications
SELECT 
  data->>'badge_name' as badge_name,
  COUNT(*) as count
FROM public.notifications
WHERE type IN ('badge', 'badge_unlocked')
GROUP BY data->>'badge_name'
ORDER BY count DESC;
