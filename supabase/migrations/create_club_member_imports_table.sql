CREATE TABLE IF NOT EXISTS club_member_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id TEXT NOT NULL,
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  notes TEXT,
  raw_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS club_member_imports_email_unique
  ON club_member_imports (club_id, email_normalized);

ALTER TABLE club_member_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club admins can read member imports"
  ON club_member_imports
  FOR SELECT
  USING (
    club_id IN (SELECT club_id FROM club_admins WHERE user_id = auth.uid())
    OR created_by = auth.uid()
  );

CREATE POLICY "Club admins can insert member imports"
  ON club_member_imports
  FOR INSERT
  WITH CHECK (
    club_id IN (SELECT club_id FROM club_admins WHERE user_id = auth.uid())
    OR created_by = auth.uid()
  );

CREATE POLICY "Club admins can update member imports"
  ON club_member_imports
  FOR UPDATE
  USING (
    club_id IN (SELECT club_id FROM club_admins WHERE user_id = auth.uid())
    OR created_by = auth.uid()
  );

CREATE POLICY "Club admins can delete member imports"
  ON club_member_imports
  FOR DELETE
  USING (
    club_id IN (SELECT club_id FROM club_admins WHERE user_id = auth.uid())
    OR created_by = auth.uid()
  );

