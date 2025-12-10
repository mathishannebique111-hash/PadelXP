-- Migration : Ajout des champs d'abonnement à la table clubs
-- Date : 2025-01-09
-- Description : Ajoute tous les champs nécessaires pour le système d'abonnement des clubs

-- 1. Ajouter les colonnes pour le système d'abonnement
ALTER TABLE clubs
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS selected_plan TEXT CHECK (selected_plan IN ('monthly', 'quarterly', 'annual')),
ADD COLUMN IF NOT EXISTS plan_selected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing' CHECK (subscription_status IN ('trialing', 'trialing_with_plan', 'active', 'past_due', 'canceled', 'trial_expired')),
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP WITH TIME ZONE;

-- 2. Créer les index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_clubs_stripe_customer_id ON clubs(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clubs_stripe_subscription_id ON clubs(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clubs_subscription_status ON clubs(subscription_status);

-- 3. Initialiser les essais pour les clubs existants sans dates d'essai
-- Cette requête initialise trial_start_date et trial_end_date pour les clubs qui n'en ont pas
UPDATE clubs
SET 
  trial_start_date = COALESCE(trial_start_date, created_at),
  trial_end_date = COALESCE(trial_end_date, created_at + INTERVAL '30 days'),
  subscription_status = COALESCE(subscription_status, 'trialing')
WHERE trial_start_date IS NULL OR trial_end_date IS NULL;

-- 4. Commentaires pour documentation
COMMENT ON COLUMN clubs.stripe_customer_id IS 'ID du customer Stripe associé au club';
COMMENT ON COLUMN clubs.stripe_subscription_id IS 'ID de la subscription Stripe active';
COMMENT ON COLUMN clubs.trial_start_date IS 'Date de début de la période d''essai gratuit (30 jours)';
COMMENT ON COLUMN clubs.trial_end_date IS 'Date de fin de la période d''essai gratuit';
COMMENT ON COLUMN clubs.selected_plan IS 'Plan d''abonnement sélectionné : monthly, quarterly ou annual';
COMMENT ON COLUMN clubs.plan_selected_at IS 'Date à laquelle le plan a été sélectionné';
COMMENT ON COLUMN clubs.subscription_status IS 'Statut de l''abonnement : trialing, trialing_with_plan, active, past_due, canceled, trial_expired';
COMMENT ON COLUMN clubs.subscription_started_at IS 'Date de début de l''abonnement actif (après la fin de l''essai)';

