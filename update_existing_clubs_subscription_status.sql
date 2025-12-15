-- ============================================
-- MISE À JOUR DES CLUBS EXISTANTS
-- ============================================
-- Ce script met à jour le subscription_status des clubs qui ont déjà choisi un abonnement
-- Exécutez ce script dans Supabase SQL Editor

-- 1. Mettre à jour les clubs qui ont un abonnement Stripe actif
-- ============================================
UPDATE clubs
SET subscription_status = 'active'
WHERE stripe_subscription_id IS NOT NULL
  AND selected_plan IS NOT NULL
  AND (subscription_status IS NULL OR subscription_status = 'trialing' OR subscription_status = 'trialing_with_plan');

-- 2. Mettre à jour les clubs qui ont choisi un plan pendant l'essai
-- ============================================
UPDATE clubs
SET subscription_status = 'trialing_with_plan'
WHERE selected_plan IS NOT NULL
  AND stripe_subscription_id IS NULL
  AND (trial_end_date IS NULL OR trial_end_date > NOW())
  AND (subscription_status IS NULL OR subscription_status = 'trialing');

-- 3. Mettre à jour les clubs dont l'essai est expiré et qui ont choisi un plan mais l'abonnement n'est pas encore actif
-- ============================================
UPDATE clubs
SET subscription_status = 'active'
WHERE selected_plan IS NOT NULL
  AND (trial_end_date IS NOT NULL AND trial_end_date <= NOW())
  AND (subscription_status IS NULL OR subscription_status = 'trialing' OR subscription_status = 'trialing_with_plan' OR subscription_status = 'trial_expired');

-- 4. Vérifier les résultats
-- ============================================
SELECT 
  id,
  name,
  subscription_status,
  selected_plan,
  stripe_subscription_id,
  trial_start_date,
  trial_end_date,
  CASE 
    WHEN trial_end_date IS NOT NULL AND trial_end_date <= NOW() THEN 'Essai terminé'
    WHEN trial_end_date IS NOT NULL AND trial_end_date > NOW() THEN 'Essai en cours'
    ELSE 'Pas d''essai'
  END as trial_status
FROM clubs
WHERE selected_plan IS NOT NULL OR stripe_subscription_id IS NOT NULL
ORDER BY created_at DESC;



