-- Migration : Création des tables pour le système de boost de points des joueurs
-- Date : 2025-01-XX

-- 1. Table pour stocker les crédits de boost achetés mais pas encore utilisés
CREATE TABLE IF NOT EXISTS public.player_boost_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed_at TIMESTAMPTZ NULL, -- NULL = boost disponible, NOT NULL = boost consommé
  stripe_payment_intent_id TEXT NULL, -- Pour tracer l'origine du paiement
  created_by_session_id TEXT NULL, -- Session Stripe Checkout ID
  CONSTRAINT check_not_consumed_on_creation CHECK (consumed_at IS NULL)
);

-- Index pour chercher rapidement les boosts disponibles pour un joueur
CREATE INDEX IF NOT EXISTS idx_player_boost_credits_user_available 
  ON public.player_boost_credits(user_id, consumed_at) 
  WHERE consumed_at IS NULL;

-- Index pour chercher les boosts par session Stripe
CREATE INDEX IF NOT EXISTS idx_player_boost_credits_session 
  ON public.player_boost_credits(created_by_session_id) 
  WHERE created_by_session_id IS NOT NULL;

-- 2. Table pour enregistrer l'utilisation d'un boost sur un match
CREATE TABLE IF NOT EXISTS public.player_boost_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  boost_credit_id UUID NOT NULL REFERENCES public.player_boost_credits(id) ON DELETE RESTRICT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  percentage NUMERIC(5, 4) NOT NULL DEFAULT 0.3, -- 0.3 = +30%, stocké comme 0.3
  points_before_boost INTEGER NOT NULL, -- Points gagnés avant le boost
  points_after_boost INTEGER NOT NULL, -- Points gagnés après le boost (+30%)
  CONSTRAINT check_percentage_range CHECK (percentage >= 0 AND percentage <= 1),
  CONSTRAINT check_points_increased CHECK (points_after_boost >= points_before_boost)
);

-- Index pour vérifier rapidement les boosts utilisés par un joueur dans le mois courant
CREATE INDEX IF NOT EXISTS idx_player_boost_uses_user_month 
  ON public.player_boost_uses(user_id, applied_at);

-- Index pour chercher les boosts utilisés sur un match (si besoin de debug/audit)
CREATE INDEX IF NOT EXISTS idx_player_boost_uses_match 
  ON public.player_boost_uses(match_id);

-- Index pour vérifier qu'un boost_credit n'est utilisé qu'une seule fois
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_boost_uses_credit_unique 
  ON public.player_boost_uses(boost_credit_id);

-- 3. RLS Policies pour player_boost_credits
ALTER TABLE public.player_boost_credits ENABLE ROW LEVEL SECURITY;

-- Les joueurs peuvent voir leurs propres crédits
CREATE POLICY "Users can view their own boost credits"
  ON public.player_boost_credits
  FOR SELECT
  USING (auth.uid() = user_id);

-- Les admins peuvent voir tous les crédits (via service_role)
-- Pas de politique INSERT pour les utilisateurs normaux (géré via API avec service_role)

-- 4. RLS Policies pour player_boost_uses
ALTER TABLE public.player_boost_uses ENABLE ROW LEVEL SECURITY;

-- Les joueurs peuvent voir leurs propres utilisations de boost
CREATE POLICY "Users can view their own boost uses"
  ON public.player_boost_uses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Les admins peuvent voir toutes les utilisations (via service_role)
-- Pas de politique INSERT pour les utilisateurs normaux (géré via API avec service_role)

-- 5. Fonction SQL pour compter les boosts utilisés dans le mois courant
CREATE OR REPLACE FUNCTION public.count_player_boosts_used_this_month(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.player_boost_uses
  WHERE user_id = p_user_id
    AND DATE_TRUNC('month', applied_at) = DATE_TRUNC('month', NOW());
$$ LANGUAGE SQL STABLE;

-- 6. Fonction SQL pour compter les boosts disponibles (non consommés)
CREATE OR REPLACE FUNCTION public.count_player_boost_credits_available(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.player_boost_credits
  WHERE user_id = p_user_id
    AND consumed_at IS NULL;
$$ LANGUAGE SQL STABLE;

-- 7. Commentaires pour documentation
COMMENT ON TABLE public.player_boost_credits IS 'Stocke les boosts de points achetés par les joueurs. Un boost est disponible si consumed_at IS NULL.';
COMMENT ON TABLE public.player_boost_uses IS 'Enregistre chaque utilisation d''un boost sur un match. Limite de 10 utilisations par joueur et par mois.';
COMMENT ON COLUMN public.player_boost_uses.percentage IS 'Pourcentage d''augmentation des points (ex: 0.3 pour +30%)';
COMMENT ON COLUMN public.player_boost_uses.points_before_boost IS 'Points gagnés normalement (ex: 10 pour une victoire)';
COMMENT ON COLUMN public.player_boost_uses.points_after_boost IS 'Points gagnés après application du boost (ex: 13 pour 10 * 1.3)';


