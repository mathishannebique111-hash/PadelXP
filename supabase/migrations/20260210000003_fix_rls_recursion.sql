
-- Migration to fix infinite recursion in club_admins policies
-- AND ensure clubs/courts/reservations are manageable by admins

-- 1. FIX THE RECURSION IN club_admins
-- The old policy used "club_id IN (SELECT club_id FROM club_admins ...)" which is recursive.
-- We change it to allow users to see their own admin records.
-- If they need to see others in the same club, we'll need a better way, but this fixes the loop.
DROP POLICY IF EXISTS "Admins can view their club admins" ON public.club_admins;
CREATE POLICY "Admins can view their club admins"
  ON public.club_admins
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() -- Minimal check: you can see your own admin status
  );

-- 2. RE-APPLY THE CLUB UPDATE POLICY (Robust version)
-- We ensure the check on club_admins is consistent
DROP POLICY IF EXISTS "clubs_admin_update" ON public.clubs;
CREATE POLICY "clubs_admin_update"
ON public.clubs
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.club_admins
    WHERE club_admins.club_id = clubs.id::text
    AND club_admins.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.club_admins
    WHERE club_admins.club_id = clubs.id::text
    AND club_admins.user_id = auth.uid()
  )
);

-- 3. RE-APPLY THE COURTS UPDATE POLICY (To be sure)
DROP POLICY IF EXISTS "courts_update_club_admin" ON public.courts;
CREATE POLICY "courts_update_club_admin"
ON public.courts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.club_admins 
    WHERE club_admins.club_id = courts.club_id::text 
    AND club_admins.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.club_admins 
    WHERE club_admins.club_id = courts.club_id::text 
    AND club_admins.user_id = auth.uid()
  )
);

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ RLS Recursion fixed and update policies re-applied for clubs and courts';
END $$;
