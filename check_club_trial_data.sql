-- =====================================================
-- SCRIPT POUR VÉRIFIER LES DONNÉES D'ESSAI D'UN CLUB
-- =====================================================
--
-- Remplacez 'CLUB_EMAIL_OU_ID' par l'email ou l'ID du club à vérifier
-- Exécutez ce script dans Supabase SQL Editor
-- =====================================================

-- Option 1 : Rechercher par email
-- SELECT 
--   id,
--   name,
--   email,
--   trial_start_date,
--   trial_end_date,
--   trial_current_end_date,
--   trial_base_end_date,
--   EXTRACT(DAY FROM (COALESCE(trial_current_end_date, trial_end_date) - trial_start_date)) as total_trial_days,
--   auto_extension_unlocked,
--   auto_extension_reason,
--   trial_status,
--   total_players_count,
--   total_matches_count,
--   subscription_status,
--   selected_plan,
--   stripe_subscription_id
-- FROM clubs
-- WHERE email = 'CLUB_EMAIL_OU_ID';

-- Option 2 : Rechercher par ID
-- SELECT 
--   id,
--   name,
--   email,
--   trial_start_date,
--   trial_end_date,
--   trial_current_end_date,
--   trial_base_end_date,
--   EXTRACT(DAY FROM (COALESCE(trial_current_end_date, trial_end_date) - trial_start_date)) as total_trial_days,
--   auto_extension_unlocked,
--   auto_extension_reason,
--   trial_status,
--   total_players_count,
--   total_matches_count,
--   subscription_status,
--   selected_plan,
--   stripe_subscription_id
-- FROM clubs
-- WHERE id = 'CLUB_EMAIL_OU_ID'::uuid;

-- Option 3 : Afficher TOUS les clubs avec leurs données d'essai
SELECT 
  id,
  name,
  email,
  trial_start_date,
  trial_end_date,
  trial_current_end_date,
  trial_base_end_date,
  EXTRACT(DAY FROM (COALESCE(trial_current_end_date, trial_end_date) - trial_start_date)) as total_trial_days,
  auto_extension_unlocked,
  auto_extension_reason,
  trial_status,
  total_players_count,
  total_matches_count,
  subscription_status,
  selected_plan,
  stripe_subscription_id,
  -- Calculer les jours restants
  CASE 
    WHEN trial_current_end_date IS NOT NULL THEN
      EXTRACT(DAY FROM (trial_current_end_date - NOW()))
    WHEN trial_end_date IS NOT NULL THEN
      EXTRACT(DAY FROM (trial_end_date - NOW()))
    ELSE NULL
  END as days_remaining
FROM clubs
WHERE trial_start_date IS NOT NULL
ORDER BY trial_start_date DESC;

