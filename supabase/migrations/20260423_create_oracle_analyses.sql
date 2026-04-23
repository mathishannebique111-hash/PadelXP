-- Stocke les analyses Oracle pour les injecter dans le contexte du Coach IA
CREATE TABLE IF NOT EXISTS oracle_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Résumé textuel pour injection dans le system prompt
  summary TEXT NOT NULL,
  -- Données brutes JSON pour référence
  raw_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_oracle_analyses_user ON oracle_analyses(user_id, created_at DESC);

ALTER TABLE oracle_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analyses" ON oracle_analyses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analyses" ON oracle_analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "service_role_all" ON oracle_analyses
  FOR ALL USING (true) WITH CHECK (true);
