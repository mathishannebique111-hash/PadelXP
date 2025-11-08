-- ============================================
-- SYSTÈME DE CONFIRMATION DE MATCHS
-- ============================================
-- Ce script crée les tables et fonctions nécessaires pour le système de confirmation
-- Exécutez ce script dans Supabase SQL Editor

-- 1. Ajouter la colonne status à matches si elle n'existe pas
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'matches' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.matches 
    ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected'));
  END IF;
END $$;

-- 2. Créer la table match_confirmations
-- ============================================
CREATE TABLE IF NOT EXISTS public.match_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  confirmed BOOLEAN DEFAULT false,
  confirmation_token TEXT UNIQUE NOT NULL,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, user_id)
);

-- 3. Créer les index pour améliorer les performances
-- ============================================
CREATE INDEX IF NOT EXISTS idx_match_confirmations_match_id ON public.match_confirmations(match_id);
CREATE INDEX IF NOT EXISTS idx_match_confirmations_user_id ON public.match_confirmations(user_id);
CREATE INDEX IF NOT EXISTS idx_match_confirmations_token ON public.match_confirmations(confirmation_token);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);

-- 4. RLS Policies pour match_confirmations
-- ============================================
ALTER TABLE public.match_confirmations ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS match_confirmations_select_own ON public.match_confirmations;
DROP POLICY IF EXISTS match_confirmations_insert_own ON public.match_confirmations;
DROP POLICY IF EXISTS match_confirmations_update_own ON public.match_confirmations;

-- Lecture: les utilisateurs peuvent voir leurs propres confirmations
CREATE POLICY match_confirmations_select_own
ON public.match_confirmations
FOR SELECT
USING (auth.uid() = user_id);

-- Insertion: les utilisateurs peuvent créer leurs propres confirmations
CREATE POLICY match_confirmations_insert_own
ON public.match_confirmations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Mise à jour: les utilisateurs peuvent mettre à jour leurs propres confirmations
CREATE POLICY match_confirmations_update_own
ON public.match_confirmations
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Fonction pour vérifier si un match peut être confirmé (2 confirmations sur 3 autres joueurs)
-- ============================================
CREATE OR REPLACE FUNCTION check_match_confirmation_status()
RETURNS TRIGGER AS $$
DECLARE
  confirmation_count INTEGER;
  total_user_participants INTEGER;
BEGIN
  -- Compter les confirmations pour ce match
  SELECT COUNT(*) INTO confirmation_count
  FROM public.match_confirmations
  WHERE match_id = NEW.match_id AND confirmed = true;
  
  -- Compter le nombre total de participants users (créateur + autres)
  SELECT COUNT(*) INTO total_user_participants
  FROM public.match_participants
  WHERE match_id = NEW.match_id AND player_type = 'user';
  
  -- Si on a au moins 2 confirmations ET qu'il y a au moins 3 joueurs users au total (créateur + 2 autres)
  -- Alors on valide le match (2 confirmations sur les 3 autres joueurs)
  IF confirmation_count >= 2 AND total_user_participants >= 3 THEN
    UPDATE public.matches
    SET status = 'confirmed',
        confirmed_at = NOW()
    WHERE id = NEW.match_id AND status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger pour mettre à jour le statut du match automatiquement
-- ============================================
DROP TRIGGER IF EXISTS trigger_check_match_confirmation ON public.match_confirmations;
CREATE TRIGGER trigger_check_match_confirmation
AFTER INSERT OR UPDATE ON public.match_confirmations
FOR EACH ROW
EXECUTE FUNCTION check_match_confirmation_status();

-- 7. Ajouter une colonne pour détecter les doublons (optionnel, pour améliorer la détection)
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'matches' AND column_name = 'players_hash'
  ) THEN
    ALTER TABLE public.matches 
    ADD COLUMN players_hash TEXT;
  END IF;
END $$;

-- 8. Index pour la détection de doublons
-- ============================================
CREATE INDEX IF NOT EXISTS idx_matches_players_hash ON public.matches(players_hash);

-- 9. Marquer les anciens matchs comme confirmés (s'ils n'ont pas de statut)
-- ============================================
UPDATE public.matches
SET status = 'confirmed'
WHERE status IS NULL OR status = '';

-- 10. Ajouter la colonne confirmed_at si elle n'existe pas
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'matches' AND column_name = 'confirmed_at'
  ) THEN
    ALTER TABLE public.matches 
    ADD COLUMN confirmed_at TIMESTAMPTZ;
    
    -- Pour les anciens matchs confirmés, mettre confirmed_at = created_at
    UPDATE public.matches
    SET confirmed_at = created_at
    WHERE status = 'confirmed' AND confirmed_at IS NULL;
  END IF;
END $$;

