ALTER TABLE club_admins
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE;

UPDATE club_admins
SET activated_at = COALESCE(activated_at, NOW())
WHERE role = 'owner';

