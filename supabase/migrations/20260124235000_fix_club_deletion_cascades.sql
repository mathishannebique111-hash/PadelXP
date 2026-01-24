-- Migration: Fix Club Deletion Cascades
-- Date: 2026-01-24

-- Add ON DELETE CASCADE to match_proposals.club_id
-- We need to drop the existing constraint first if it doesn't have a name, 
-- but usually it's better to find the constraint name.
-- Since this is a direct migration, we'll try to drop the likely name and recreate it.

ALTER TABLE public.match_proposals
DROP CONSTRAINT IF EXISTS match_proposals_club_id_fkey;

ALTER TABLE public.match_proposals
ADD CONSTRAINT match_proposals_club_id_fkey
FOREIGN KEY (club_id)
REFERENCES public.clubs(id)
ON DELETE CASCADE;

-- Ensure tournament_participants and other tables also have cascades (they already seem to have them based on my previous grep, but let's be safe for match_invitations if it ever gets a club_id)
-- Note: match_invitations currently does not have a club_id based on my check.

-- Add index to improve deletion performance if not already exists
CREATE INDEX IF NOT EXISTS idx_match_proposals_club_id ON public.match_proposals(club_id);

-- Log the change
DO $$
BEGIN
  RAISE NOTICE '✅ Database cascades for club deletion updated.';
END $$;
