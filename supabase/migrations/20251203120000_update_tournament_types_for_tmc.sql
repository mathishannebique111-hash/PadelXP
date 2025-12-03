-- Migration : Mise à jour des types de tournois pour supporter TMC et nouveaux formats

-- 1. Mettre à jour la contrainte CHECK sur tournaments.tournament_type
ALTER TABLE public.tournaments
  DROP CONSTRAINT IF EXISTS tournaments_tournament_type_check;

ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_tournament_type_check
  CHECK (tournament_type IN (
    'official_knockout',
    'tmc',
    'double_elimination',
    'official_pools',
    'pools_triple_draw',
    'round_robin',
    'americano',
    'mexicano',
    'custom'
  ));

-- 2. (Optionnel) Commentaire de documentation
COMMENT ON COLUMN public.tournaments.tournament_type IS
  'Type de tournoi (élimination directe, TMC, poules + tableau final, etc.)';


