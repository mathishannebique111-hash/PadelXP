-- 1. Passer les clubs créés ces dernières 24h en "founder" s'ils sont "standard" (pour rattraper le club de l'utilisateur)
UPDATE clubs
SET offer_type = 'founder'
WHERE created_at > (NOW() - INTERVAL '24 hours') AND offer_type = 'standard';

-- 2. Corriger la date de fin d'essai pour tous les clubs "founder" qui ont une période d'essai trop courte (< 80 jours)
-- On recalculer la fin basée sur le début de l'essai + 90 jours
UPDATE clubs
SET 
  trial_end_date = (trial_start::timestamp + INTERVAL '90 days'),
  trial_base_end_date = (trial_start::timestamp + INTERVAL '90 days'),
  trial_current_end_date = (trial_start::timestamp + INTERVAL '90 days')
WHERE 
  offer_type = 'founder' 
  AND trial_end_date < (trial_start::timestamp + INTERVAL '80 days');
