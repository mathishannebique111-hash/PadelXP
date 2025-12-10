-- =====================================================
-- SCRIPT DE DIAGNOSTIC POUR LES EXTENSIONS AUTOMATIQUES
-- =====================================================
--
-- Ce script permet de diagnostiquer pourquoi les cadres
-- n'affichent pas correctement la durée de l'essai.
--
-- À exécuter dans Supabase SQL Editor
-- =====================================================

-- 1. Vérifier les clubs avec extension automatique
SELECT 
  id,
  name,
  trial_start_date,
  trial_end_date,
  trial_current_end_date,
  trial_base_end_date,
  EXTRACT(DAY FROM (trial_current_end_date - trial_start_date)) as total_trial_days_current,
  EXTRACT(DAY FROM (trial_end_date - trial_start_date)) as total_trial_days_old,
  auto_extension_unlocked,
  auto_extension_reason,
  trial_status,
  stripe_subscription_id,
  subscription_status
FROM clubs
WHERE 
  auto_extension_unlocked = TRUE
  AND trial_start_date IS NOT NULL
ORDER BY trial_start_date DESC;

-- 2. Vérifier les clubs qui devraient avoir 30 jours mais n'en ont pas
SELECT 
  id,
  name,
  trial_start_date,
  trial_current_end_date,
  EXTRACT(DAY FROM (trial_current_end_date - trial_start_date)) as total_trial_days,
  auto_extension_unlocked,
  CASE 
    WHEN EXTRACT(DAY FROM (trial_current_end_date - trial_start_date)) < 29 THEN 'À CORRIGER'
    ELSE 'OK'
  END as status
FROM clubs
WHERE 
  auto_extension_unlocked = TRUE
  AND trial_start_date IS NOT NULL
  AND trial_current_end_date IS NOT NULL
ORDER BY trial_start_date DESC;

