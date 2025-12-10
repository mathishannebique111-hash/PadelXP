-- =====================================================
-- SCRIPT POUR CORRIGER TOUS LES CLUBS AVEC 30 JOURS
-- =====================================================
--
-- Ce script met à jour TOUS les clubs qui ont une durée d'essai
-- de 30 jours (ou proche) pour leur ajouter le flag auto_extension_unlocked
-- et s'assurer que trial_current_end_date est correct.
--
-- À exécuter dans Supabase SQL Editor
-- =====================================================

-- 1. Identifier les clubs avec 30 jours mais sans le flag
WITH clubs_with_30_days AS (
  SELECT 
    id,
    trial_start_date,
    trial_current_end_date,
    trial_end_date,
    EXTRACT(DAY FROM (COALESCE(trial_current_end_date, trial_end_date) - trial_start_date)) as total_days
  FROM clubs
  WHERE 
    trial_start_date IS NOT NULL
    AND EXTRACT(DAY FROM (COALESCE(trial_current_end_date, trial_end_date) - trial_start_date)) >= 29
    AND (auto_extension_unlocked IS NULL OR auto_extension_unlocked = FALSE)
)
-- 2. Mettre à jour ces clubs
UPDATE clubs
SET 
  auto_extension_unlocked = TRUE,
  auto_extension_reason = CASE 
    WHEN total_players_count >= 10 THEN '10_players'
    WHEN total_matches_count >= 20 THEN '20_matches'
    ELSE NULL
  END,
  trial_current_end_date = COALESCE(trial_current_end_date, trial_start_date + INTERVAL '30 days'),
  trial_end_date = COALESCE(trial_end_date, trial_start_date + INTERVAL '30 days'),
  trial_status = 'extended_auto'
WHERE id IN (
  SELECT id FROM clubs_with_30_days
);

-- 3. Afficher les clubs corrigés
SELECT 
  id,
  name,
  trial_start_date,
  trial_current_end_date,
  EXTRACT(DAY FROM (trial_current_end_date - trial_start_date)) as total_trial_days,
  auto_extension_unlocked,
  auto_extension_reason,
  total_players_count,
  total_matches_count,
  stripe_subscription_id
FROM clubs
WHERE 
  auto_extension_unlocked = TRUE
  AND trial_start_date IS NOT NULL
ORDER BY trial_start_date DESC;

