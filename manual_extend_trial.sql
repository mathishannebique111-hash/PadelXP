-- =====================================================
-- SCRIPT SQL POUR EXTENSION MANUELLE D'ESSAI D'UN CLUB
-- =====================================================
--
-- ⚠️ RECOMMANDATION : Utilise plutôt la route API qui met à jour
-- automatiquement la DB ET Stripe en une seule commande :
--
-- curl -X POST http://localhost:3000/api/admin/extend-trial \
--   -H "Content-Type: application/json" \
--   -d '{"clubId": "CLUB_ID_ICI"}'
--
-- OU en production :
-- curl -X POST https://ton-domaine.com/api/admin/extend-trial \
--   -H "Content-Type: application/json" \
--   -d '{"clubId": "CLUB_ID_ICI"}'
--
-- =====================================================
-- Si tu préfères utiliser SQL uniquement (sans Stripe) :
-- =====================================================
--
-- INSTRUCTIONS :
-- 1. Remplace 'CLUB_ID_ICI' par l'ID du club (UUID)
-- 2. Exécute le script dans Supabase SQL Editor
-- 3. Vérifie le résultat avec la requête SELECT en bas
-- 4. ⚠️ N'OUBLIE PAS de mettre à jour Stripe manuellement après !
--
-- =====================================================

-- OPTION 1 : Extension manuelle pour un club spécifique (ajoute 16 jours)
-- Remplace 'CLUB_ID_ICI' par l'ID du club
UPDATE clubs
SET 
  trial_current_end_date = COALESCE(trial_current_end_date, trial_start_date + INTERVAL '14 days') + INTERVAL '16 days',
  trial_end_date = COALESCE(trial_end_date, trial_start_date + INTERVAL '14 days') + INTERVAL '16 days',
  trial_status = 'extended_auto',
  auto_extension_unlocked = TRUE,
  auto_extension_reason = 'manual' -- ou '10_players' ou '20_matches' selon le cas
WHERE id = 'CLUB_ID_ICI'::uuid;

-- OPTION 2 : Forcer à exactement 30 jours depuis le début (alternative)
-- Décommente cette section si tu préfères forcer à 30 jours depuis trial_start_date
/*
UPDATE clubs
SET 
  trial_current_end_date = trial_start_date + INTERVAL '30 days',
  trial_end_date = trial_start_date + INTERVAL '30 days',
  trial_status = 'extended_auto',
  auto_extension_unlocked = TRUE,
  auto_extension_reason = 'manual'
WHERE id = 'CLUB_ID_ICI'::uuid;
*/

-- Vérification : Affiche les données du club après mise à jour
SELECT 
  id,
  name,
  trial_start_date,
  trial_current_end_date,
  trial_end_date,
  EXTRACT(DAY FROM (trial_current_end_date - trial_start_date)) as total_trial_days,
  auto_extension_unlocked,
  auto_extension_reason,
  trial_status,
  stripe_subscription_id
FROM clubs
WHERE id = 'CLUB_ID_ICI'::uuid;

-- =====================================================
-- IMPORTANT : Après avoir exécuté ce script SQL,
-- tu dois aussi mettre à jour Stripe manuellement :
--
-- 1. Récupère le stripe_subscription_id du club
-- 2. Calcule le nouveau trial_end (timestamp Unix)
--    trial_end = trial_current_end_date en timestamp Unix
-- 3. Utilise l'API Stripe pour mettre à jour :
--    curl https://api.stripe.com/v1/subscriptions/sub_XXXXX \
--      -u sk_test_XXXXX: \
--      -d trial_end=1767918294 \
--      -d proration_behavior=none
-- =====================================================

