-- Debrief post-match : ressenti du joueur après chaque match
-- Permet au Coach IA de construire un profil de jeu détaillé
CREATE TABLE IF NOT EXISTS match_debriefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  -- Ratings 1-3 (1=mauvais, 2=moyen, 3=bon)
  rating_service INTEGER CHECK (rating_service BETWEEN 1 AND 3),
  rating_volley INTEGER CHECK (rating_volley BETWEEN 1 AND 3),
  rating_smash INTEGER CHECK (rating_smash BETWEEN 1 AND 3),
  rating_defense INTEGER CHECK (rating_defense BETWEEN 1 AND 3),
  rating_mental INTEGER CHECK (rating_mental BETWEEN 1 AND 3),
  -- Coup problématique
  problem_shot TEXT CHECK (problem_shot IN ('service', 'volée', 'smash', 'bandeja', 'lob', 'défense', 'retour', 'aucun')),
  -- Côté joué
  side_played TEXT CHECK (side_played IN ('gauche', 'droite', 'les_deux')),
  -- Note libre optionnelle
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, match_id)
);

CREATE INDEX idx_match_debriefs_user ON match_debriefs(user_id);
CREATE INDEX idx_match_debriefs_match ON match_debriefs(match_id);

ALTER TABLE match_debriefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own debriefs"
  ON match_debriefs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own debriefs"
  ON match_debriefs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own debriefs"
  ON match_debriefs FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "service_role_all" ON match_debriefs
  FOR ALL USING (true) WITH CHECK (true);
