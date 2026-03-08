-- =============================================
-- SYSTEME MATCH FINDER (REJOINDRE)
-- =============================================

-- Table principale des annonces de match
CREATE TABLE IF NOT EXISTS match_finder (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    min_level DECIMAL(3,1) NOT NULL DEFAULT 1.0,
    max_level DECIMAL(3,1) NOT NULL DEFAULT 10.0,
    needed_players INTEGER NOT NULL CHECK (needed_players BETWEEN 1 AND 3),
    description TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des participants inscrits à une annonce
CREATE TABLE IF NOT EXISTS match_finder_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_finder_id UUID NOT NULL REFERENCES match_finder(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(match_finder_id, user_id)
);

-- Index pour la performance
CREATE INDEX IF NOT EXISTS idx_match_finder_club ON match_finder(club_id);
CREATE INDEX IF NOT EXISTS idx_match_finder_status ON match_finder(status);
CREATE INDEX IF NOT EXISTS idx_match_finder_scheduled ON match_finder(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_mf_participants_match ON match_finder_participants(match_finder_id);

-- RLS
ALTER TABLE match_finder ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_finder_participants ENABLE ROW LEVEL SECURITY;

-- Politiques match_finder
DROP POLICY IF EXISTS "match_finder_select_same_club" ON match_finder;
CREATE POLICY "match_finder_select_same_club" ON match_finder
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.club_id = match_finder.club_id OR profiles.club_id::text = match_finder.club_id::text)
    )
);

DROP POLICY IF EXISTS "match_finder_insert_auth" ON match_finder;
CREATE POLICY "match_finder_insert_auth" ON match_finder
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "match_finder_update_creator" ON match_finder;
CREATE POLICY "match_finder_update_creator" ON match_finder
FOR UPDATE TO authenticated
USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "match_finder_delete_creator" ON match_finder;
CREATE POLICY "match_finder_delete_creator" ON match_finder
FOR DELETE TO authenticated
USING (auth.uid() = creator_id);

-- Politiques match_finder_participants
DROP POLICY IF EXISTS "mf_participants_select_visible" ON match_finder_participants;
CREATE POLICY "mf_participants_select_visible" ON match_finder_participants
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM match_finder mf
        WHERE mf.id = match_finder_participants.match_finder_id
    )
);

DROP POLICY IF EXISTS "mf_participants_insert_auth" ON match_finder_participants;
CREATE POLICY "mf_participants_insert_auth" ON match_finder_participants
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "mf_participants_delete_self_or_creator" ON match_finder_participants;
CREATE POLICY "mf_participants_delete_self_or_creator" ON match_finder_participants
FOR DELETE TO authenticated
USING (
    auth.uid() = user_id 
    OR EXISTS (
        SELECT 1 FROM match_finder mf
        WHERE mf.id = match_finder_id AND mf.creator_id = auth.uid()
    )
);
