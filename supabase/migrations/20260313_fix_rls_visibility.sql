-- =============================================
-- FIX RLS VISIBILITY FOR RESERVATIONS & PARTICIPANTS
-- =============================================

-- 1. Relax reservation_participants SELECT policy
-- Allow anyone who is a participant of a reservation to see all other participants of that same reservation.
-- Also allow club admins to see all participants of reservations made on their club's courts.

DROP POLICY IF EXISTS "res_participants_select_involved" ON reservation_participants;

CREATE POLICY "res_participants_select_involved"
ON reservation_participants FOR SELECT TO authenticated
USING (
  -- L'utilisateur est lui-même un participant de cette réservation
  reservation_id IN (
    SELECT rp.reservation_id 
    FROM reservation_participants rp 
    WHERE rp.user_id = auth.uid()
  )
  OR 
  -- L'utilisateur est le créateur de la réservation
  EXISTS (
    SELECT 1 FROM reservations r 
    WHERE r.id = reservation_participants.reservation_id 
    AND r.created_by = auth.uid()
  )
  OR
  -- L'utilisateur est admin du club auquel appartient le terrain
  EXISTS (
    SELECT 1 FROM reservations r
    JOIN courts c ON c.id = r.court_id
    JOIN club_admins ca ON ca.club_id::uuid = c.club_id
    WHERE r.id = reservation_participants.reservation_id 
    AND ca.user_id = auth.uid()
  )
);

-- 2. Ensure reservations are visible to the right people (already SELECT true, but good to be explicit for other operations if needed)
-- (Normally reservations_select_all is already USING (true))

-- 3. Fix profiles visibility if needed (profiles should ideally be readable by all authenticated users for lookup)
-- Check if a policy exists, if not, create one or ensure it's open enough.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_select_all'
    ) THEN
        CREATE POLICY "profiles_select_all" ON profiles FOR SELECT TO authenticated USING (true);
    END IF;
END $$;
