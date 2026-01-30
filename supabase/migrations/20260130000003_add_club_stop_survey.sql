-- Migration: Add club stop survey responses table
-- This table stores player responses when their club stops using PadelXP

CREATE TABLE IF NOT EXISTS club_stop_survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response TEXT NOT NULL CHECK (response IN ('yes', 'no')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(club_id, user_id)
);

-- Index pour les requêtes admin (lister par club)
CREATE INDEX IF NOT EXISTS idx_club_stop_survey_club_id ON club_stop_survey_responses(club_id);

-- Index pour éviter les doublons par utilisateur
CREATE INDEX IF NOT EXISTS idx_club_stop_survey_user_id ON club_stop_survey_responses(user_id);

-- Activer RLS
ALTER TABLE club_stop_survey_responses ENABLE ROW LEVEL SECURITY;

-- Politique: Les joueurs peuvent insérer leur propre réponse
CREATE POLICY "Users can insert their own survey response"
  ON club_stop_survey_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Politique: Les joueurs peuvent voir leur propre réponse
CREATE POLICY "Users can view their own survey response"
  ON club_stop_survey_responses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Politique: Service role peut tout faire (pour l'admin)
CREATE POLICY "Service role has full access"
  ON club_stop_survey_responses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
