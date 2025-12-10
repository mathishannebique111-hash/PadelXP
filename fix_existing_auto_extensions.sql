-- =====================================================
-- SCRIPT SQL POUR CORRIGER LES EXTENSIONS AUTOMATIQUES
-- =====================================================
--
-- Ce script met à jour les clubs qui avaient déjà débloqué
-- l'extension automatique avant les modifications récentes.
-- Il recalcule trial_current_end_date en ajoutant 16 jours
-- à la date de fin actuelle (ou en s'assurant qu'elle est à J+30).
--
-- À exécuter dans Supabase SQL Editor ou via psql
-- =====================================================

-- 1. Identifier les clubs avec extension automatique débloquée
--    mais dont trial_current_end_date n'est pas à J+30 depuis le début
WITH clubs_to_fix AS (
  SELECT 
    id,
    trial_start_date,
    trial_current_end_date,
    trial_base_end_date,
    auto_extension_unlocked,
    auto_extension_reason,
    stripe_subscription_id
  FROM clubs
  WHERE 
    auto_extension_unlocked = TRUE
    AND trial_start_date IS NOT NULL
    AND trial_current_end_date IS NOT NULL
    -- Vérifier si la durée n'est pas déjà de 30 jours (ou proche)
    AND EXTRACT(DAY FROM (trial_current_end_date - trial_start_date)) < 29
)
-- 2. Mettre à jour trial_current_end_date ET trial_end_date pour ces clubs
--    (trial_end_date pour compatibilité avec l'ancien système)
UPDATE clubs
SET 
  trial_current_end_date = trial_start_date + INTERVAL '30 days',
  trial_end_date = trial_start_date + INTERVAL '30 days', -- Compatibilité
  trial_status = 'extended_auto'
WHERE id IN (
  SELECT id FROM clubs_to_fix
);

-- 3. Afficher les clubs corrigés pour vérification
SELECT 
  id,
  name,
  trial_start_date,
  trial_current_end_date,
  EXTRACT(DAY FROM (trial_current_end_date - trial_start_date)) as total_trial_days,
  auto_extension_unlocked,
  auto_extension_reason,
  stripe_subscription_id
FROM clubs
WHERE 
  auto_extension_unlocked = TRUE
  AND trial_start_date IS NOT NULL
  AND trial_current_end_date IS NOT NULL
ORDER BY trial_start_date DESC;

