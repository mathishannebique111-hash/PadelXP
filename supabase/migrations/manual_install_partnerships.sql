-- =============================================
-- REPAIR SCRIPT: Create Partnerships Table
-- =============================================

-- 1. Create the table if it's missing (Primary issue)
CREATE TABLE IF NOT EXISTS public.player_partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, partner_id),
  CHECK (player_id != partner_id)
);

-- 2. Create Indexes
CREATE INDEX IF NOT EXISTS idx_partnerships_player ON public.player_partnerships(player_id);
CREATE INDEX IF NOT EXISTS idx_partnerships_partner ON public.player_partnerships(partner_id);
CREATE INDEX IF NOT EXISTS idx_partnerships_status ON public.player_partnerships(status);

-- 3. Enable RLS
ALTER TABLE public.player_partnerships ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies
DROP POLICY IF EXISTS "Users see their partnerships" ON public.player_partnerships;
CREATE POLICY "Users see their partnerships"
ON public.player_partnerships FOR SELECT TO authenticated
USING (player_id = auth.uid() OR partner_id = auth.uid());

DROP POLICY IF EXISTS "Users create partnerships" ON public.player_partnerships;
CREATE POLICY "Users create partnerships"
ON public.player_partnerships FOR INSERT TO authenticated
WITH CHECK (player_id = auth.uid());

DROP POLICY IF EXISTS "Users update their partnerships" ON public.player_partnerships;
CREATE POLICY "Users update their partnerships"
ON public.player_partnerships FOR UPDATE TO authenticated
USING (partner_id = auth.uid());

-- 5. Force Grant Permissions (just in case)
GRANT ALL ON TABLE public.player_partnerships TO authenticated;
GRANT ALL ON TABLE public.player_partnerships TO service_role;
GRANT ALL ON TABLE public.player_partnerships TO postgres;

-- 6. Reload Schema
NOTIFY pgrst, 'reload schema';
