-- =====================================================
-- SCRIPT SQL POUR RÉINITIALISER UN CLUB PAR EMAIL
-- =====================================================
-- 
-- Instructions :
-- 1. Remplacez 'VOTRE_EMAIL@example.com' par l'email du club à réinitialiser
-- 2. Exécutez ce script dans Supabase SQL Editor
-- =====================================================

-- Supprimer les abonnements existants dans la table subscriptions
DELETE FROM subscriptions
WHERE club_id IN (
  SELECT club_id::uuid 
  FROM club_admins 
  WHERE email = 'padelhavre@gmail.com'  -- ⬅️ MODIFIEZ CET EMAIL
);

-- Réinitialiser les données du club dans la table clubs
UPDATE clubs
SET
  -- Réinitialiser les IDs Stripe
  stripe_customer_id = NULL,
  stripe_subscription_id = NULL,
  
  -- Réinitialiser les champs d'abonnement
  selected_plan = NULL,
  plan_selected_at = NULL,
  subscription_status = 'trialing',
  subscription_started_at = NULL,
  
  -- Réinitialiser la période d'essai (14 jours à partir d'aujourd'hui)
  trial_start_date = NOW(),
  trial_end_date = NOW() + INTERVAL '14 days',
  trial_base_end_date = NOW() + INTERVAL '14 days',
  trial_current_end_date = NOW() + INTERVAL '14 days',
  trial_status = 'active',
  
  -- Réinitialiser les extensions
  auto_extension_unlocked = FALSE,
  auto_extension_reason = NULL,
  proposed_extension_sent = FALSE,
  proposed_extension_sent_date = NULL,
  proposed_extension_accepted = NULL,
  manual_extension_granted = FALSE,
  manual_extension_date = NULL,
  manual_extension_days = NULL,
  manual_extension_notes = NULL,
  manual_extension_by_user_id = NULL,
  last_engagement_check_date = NULL
WHERE id IN (
  SELECT club_id::uuid 
  FROM club_admins 
  WHERE email = 'padelhavre@gmail.com'  -- ⬅️ MODIFIEZ CET EMAIL
);

-- Afficher le résultat
SELECT 
  c.id,
  c.name,
  c.slug,
  ca.email,
  c.trial_start_date,
  c.trial_end_date,
  c.trial_current_end_date,
  c.subscription_status,
  c.selected_plan,
  c.stripe_customer_id,
  c.stripe_subscription_id
FROM clubs c
LEFT JOIN club_admins ca ON ca.club_id::uuid = c.id AND ca.role = 'owner'
WHERE c.id IN (
  SELECT club_id::uuid 
  FROM club_admins 
  WHERE email = 'padelhavre@gmail.com'  -- ⬅️ MÊME EMAIL ICI
);

