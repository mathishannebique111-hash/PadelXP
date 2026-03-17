-- =============================================
-- FIX RLS VISIBILITY & RECURSION (DEFINITIVE v4)
-- =============================================

-- 0. Clean up previous attempts
DROP FUNCTION IF EXISTS public.check_is_participant(UUID);
DROP FUNCTION IF EXISTS public.is_club_admin(TEXT);
DROP FUNCTION IF EXISTS public.is_reservation_participant(UUID);

-- 1. Function to check club admin status (No recursion)
-- We use SECURITY DEFINER and SET search_path to ensure it runs as postgres with clear scope
CREATE OR REPLACE FUNCTION public.is_club_admin(check_club_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.club_admins
    WHERE club_id = check_club_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Function to check reservation participation (No recursion)
CREATE OR REPLACE FUNCTION public.is_reservation_participant(res_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.reservation_participants
    WHERE reservation_id = res_id
    AND user_id = auth.uid()
  );
END;
-- CRITICAL: SECURITY DEFINER bypasses RLS to prevent infinite recursion
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Revoke/Grant permissions to ensure they are used correctly
REVOKE ALL ON FUNCTION public.is_club_admin(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.is_club_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_club_admin(TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.is_reservation_participant(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.is_reservation_participant(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_reservation_participant(UUID) TO service_role;

-- 4. Update club_admins policies
ALTER TABLE club_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own admin status" ON club_admins;
DROP POLICY IF EXISTS "Admins can view their club admins" ON club_admins;

CREATE POLICY "club_admins_select_self"
  ON club_admins FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "club_admins_select_admins"
  ON club_admins FOR SELECT TO authenticated
  USING (public.is_club_admin(club_id));

-- 5. Update reservations policies
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reservations_select_all" ON reservations;
DROP POLICY IF EXISTS "reservations_update_involved" ON reservations;
DROP POLICY IF EXISTS "reservations_delete_involved" ON reservations;

CREATE POLICY "reservations_select_all"
  ON reservations FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "reservations_update_involved"
  ON reservations FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_club_admin((SELECT c.club_id FROM courts c WHERE c.id = court_id))
  );

CREATE POLICY "reservations_delete_involved"
  ON reservations FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_club_admin((SELECT c.club_id FROM courts c WHERE c.id = court_id))
  );

-- 6. Update reservation_participants policies
ALTER TABLE reservation_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "res_participants_select_involved" ON reservation_participants;
DROP POLICY IF EXISTS "res_participants_all_involved" ON reservation_participants;

-- Allow any authenticated user to SELECT participants (Social lookup)
-- This is the SAFEST way to avoid recursion and is common for social features
CREATE POLICY "res_participants_select_all"
  ON reservation_participants FOR SELECT TO authenticated
  USING (true);

-- Actions (INSERT, UPDATE, DELETE) are still restricted
CREATE POLICY "res_participants_modify_involved"
  ON reservation_participants FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    -- Only allow if the user is the one associated with the record
    -- Removing the public.is_reservation_participant check entirely from here
    -- because modifying another participant requires being the creator OR club admin
    -- Doing this prevents 100% of all circular dependencies on this table.
    OR EXISTS (
      -- Is the current user the creator of the reservation?
      SELECT 1 FROM public.reservations r 
      WHERE r.id = reservation_id 
      AND r.created_by = auth.uid()
    )
    OR public.is_club_admin((
        -- Is the current user admin of the club?
        SELECT c.club_id 
        FROM public.courts c 
        WHERE c.id = (
            SELECT r.court_id 
            FROM public.reservations r 
            WHERE r.id = reservation_participants.reservation_id
        )
    )::text)
  );
