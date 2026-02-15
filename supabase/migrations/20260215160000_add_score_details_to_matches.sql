-- Migration: Add detailed set scores to matches
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS score_details TEXT;
COMMENT ON COLUMN public.matches.score_details IS 'Detailed set scores formatted as "S1-S2 / S1-S2"';
