-- =====================================================
-- SCRIPT SQL POUR FORCER LA CORRECTION DE TOUS LES CLUBS
-- AVEC EXTENSION AUTOMATIQUE
-- =====================================================
--
-- Ce script force la mise à jour de TOUS les clubs qui ont
-- auto_extension_unlocked = TRUE, même s'ils ont déjà 30 jours.
-- Utile pour forcer la synchronisation.
--
-- À exécuter dans Supabase SQL Editor ou via psql
-- =====================================================

-- 1. Identifier TOUS les clubs avec extension automatique débloquée
WITH clubs_to_fix AS (
  SELECT 
    id,
    name,
    trial_start_date,
    trial_current_end_date,
    auto_extension_unlocked,
    stripe_subscription_id
  FROM clubs
  WHERE 
    auto_extension_unlocked = TRUE
    AND trial_start_date IS NOT NULL
)
-- 2. Mettre à jour trial_current_end_date ET trial_end_date pour TOUS ces clubs
--    (force la mise à jour même si déjà à 30 jours)
UPDATE clubs
SET 
  trial_current_end_date = trial_start_date + INTERVAL '30 days',
  trial_end_date = trial_start_date + INTERVAL '30 days', -- Compatibilité
  trial_status = 'extended_auto'
WHERE id IN (
  SELECT id FROM clubs_to_fix
);

-- 3. Afficher les clubs corrigés pour vérification
SELECT 
  id,
  name,
  trial_start_date,
  trial_current_end_date,
  trial_end_date,
  EXTRACT(DAY FROM (trial_current_end_date - trial_start_date)) as total_trial_days,
  auto_extension_unlocked,
  auto_extension_reason,
  stripe_subscription_id,
  subscription_status
FROM clubs
WHERE 
  auto_extension_unlocked = TRUE
  AND trial_start_date IS NOT NULL
ORDER BY trial_start_date DESC;

-- 4. Afficher un message de confirmation
SELECT 
  COUNT(*) as clubs_updated,
  'Clubs avec extension automatique mis à jour à 30 jours' as message
FROM clubs
WHERE 
  auto_extension_unlocked = TRUE
  AND trial_start_date IS NOT NULL
  AND EXTRACT(DAY FROM (trial_current_end_date - trial_start_date)) >= 29;

