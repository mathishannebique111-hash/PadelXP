-- =====================================================
-- SCRIPT POUR TROUVER LES CLUBS QUI ONT 30 JOURS
-- MAIS PAS LE FLAG auto_extension_unlocked
-- =====================================================
--
-- Ce script identifie les clubs qui ont déjà une durée d'essai
-- de 30 jours (ou proche) mais qui n'ont pas le flag auto_extension_unlocked.
-- Ces clubs doivent être mis à jour.
--
-- À exécuter dans Supabase SQL Editor
-- =====================================================

-- 1. Trouver les clubs qui ont 30 jours d'essai mais pas le flag
SELECT 
  id,
  name,
  email,
  trial_start_date,
  trial_end_date,
  trial_current_end_date,
  EXTRACT(DAY FROM (COALESCE(trial_current_end_date, trial_end_date) - trial_start_date)) as total_trial_days,
  auto_extension_unlocked,
  auto_extension_reason,
  trial_status,
  total_players_count,
  total_matches_count,
  stripe_subscription_id
FROM clubs
WHERE 
  trial_start_date IS NOT NULL
  AND (
    -- Clubs avec 30 jours (ou proche) mais pas le flag
    (
      EXTRACT(DAY FROM (COALESCE(trial_current_end_date, trial_end_date) - trial_start_date)) >= 29
      AND (auto_extension_unlocked IS NULL OR auto_extension_unlocked = FALSE)
    )
    OR
    -- Clubs qui ont atteint les objectifs (10 joueurs ou 20 matchs) mais pas le flag
    (
      (total_players_count >= 10 OR total_matches_count >= 20)
      AND (auto_extension_unlocked IS NULL OR auto_extension_unlocked = FALSE)
      AND trial_start_date IS NOT NULL
      AND EXTRACT(DAY FROM (NOW() - trial_start_date)) <= 14 -- Dans les 14 premiers jours
    )
  )
ORDER BY trial_start_date DESC;

