-- =====================================================
-- SCRIPT SQL POUR RÉINITIALISER LES CLUBS POUR LES TESTS
-- =====================================================
-- 
-- Ce script permet de réinitialiser les clubs existants
-- pour pouvoir tester le système d'abonnement sans avoir
-- à recréer un club à chaque fois.
--
-- À exécuter dans Supabase SQL Editor
-- =====================================================

-- 1. Supprimer les abonnements existants dans la table subscriptions
DELETE FROM subscriptions
WHERE club_id IN (
  SELECT id FROM clubs
);

-- 2. Réinitialiser les champs liés aux abonnements Stripe
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
  
  -- Réinitialiser les compteurs d'engagement (optionnel, commenté par défaut)
  -- total_players_count = 0,
  -- total_matches_count = 0,
  -- total_challenges_count = 0,
  -- dashboard_login_count = 0,
  -- invitations_sent_count = 0,
  last_engagement_check_date = NULL
WHERE
  -- Modifier cette condition pour cibler les clubs à réinitialiser
  -- 
  -- OPTION 1 : Réinitialiser tous les clubs (décommentez la ligne suivante)
  -- id IS NOT NULL;
  
  -- OPTION 2 : Réinitialiser un club spécifique par email (décommentez et modifiez l'email)
  id IN (
    SELECT club_id 
    FROM club_admins 
    WHERE email = 'padelhavre@gmail.com'
  );

-- 2. Afficher les clubs réinitialisés
SELECT 
  id,
  name,
  slug,
  trial_start_date,
  trial_end_date,
  trial_current_end_date,
  subscription_status,
  selected_plan,
  stripe_customer_id,
  stripe_subscription_id
FROM clubs
WHERE 
  subscription_status = 'trialing'
ORDER BY created_at DESC;

-- =====================================================
-- VARIANTE : Réinitialiser un seul club par email
-- =====================================================
-- 
-- Pour réinitialiser un seul club, utilisez cette requête :
--
-- UPDATE clubs
-- SET
--   stripe_customer_id = NULL,
--   stripe_subscription_id = NULL,
--   selected_plan = NULL,
--   plan_selected_at = NULL,
--   subscription_status = 'trialing',
--   subscription_started_at = NULL,
--   trial_start_date = NOW(),
--   trial_end_date = NOW() + INTERVAL '14 days',
--   trial_base_end_date = NOW() + INTERVAL '14 days',
--   trial_current_end_date = NOW() + INTERVAL '14 days',
--   trial_status = 'active',
--   auto_extension_unlocked = FALSE,
--   auto_extension_reason = NULL,
--   proposed_extension_sent = FALSE,
--   proposed_extension_sent_date = NULL,
--   proposed_extension_accepted = NULL,
--   manual_extension_granted = FALSE,
--   manual_extension_date = NULL,
--   manual_extension_days = NULL,
--   manual_extension_notes = NULL,
--   manual_extension_by_user_id = NULL,
--   last_engagement_check_date = NULL
-- WHERE id IN (
--   SELECT club_id::uuid 
--   FROM club_admins 
--   WHERE email = 'VOTRE_EMAIL_ICI@example.com'
-- );
--
-- =====================================================

