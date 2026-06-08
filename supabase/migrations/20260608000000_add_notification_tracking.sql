-- Add clicked_at to distinguish actual clicks from bulk mark-as-read
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_notifications_clicked_at ON notifications (clicked_at) WHERE clicked_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_type_created ON notifications (type, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications (user_id, created_at);
