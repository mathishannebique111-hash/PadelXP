-- =====================================================
-- SCRIPT SQL POUR IDENTIFIER LES CLUBS À METTRE À JOUR DANS STRIPE
-- =====================================================
--
-- Ce script liste les clubs qui ont une extension automatique
-- et une subscription Stripe, pour les mettre à jour via l'API.
--
-- À utiliser avec la route API /api/admin/fix-auto-extensions
-- =====================================================

-- Afficher les clubs avec extension automatique et subscription Stripe
SELECT 
  id,
  name,
  trial_start_date,
  trial_current_end_date,
  EXTRACT(DAY FROM (trial_current_end_date - trial_start_date)) as total_trial_days,
  auto_extension_unlocked,
  auto_extension_reason,
  stripe_subscription_id,
  subscription_status
FROM clubs
WHERE 
  auto_extension_unlocked = TRUE
  AND trial_start_date IS NOT NULL
  AND trial_current_end_date IS NOT NULL
  AND stripe_subscription_id IS NOT NULL
  AND EXTRACT(DAY FROM (trial_current_end_date - trial_start_date)) >= 29
ORDER BY trial_start_date DESC;

