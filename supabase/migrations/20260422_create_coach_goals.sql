-- Table pour les objectifs personnalisés du joueur (Coach IA)
CREATE TABLE IF NOT EXISTS coach_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,           -- ex: "Atteindre niveau 6"
  description TEXT,              -- détails optionnels
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_coach_goals_user_status ON coach_goals(user_id, status);

-- RLS
ALTER TABLE coach_goals ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs ne voient que leurs propres objectifs
CREATE POLICY "Users can view own goals"
  ON coach_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON coach_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON coach_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON coach_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "service_role_all" ON coach_goals
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_coach_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_coach_goals_updated_at
  BEFORE UPDATE ON coach_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_coach_goals_updated_at();
