-- =====================================================
-- Migration : Ajout des colonnes pour classements nationaux
-- et génération du tableau de tournoi
-- =====================================================

-- 1. Ajouter max_teams dans tournaments
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS max_teams INTEGER DEFAULT 16;

-- 2. Ajouter colonnes de classement dans tournament_registrations
ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS player1_name TEXT,
  ADD COLUMN IF NOT EXISTS player1_rank INTEGER,
  ADD COLUMN IF NOT EXISTS player2_name TEXT,
  ADD COLUMN IF NOT EXISTS player2_rank INTEGER,
  ADD COLUMN IF NOT EXISTS pair_total_rank INTEGER;

-- 3. S'assurer que seed_number existe (déjà dans la migration originale, mais on vérifie)
-- seed_number existe déjà dans la migration originale

-- 4. Vérifier que tournament_matches a les colonnes nécessaires
-- La table existe déjà avec round_type, match_order, team1_registration_id, team2_registration_id, etc.

-- 5. Ajouter un index sur pair_total_rank pour les tris rapides
CREATE INDEX IF NOT EXISTS idx_registrations_pair_total_rank 
  ON public.tournament_registrations(tournament_id, pair_total_rank);

-- 6. Ajouter un index sur seed_number
CREATE INDEX IF NOT EXISTS idx_registrations_seed_number 
  ON public.tournament_registrations(tournament_id, seed_number);

-- 7. Commentaires pour documentation
COMMENT ON COLUMN public.tournaments.max_teams IS 'Nombre maximum d''équipes acceptées dans le tournoi';
COMMENT ON COLUMN public.tournament_registrations.player1_rank IS 'Classement national du joueur 1 (ex: 50000 = 50000ème français)';
COMMENT ON COLUMN public.tournament_registrations.player2_rank IS 'Classement national du joueur 2 (ex: 40000 = 40000ème français)';
COMMENT ON COLUMN public.tournament_registrations.pair_total_rank IS 'Somme des classements des deux joueurs (plus bas = meilleure paire)';

