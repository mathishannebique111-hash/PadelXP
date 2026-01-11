-- =============================================
-- FIX SCRIPT: Partnership Visibility & Policies
-- =============================================

-- 1. Ensure RLS is enabled
ALTER TABLE public.player_partnerships ENABLE ROW LEVEL SECURITY;

-- 2. RESET All Policies to be 100% sure
DROP POLICY IF EXISTS "Users see their partnerships" ON public.player_partnerships;
DROP POLICY IF EXISTS "Users create partnerships" ON public.player_partnerships;
DROP POLICY IF EXISTS "Users update their partnerships" ON public.player_partnerships;
DROP POLICY IF EXISTS "Users delete their partnerships" ON public.player_partnerships;

-- 3. Create Correct Policies

-- A. SELECT: Users can see requests where they are player OR partner
CREATE POLICY "Users see their partnerships"
ON public.player_partnerships FOR SELECT TO authenticated
USING (
  auth.uid() = player_id OR 
  auth.uid() = partner_id
);

-- B. INSERT: Users can create requests where they are the primary player
CREATE POLICY "Users create partnerships"
ON public.player_partnerships FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = player_id
);

-- C. UPDATE: 
-- Partners can accept/decline (change status)
-- Players can theoretically update too, but usually it's the partner complying
CREATE POLICY "Users update their partnerships"
ON public.player_partnerships FOR UPDATE TO authenticated
USING (
  auth.uid() = partner_id OR 
  auth.uid() = player_id
);

-- D. DELETE: 
-- Users can cancel their own SENT requests (player_id)
-- Users can decline/remove RECEIVED requests (partner_id)
CREATE POLICY "Users delete their partnerships"
ON public.player_partnerships FOR DELETE TO authenticated
USING (
  auth.uid() = player_id OR 
  auth.uid() = partner_id
);

-- 4. Verify no data is hidden (Optional, just ensures permissions)
GRANT ALL ON TABLE public.player_partnerships TO authenticated;
GRANT ALL ON TABLE public.player_partnerships TO service_role;

-- 5. Force schema cache reload
NOTIFY pgrst, 'reload schema';
