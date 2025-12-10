-- =====================================================
-- SCRIPT SQL COMPLET POUR CORRIGER LES EXTENSIONS AUTOMATIQUES
-- =====================================================
--
-- Ce script :
-- 1. Identifie les clubs avec 30 jours mais sans le flag
-- 2. Affiche l'état actuel de TOUS les clubs
-- 3. Force la mise à jour de TOUS les clubs avec extension automatique
-- 4. Met à jour trial_current_end_date ET trial_end_date
-- 5. Affiche le résultat final
--
-- À exécuter dans Supabase SQL Editor
-- =====================================================

-- ÉTAPE 0 : Identifier les clubs avec 30 jours mais sans le flag
SELECT 
  '=== CLUBS AVEC 30 JOURS MAIS SANS FLAG ===' as step,
  id,
  name,
  trial_start_date,
  trial_end_date,
  trial_current_end_date,
  EXTRACT(DAY FROM (COALESCE(trial_current_end_date, trial_end_date) - trial_start_date)) as total_trial_days,
  auto_extension_unlocked,
  total_players_count,
  total_matches_count
FROM clubs
WHERE 
  trial_start_date IS NOT NULL
  AND EXTRACT(DAY FROM (COALESCE(trial_current_end_date, trial_end_date) - trial_start_date)) >= 29
  AND (auto_extension_unlocked IS NULL OR auto_extension_unlocked = FALSE)
ORDER BY trial_start_date DESC;

-- ÉTAPE 1 : Ajouter le flag aux clubs avec 30 jours
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
WHERE 
  trial_start_date IS NOT NULL
  AND EXTRACT(DAY FROM (COALESCE(trial_current_end_date, trial_end_date) - trial_start_date)) >= 29
  AND (auto_extension_unlocked IS NULL OR auto_extension_unlocked = FALSE);

-- ÉTAPE 2 : Afficher l'état AVANT correction (clubs avec flag)
SELECT 
  '=== ÉTAT AVANT CORRECTION (avec flag) ===' as step,
  id,
  name,
  trial_start_date,
  trial_end_date,
  trial_current_end_date,
  EXTRACT(DAY FROM (COALESCE(trial_current_end_date, trial_end_date) - trial_start_date)) as total_trial_days,
  auto_extension_unlocked,
  trial_status
FROM clubs
WHERE 
  auto_extension_unlocked = TRUE
  AND trial_start_date IS NOT NULL
ORDER BY trial_start_date DESC;

-- ÉTAPE 3 : Mettre à jour TOUS les clubs avec extension automatique
-- Force la mise à jour même si déjà à 30 jours (pour synchroniser trial_end_date)
UPDATE clubs
SET 
  trial_current_end_date = trial_start_date + INTERVAL '30 days',
  trial_end_date = trial_start_date + INTERVAL '30 days',
  trial_status = 'extended_auto'
WHERE 
  auto_extension_unlocked = TRUE
  AND trial_start_date IS NOT NULL;

-- ÉTAPE 4 : Afficher l'état APRÈS correction
SELECT 
  '=== ÉTAT APRÈS CORRECTION ===' as step,
  id,
  name,
  trial_start_date,
  trial_end_date,
  trial_current_end_date,
  EXTRACT(DAY FROM (trial_current_end_date - trial_start_date)) as total_trial_days,
  auto_extension_unlocked,
  auto_extension_reason,
  trial_status,
  stripe_subscription_id
FROM clubs
WHERE 
  auto_extension_unlocked = TRUE
  AND trial_start_date IS NOT NULL
ORDER BY trial_start_date DESC;

-- ÉTAPE 5 : Résumé final
SELECT 
  COUNT(*) as total_clubs_with_extension,
  COUNT(CASE WHEN EXTRACT(DAY FROM (trial_current_end_date - trial_start_date)) >= 29 THEN 1 END) as clubs_with_30_days,
  COUNT(CASE WHEN EXTRACT(DAY FROM (trial_current_end_date - trial_start_date)) < 29 THEN 1 END) as clubs_to_fix,
  COUNT(CASE WHEN stripe_subscription_id IS NOT NULL THEN 1 END) as clubs_with_stripe_subscription
FROM clubs
WHERE 
  auto_extension_unlocked = TRUE
  AND trial_start_date IS NOT NULL;

