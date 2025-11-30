-- =====================================================
-- SYSTÈME COMPLET DE GESTION DE TOURNOIS DE PADEL
-- =====================================================

-- Table principale : Tournois
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  
  -- Informations de base
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  
  -- Type et format
  tournament_type VARCHAR(50) NOT NULL CHECK (tournament_type IN (
    'official_knockout',
    'official_pools',
    'americano',
    'mexicano',
    'custom'
  )),
  
  match_format VARCHAR(10) NOT NULL CHECK (match_format IN (
    'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E', 'F'
  )),
  
  -- Configuration poules
  pool_size INTEGER CHECK (pool_size IN (3, 4) OR pool_size IS NULL),
  pool_format VARCHAR(10),
  num_pools INTEGER,
  
  -- Configuration Tableau Final
  main_draw_size INTEGER CHECK (main_draw_size IN (8, 12, 16, 24, 32, 48, 64) OR main_draw_size IS NULL),
  num_seeds INTEGER,
  num_wild_cards INTEGER,
  
  -- Règles spécifiques
  punto_de_oro BOOLEAN DEFAULT false,
  coaching_allowed BOOLEAN DEFAULT true,
  
  -- Dates
  registration_open_date TIMESTAMP WITH TIME ZONE NOT NULL,
  registration_close_date TIMESTAMP WITH TIME ZONE NOT NULL,
  draw_publication_date TIMESTAMP WITH TIME ZONE,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Terrains
  available_courts INTEGER[] DEFAULT ARRAY[1, 2],
  match_duration_minutes INTEGER DEFAULT 90,
  
  -- Financier
  inscription_fee DECIMAL(10,2) NOT NULL CHECK (inscription_fee >= 0 AND inscription_fee <= 20),
  prize_money JSONB,
  stripe_product_id VARCHAR(255),
  
  -- Statut
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'open', 'registration_closed', 'draw_published', 'in_progress', 'completed', 'cancelled'
  )),
  
  -- Métadonnées
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_dates CHECK (
    registration_open_date < registration_close_date 
    AND registration_close_date < start_date 
    AND start_date <= end_date
  )
);

CREATE INDEX idx_tournaments_club_id ON tournaments(club_id);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_dates ON tournaments(start_date, end_date);

-- Table : Inscriptions
CREATE TABLE tournament_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  
  player1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  player1_classification VARCHAR(10),
  player2_classification VARCHAR(10),
  pair_weight INTEGER NOT NULL,
  
  registration_order INTEGER NOT NULL,
  is_seed BOOLEAN DEFAULT false,
  seed_number INTEGER CHECK (seed_number > 0 OR seed_number IS NULL),
  is_wild_card BOOLEAN DEFAULT false,
  is_bye BOOLEAN DEFAULT false,
  
  phase VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (phase IN (
    'waiting_list', 'qualifications', 'main_draw', 'eliminated'
  )),
  pool_id UUID,
  
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'waiting_list', 'rejected', 'withdrawn'
  )),
  rejection_reason TEXT,
  
  original_player1_id UUID REFERENCES profiles(id),
  original_player2_id UUID REFERENCES profiles(id),
  change_reason TEXT,
  change_justification_file VARCHAR(500),
  change_approved BOOLEAN DEFAULT false,
  
  forfait_type VARCHAR(50) CHECK (forfait_type IN (
    'none', 'excused', 'not_excused', 'abandon', 'no_show'
  )) DEFAULT 'none',
  forfait_date TIMESTAMP WITH TIME ZONE,
  medical_certificate_url VARCHAR(500),
  disciplinary_points INTEGER DEFAULT 0,
  
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (payment_status IN (
    'pending', 'paid', 'refunded', 'failed'
  )),
  stripe_payment_intent_id VARCHAR(255),
  paid_at TIMESTAMP WITH TIME ZONE,
  amount_paid DECIMAL(10,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_pair_per_tournament UNIQUE(tournament_id, player1_id, player2_id),
  CONSTRAINT different_players CHECK (player1_id != player2_id)
);

CREATE INDEX idx_registrations_tournament ON tournament_registrations(tournament_id);
CREATE INDEX idx_registrations_players ON tournament_registrations(player1_id, player2_id);
CREATE INDEX idx_registrations_status ON tournament_registrations(status);
CREATE INDEX idx_registrations_payment ON tournament_registrations(payment_status);

-- Table : Poules
CREATE TABLE tournament_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  
  pool_number INTEGER NOT NULL,
  pool_type VARCHAR(50) NOT NULL CHECK (pool_type IN ('qualification', 'main_draw')),
  num_teams INTEGER NOT NULL CHECK (num_teams IN (3, 4)),
  format VARCHAR(10) NOT NULL,
  
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'completed'
  )),
  
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_pool_number UNIQUE(tournament_id, pool_number)
);

CREATE INDEX idx_pools_tournament ON tournament_pools(tournament_id);

-- Table : Matchs
CREATE TABLE tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  pool_id UUID REFERENCES tournament_pools(id) ON DELETE CASCADE,
  
  round_type VARCHAR(50) NOT NULL CHECK (round_type IN (
    'pool', 'qualifications', 'round_of_64', 'round_of_32', 'round_of_16', 
    'quarters', 'semis', 'final', 'third_place'
  )),
  round_number INTEGER,
  match_order INTEGER,
  
  team1_registration_id UUID REFERENCES tournament_registrations(id),
  team2_registration_id UUID REFERENCES tournament_registrations(id),
  
  court_number INTEGER,
  scheduled_time TIMESTAMP WITH TIME ZONE,
  actual_start_time TIMESTAMP WITH TIME ZONE,
  actual_end_time TIMESTAMP WITH TIME ZONE,
  
  score JSONB,
  winner_registration_id UUID REFERENCES tournament_registrations(id),
  
  is_bye BOOLEAN DEFAULT false,
  forfait_team_id UUID REFERENCES tournament_registrations(id),
  forfait_type VARCHAR(50) CHECK (forfait_type IN (
    'excused', 'not_excused', 'abandon', 'no_show'
  )),
  
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'ready', 'in_progress', 'completed', 'cancelled', 'forfeit'
  )),
  
  next_match_id UUID REFERENCES tournament_matches(id),
  next_match_position VARCHAR(10) CHECK (next_match_position IN ('team1', 'team2') OR next_match_position IS NULL),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_matches_tournament ON tournament_matches(tournament_id);
CREATE INDEX idx_matches_pool ON tournament_matches(pool_id);
CREATE INDEX idx_matches_status ON tournament_matches(status);
CREATE INDEX idx_matches_scheduled ON tournament_matches(scheduled_time);
CREATE INDEX idx_matches_teams ON tournament_matches(team1_registration_id, team2_registration_id);

-- Table : Participants Americano/Mexicano
CREATE TABLE tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  total_points INTEGER DEFAULT 0,
  matches_played INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  matches_lost INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  games_lost INTEGER DEFAULT 0,
  
  current_ranking INTEGER,
  final_ranking INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_participant UNIQUE(tournament_id, player_id)
);

CREATE INDEX idx_participants_tournament ON tournament_participants(tournament_id);
CREATE INDEX idx_participants_ranking ON tournament_participants(tournament_id, current_ranking);

-- Table : Résolution tie-breaks
CREATE TABLE pool_tiebreaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES tournament_pools(id) ON DELETE CASCADE,
  
  teams_involved UUID[] NOT NULL,
  resolution_step INTEGER NOT NULL,
  resolution_method VARCHAR(100) NOT NULL,
  
  calculations JSONB,
  final_ranking JSONB NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tiebreaks_pool ON pool_tiebreaks(pool_id);

-- Table : Points disciplinaires
CREATE TABLE disciplinary_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
  
  points INTEGER NOT NULL CHECK (points > 0),
  reason TEXT NOT NULL,
  incident_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_disciplinary_player ON disciplinary_points(player_id, is_active);
CREATE INDEX idx_disciplinary_expires ON disciplinary_points(expires_at);

-- Fonction : Vérifier suspension
CREATE OR REPLACE FUNCTION check_player_suspension(p_player_id UUID)
RETURNS TABLE(is_suspended BOOLEAN, total_points INTEGER, suspension_end TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
  v_total_points INTEGER;
  v_suspension_end TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT COALESCE(SUM(points), 0) INTO v_total_points
  FROM disciplinary_points
  WHERE player_id = p_player_id
    AND is_active = true
    AND incident_date > NOW() - INTERVAL '1 year';
  
  IF v_total_points >= 10 THEN
    SELECT MAX(expires_at) INTO v_suspension_end
    FROM disciplinary_points
    WHERE player_id = p_player_id AND is_active = true;
    
    IF v_suspension_end IS NULL THEN
      v_suspension_end := NOW() + INTERVAL '21 days';
    END IF;
    
    RETURN QUERY SELECT true, v_total_points, v_suspension_end;
  ELSE
    RETURN QUERY SELECT false, v_total_points, NULL::TIMESTAMP WITH TIME ZONE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger : Updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registrations_updated_at BEFORE UPDATE ON tournament_registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON tournament_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_participants_updated_at BEFORE UPDATE ON tournament_participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_tiebreaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE disciplinary_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournaments are viewable by everyone"
  ON tournaments FOR SELECT USING (true);

CREATE POLICY "Club admins can manage their tournaments"
  ON tournaments FOR ALL
  USING (
    club_id IN (
      SELECT club_id FROM club_admins 
      WHERE user_id = auth.uid() AND activated_at IS NOT NULL
    )
  );

CREATE POLICY "Players can view their own registrations"
  ON tournament_registrations FOR SELECT
  USING (
    player1_id = auth.uid() 
    OR player2_id = auth.uid()
    OR tournament_id IN (
      SELECT id FROM tournaments WHERE club_id IN (
        SELECT club_id FROM club_admins WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Players can register themselves"
  ON tournament_registrations FOR INSERT
  WITH CHECK (player1_id = auth.uid() OR player2_id = auth.uid());

CREATE POLICY "Club admins can manage registrations"
  ON tournament_registrations FOR ALL
  USING (
    tournament_id IN (
      SELECT id FROM tournaments WHERE club_id IN (
        SELECT club_id FROM club_admins WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Matches are viewable by everyone"
  ON tournament_matches FOR SELECT USING (true);

CREATE POLICY "Club admins can manage matches"
  ON tournament_matches FOR ALL
  USING (
    tournament_id IN (
      SELECT id FROM tournaments WHERE club_id IN (
        SELECT club_id FROM club_admins WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Pools are viewable by everyone"
  ON tournament_pools FOR SELECT USING (true);
  
CREATE POLICY "Participants are viewable by everyone"
  ON tournament_participants FOR SELECT USING (true);
  
CREATE POLICY "Tiebreaks are viewable by everyone"
  ON pool_tiebreaks FOR SELECT USING (true);

CREATE POLICY "Players can view their disciplinary points"
  ON disciplinary_points FOR SELECT USING (player_id = auth.uid());

CREATE POLICY "Club admins can manage disciplinary points"
  ON disciplinary_points FOR ALL
  USING (
    tournament_id IN (
      SELECT id FROM tournaments WHERE club_id IN (
        SELECT club_id FROM club_admins WHERE user_id = auth.uid()
      )
    )
  );

COMMENT ON TABLE tournaments IS 'Table principale des tournois de padel';
COMMENT ON TABLE tournament_registrations IS 'Inscriptions des paires au tournoi';
COMMENT ON TABLE tournament_matches IS 'Matchs du tournoi avec scores détaillés';
COMMENT ON TABLE disciplinary_points IS 'Points disciplinaires FFT (10 points = 21 jours suspension)';

