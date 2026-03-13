-- =============================================
-- FIX RLS VISIBILITY FOR RESERVATIONS & PARTICIPANTS (v2 - Fixed Recursion)
-- =============================================

-- 0. Function to check participation without recursion
-- SECURITY DEFINER allows bypassing RLS of the table being queried
CREATE OR REPLACE FUNCTION public.check_is_participant(res_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.reservation_participants
    WHERE reservation_id = res_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Relax reservation_participants SELECT policy
DROP POLICY IF EXISTS "res_participants_select_involved" ON reservation_participants;

CREATE POLICY "res_participants_select_involved"
ON reservation_participants FOR SELECT TO authenticated
USING (
  -- L'utilisateur est lui-même un participant de cette réservation (via fonction pour éviter la récursion)
  public.check_is_participant(reservation_id)
  OR 
  -- L'utilisateur est le créateur de la réservation
  EXISTS (
    SELECT 1 FROM public.reservations r 
    WHERE r.id = reservation_participants.reservation_id 
    AND r.created_by = auth.uid()
  )
  OR
  -- L'utilisateur est admin du club auquel appartient le terrain
  EXISTS (
    SELECT 1 FROM public.reservations r
    JOIN public.courts c ON c.id = r.court_id
    JOIN public.club_admins ca ON ca.club_id::uuid = c.club_id
    WHERE r.id = reservation_participants.reservation_id 
    AND ca.user_id = auth.uid()
  )
);

-- 2. Ensure reservations are visible to the right people (already SELECT true, but good to be explicit for other operations if needed)
-- (Normally reservations_select_all is already USING (true))

-- 3. Fix profiles visibility if needed (profiles should ideally be readable by all authenticated users for lookup)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_select_all'
    ) THEN
        CREATE POLICY "profiles_select_all" ON profiles FOR SELECT TO authenticated USING (true);
    END IF;
END $$;
