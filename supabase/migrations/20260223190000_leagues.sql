-- ============================================
-- Migration : Système de Ligues Privées
-- ============================================

-- 1. Table principale des ligues
CREATE TABLE IF NOT EXISTS leagues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE NOT NULL,
    max_matches_per_player INT NOT NULL CHECK (max_matches_per_player IN (5, 10, 15)),
    max_players INT NOT NULL CHECK (max_players >= 4 AND max_players <= 15),
    duration_weeks INT NOT NULL CHECK (duration_weeks >= 2 AND duration_weeks <= 6),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ends_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Table des joueurs inscrits à une ligue
CREATE TABLE IF NOT EXISTS league_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    matches_played INT NOT NULL DEFAULT 0,
    points INT NOT NULL DEFAULT 0,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(league_id, player_id)
);

-- 3. Colonne optionnelle sur matches pour lier un match à une ligue
ALTER TABLE matches ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE SET NULL;

-- 4. Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_leagues_created_by ON leagues(created_by);
CREATE INDEX IF NOT EXISTS idx_leagues_invite_code ON leagues(invite_code);
CREATE INDEX IF NOT EXISTS idx_leagues_status ON leagues(status);
CREATE INDEX IF NOT EXISTS idx_league_players_league_id ON league_players(league_id);
CREATE INDEX IF NOT EXISTS idx_league_players_player_id ON league_players(player_id);
CREATE INDEX IF NOT EXISTS idx_matches_league_id ON matches(league_id);

-- 5. RLS
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_players ENABLE ROW LEVEL SECURITY;

-- Politique : tout le monde peut lire les ligues auxquelles il participe
CREATE POLICY "Users can view leagues they belong to"
    ON leagues FOR SELECT
    USING (
        id IN (SELECT league_id FROM league_players WHERE player_id = auth.uid())
    );

-- Politique : tout utilisateur authentifié peut créer une ligue
CREATE POLICY "Authenticated users can create leagues"
    ON leagues FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Politique : le créateur peut modifier sa ligue
CREATE POLICY "Creator can update their leagues"
    ON leagues FOR UPDATE
    USING (created_by = auth.uid());

-- Politique : les membres peuvent voir les joueurs de leur ligue
CREATE POLICY "Members can view league players"
    ON league_players FOR SELECT
    USING (
        league_id IN (SELECT league_id FROM league_players WHERE player_id = auth.uid())
    );

-- Politique : tout utilisateur authentifié peut rejoindre une ligue
CREATE POLICY "Authenticated users can join leagues"
    ON league_players FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Politique : mise à jour des stats (par le système via service role)
CREATE POLICY "System can update league player stats"
    ON league_players FOR UPDATE
    USING (true);
