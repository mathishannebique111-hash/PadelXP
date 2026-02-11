-- Enable RLS on guest_players table
ALTER TABLE public.guest_players ENABLE ROW LEVEL SECURITY;

-- 1. Allow ALL authenticated users to view guest players
-- This is necessary so that if User A invites a guest, User B (partner/opponent) can see the guest's name in the match history.
DROP POLICY IF EXISTS "Authenticated users can select guest players" ON public.guest_players;
CREATE POLICY "Authenticated users can select guest players"
ON public.guest_players
FOR SELECT
TO authenticated
USING (true);

-- 2. Allow authenticated users to insert guest players
-- They must set invited_by_user_id to their own ID
DROP POLICY IF EXISTS "Authenticated users can insert guest players" ON public.guest_players;
CREATE POLICY "Authenticated users can insert guest players"
ON public.guest_players
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = invited_by_user_id);

-- 3. Allow users to update guests they invited
DROP POLICY IF EXISTS "Creators can update their guest players" ON public.guest_players;
CREATE POLICY "Creators can update their guest players"
ON public.guest_players
FOR UPDATE
TO authenticated
USING (auth.uid() = invited_by_user_id);

-- 4. Allow users to delete guests they invited (optional, but good practice)
DROP POLICY IF EXISTS "Creators can delete their guest players" ON public.guest_players;
CREATE POLICY "Creators can delete their guest players"
ON public.guest_players
FOR DELETE
TO authenticated
USING (auth.uid() = invited_by_user_id);
