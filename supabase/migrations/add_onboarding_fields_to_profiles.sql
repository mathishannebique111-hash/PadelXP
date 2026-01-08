-- ============================================
-- MIGRATION : Ajout des champs onboarding dans profiles
-- ============================================
-- Ce script ajoute les colonnes nécessaires pour le flux d'onboarding
-- Exécutez ce script dans Supabase SQL Editor

-- 1. Ajouter la colonne has_completed_onboarding
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false;

-- 2. Ajouter les colonnes pour les réponses onboarding
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS level TEXT CHECK (level IN ('beginner', 'leisure', 'regular', 'competition')),
ADD COLUMN IF NOT EXISTS preferred_side TEXT CHECK (preferred_side IN ('left', 'right', 'indifferent')),
ADD COLUMN IF NOT EXISTS hand TEXT CHECK (hand IN ('right', 'left')),
ADD COLUMN IF NOT EXISTS frequency TEXT CHECK (frequency IN ('monthly', 'weekly', '2-3weekly', '3+weekly')),
ADD COLUMN IF NOT EXISTS best_shot TEXT CHECK (best_shot IN ('smash', 'vibora', 'lob', 'defense'));

-- 3. Créer des index pour améliorer les performances (optionnel)
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON public.profiles(has_completed_onboarding) WHERE has_completed_onboarding = false;

-- 4. Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Colonnes onboarding ajoutées à la table profiles';
  RAISE NOTICE '✅ has_completed_onboarding (boolean, default false)';
  RAISE NOTICE '✅ level (beginner, leisure, regular, competition)';
  RAISE NOTICE '✅ preferred_side (left, right, indifferent)';
  RAISE NOTICE '✅ hand (right, left)';
  RAISE NOTICE '✅ frequency (monthly, weekly, 2-3weekly, 3+weekly)';
  RAISE NOTICE '✅ best_shot (smash, vibora, lob, defense)';
END $$;
