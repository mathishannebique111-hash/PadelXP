-- ============================================
-- Migration : Format Divisions pour les Ligues
-- Phase tracking + Historique des phases
-- ============================================

-- 1. Ajout de la colonne format à la table leagues
ALTER TABLE leagues 
ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT 'standard' 
CHECK (format IN ('standard', 'divisions'));

-- 2. Ajout de la colonne division à la table league_players
ALTER TABLE league_players 
ADD COLUMN IF NOT EXISTS division INT NOT NULL DEFAULT 1;

-- 3. Ajout du suivi de phase à la table leagues
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS current_phase INT NOT NULL DEFAULT 0;

ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS phase_ends_at TIMESTAMPTZ;

-- 4. Table d'historique des phases
CREATE TABLE IF NOT EXISTS league_phase_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    phase_number INT NOT NULL,
    player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    division INT NOT NULL,
    rank INT NOT NULL,
    matches_played INT NOT NULL DEFAULT 0,
    points INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour les requêtes rapides
CREATE INDEX IF NOT EXISTS idx_league_phase_history_league_phase 
ON league_phase_history(league_id, phase_number);

-- RLS pour league_phase_history
ALTER TABLE league_phase_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "League members can view phase history" ON league_phase_history;
CREATE POLICY "League members can view phase history"
    ON league_phase_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM league_players lp 
            WHERE lp.league_id = league_phase_history.league_id 
            AND lp.player_id = auth.uid()
        )
    );
