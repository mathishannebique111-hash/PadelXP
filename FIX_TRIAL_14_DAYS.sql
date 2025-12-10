-- =====================================================
-- SCRIPT DE CORRECTION : Forcer les essais à 14 jours
-- =====================================================
-- 
-- Ce script corrige les clubs qui ont un essai de 30 jours
-- pour les mettre à 14 jours (nouveau système)
--
-- À exécuter dans Supabase SQL Editor
-- =====================================================

-- 1. Corriger les clubs qui ont trial_end_date à 30 jours
--    en le mettant à 14 jours depuis trial_start_date
UPDATE clubs
SET 
  trial_end_date = trial_start_date + INTERVAL '14 days'
WHERE 
  trial_start_date IS NOT NULL
  AND trial_end_date IS NOT NULL
  AND trial_end_date = trial_start_date + INTERVAL '30 days';

-- 2. Si les nouveaux champs existent, les mettre à jour aussi
UPDATE clubs
SET 
  trial_base_end_date = COALESCE(trial_base_end_date, trial_start_date + INTERVAL '14 days'),
  trial_current_end_date = COALESCE(
    trial_current_end_date,
    trial_base_end_date,
    trial_end_date,
    trial_start_date + INTERVAL '14 days'
  )
WHERE 
  trial_start_date IS NOT NULL
  AND (trial_base_end_date IS NULL OR trial_current_end_date IS NULL);

-- 3. Vérifier les résultats
SELECT 
  id,
  name,
  trial_start_date,
  trial_end_date,
  trial_base_end_date,
  trial_current_end_date,
  trial_status,
  CASE 
    WHEN trial_end_date IS NOT NULL AND trial_start_date IS NOT NULL 
    THEN EXTRACT(DAY FROM (trial_end_date - trial_start_date))
    ELSE NULL
  END as jours_essai
FROM clubs
WHERE trial_start_date IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

