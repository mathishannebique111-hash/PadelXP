-- =====================================================
-- SCRIPT DE DIAGNOSTIC COMPLET POUR TOUS LES CLUBS
-- =====================================================
--
-- Ce script affiche TOUS les clubs avec leurs informations d'essai
-- pour identifier le problème d'affichage.
--
-- À exécuter dans Supabase SQL Editor
-- =====================================================

-- Afficher TOUS les clubs avec leurs informations d'essai
SELECT 
  id,
  name,
  email,
  trial_start_date,
  trial_end_date,
  trial_current_end_date,
  trial_base_end_date,
  CASE 
    WHEN trial_start_date IS NOT NULL AND trial_current_end_date IS NOT NULL 
    THEN EXTRACT(DAY FROM (trial_current_end_date - trial_start_date))
    ELSE NULL
  END as total_trial_days_current,
  CASE 
    WHEN trial_start_date IS NOT NULL AND trial_end_date IS NOT NULL 
    THEN EXTRACT(DAY FROM (trial_end_date - trial_start_date))
    ELSE NULL
  END as total_trial_days_old,
  auto_extension_unlocked,
  auto_extension_reason,
  trial_status,
  stripe_subscription_id,
  subscription_status,
  selected_plan
FROM clubs
WHERE 
  trial_start_date IS NOT NULL
ORDER BY trial_start_date DESC
LIMIT 50;

