
-- Migration: FINAL FIX FOR RLS RECURSION
-- Uses SECURITY DEFINER function to break infinite loops

-- 1. Create helper function to check admin status without RLS recursion
CREATE OR REPLACE FUNCTION public.check_is_club_admin(club_id_to_check text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.club_admins
    WHERE club_admins.club_id = club_id_to_check
    AND club_admins.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. CLEAN UP ALL POTENTIAL RECURSIVE POLICIES
-- On club_admins
DROP POLICY IF EXISTS "Admins can view their club admins" ON public.club_admins;
DROP POLICY IF EXISTS "Users can view own admin status" ON public.club_admins;
DROP POLICY IF EXISTS "Admins can invite other admins" ON public.club_admins;
DROP POLICY IF EXISTS "Only owner can remove admins" ON public.club_admins;

CREATE POLICY "club_admins_select" ON public.club_admins FOR SELECT TO authenticated
USING (user_id = auth.uid() OR check_is_club_admin(club_id));

CREATE POLICY "club_admins_insert" ON public.club_admins FOR INSERT TO authenticated
WITH CHECK (check_is_club_admin(club_id));

-- On clubs
DROP POLICY IF EXISTS "clubs_admin_update" ON public.clubs;
DROP POLICY IF EXISTS "clubs_public_read" ON public.clubs; -- ensure clean state

CREATE POLICY "clubs_public_read" ON public.clubs FOR SELECT USING (true);
CREATE POLICY "clubs_admin_update" ON public.clubs FOR UPDATE TO authenticated
USING (check_is_club_admin(id::text))
WITH CHECK (check_is_club_admin(id::text));

-- On courts
DROP POLICY IF EXISTS "courts_update_club_admin" ON public.courts;
DROP POLICY IF EXISTS "courts_insert_club_admin" ON public.courts;
DROP POLICY IF EXISTS "courts_delete_club_admin" ON public.courts;
DROP POLICY IF EXISTS "courts_select_all" ON public.courts;

CREATE POLICY "courts_select_all" ON public.courts FOR SELECT USING (true);
CREATE POLICY "courts_admin_manage" ON public.courts FOR ALL TO authenticated
USING (check_is_club_admin(club_id::text))
WITH CHECK (check_is_club_admin(club_id::text));

-- On reservations
DROP POLICY IF EXISTS "reservations_admin_manage" ON public.reservations;
DROP POLICY IF EXISTS "reservations_update_creator_or_admin" ON public.reservations;
DROP POLICY IF EXISTS "reservations_delete_creator_or_admin" ON public.reservations;

CREATE POLICY "reservations_admin_manage" ON public.reservations FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.courts c
    WHERE c.id = reservations.court_id
    AND check_is_club_admin(c.club_id::text)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courts c
    WHERE c.id = reservations.court_id
    AND check_is_club_admin(c.club_id::text)
  )
);

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ RLS RECURSION FIXED DEFINITIVELY with check_is_club_admin()';
END $$;
