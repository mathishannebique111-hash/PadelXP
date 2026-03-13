-- =============================================
-- FIX RLS VISIBILITY & RECURSION (DEFINITIVE v3)
-- =============================================

-- 1. Function to check club admin status without RLS recursion
CREATE OR REPLACE FUNCTION public.is_club_admin(check_club_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.club_admins
    WHERE club_id = check_club_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to check reservation participation without RLS recursion
CREATE OR REPLACE FUNCTION public.is_reservation_participant(res_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.reservation_participants
    WHERE reservation_id = res_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update club_admins policies
DROP POLICY IF EXISTS "Users can view own admin status" ON club_admins;
DROP POLICY IF EXISTS "Admins can view their club admins" ON club_admins;

CREATE POLICY "Users can view own admin status"
  ON club_admins FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view their club admins"
  ON club_admins FOR SELECT TO authenticated
  USING (public.is_club_admin(club_id));

-- 4. Update reservations policies
DROP POLICY IF EXISTS "reservations_update_creator_or_admin" ON reservations;
DROP POLICY IF EXISTS "reservations_delete_creator_or_admin" ON reservations;

CREATE POLICY "reservations_select_all"
  ON reservations FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "reservations_update_involved"
  ON reservations FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_club_admin((SELECT c.club_id FROM public.courts c WHERE c.id = reservations.court_id))
  );

CREATE POLICY "reservations_delete_involved"
  ON reservations FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_club_admin((SELECT c.club_id FROM public.courts c WHERE c.id = reservations.court_id))
  );

-- 5. Update reservation_participants policies
DROP POLICY IF EXISTS "res_participants_select_involved" ON reservation_participants;
DROP POLICY IF EXISTS "res_participants_insert_organizer" ON reservation_participants;

CREATE POLICY "res_participants_select_involved"
  ON reservation_participants FOR SELECT TO authenticated
  USING (
    public.is_reservation_participant(reservation_id)
    OR EXISTS (
      SELECT 1 FROM public.reservations r 
      WHERE r.id = reservation_participants.reservation_id 
      AND (r.created_by = auth.uid() OR public.is_club_admin((SELECT c.club_id FROM public.courts c WHERE c.id = r.court_id)))
    )
  );

CREATE POLICY "res_participants_all_involved"
  ON reservation_participants FOR ALL TO authenticated
  USING (
    public.is_reservation_participant(reservation_id)
    OR EXISTS (
      SELECT 1 FROM public.reservations r 
      WHERE r.id = reservation_participants.reservation_id 
      AND (r.created_by = auth.uid() OR public.is_club_admin((SELECT c.club_id FROM public.courts c WHERE c.id = r.court_id)))
    )
  );

-- 6. profiles visibility
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_select_all') THEN
        CREATE POLICY "profiles_select_all" ON profiles FOR SELECT TO authenticated USING (true);
    END IF;
END $$;
