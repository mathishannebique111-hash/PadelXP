-- ============================================
-- TABLE: match_confirmations
-- ============================================
-- Table pour gérer les confirmations de matchs par les joueurs

CREATE TABLE IF NOT EXISTS public.match_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  confirmed BOOLEAN DEFAULT FALSE,
  confirmation_token TEXT NOT NULL UNIQUE,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Un joueur ne peut confirmer qu'une fois par match
  UNIQUE(match_id, user_id)
);

-- Index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_match_confirmations_match_id ON public.match_confirmations(match_id);
CREATE INDEX IF NOT EXISTS idx_match_confirmations_user_id ON public.match_confirmations(user_id);
CREATE INDEX IF NOT EXISTS idx_match_confirmations_token ON public.match_confirmations(confirmation_token);

-- ============================================
-- MODIFIER LA TABLE matches
-- ============================================
-- Ajouter un statut pour les matchs

ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected'));

ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- Index pour les matchs en attente
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.match_confirmations ENABLE ROW LEVEL SECURITY;

-- Lecture: les utilisateurs peuvent voir leurs propres confirmations et celles des matchs où ils participent
CREATE POLICY match_confirmations_select_own
ON public.match_confirmations
FOR SELECT
USING (
  auth.uid() = user_id 
  OR auth.uid() IN (
    SELECT user_id FROM public.match_participants WHERE match_id = match_confirmations.match_id
  )
);

-- Insertion: les utilisateurs authentifiés peuvent créer des confirmations
CREATE POLICY match_confirmations_insert_auth
ON public.match_confirmations
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Mise à jour: les utilisateurs peuvent mettre à jour leurs propres confirmations
CREATE POLICY match_confirmations_update_own
ON public.match_confirmations
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

