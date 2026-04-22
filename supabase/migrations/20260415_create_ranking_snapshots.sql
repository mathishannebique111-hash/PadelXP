-- Migration: create ranking_snapshots table
-- Stores the last known rank per user per scope to detect ranking changes

CREATE TABLE IF NOT EXISTS ranking_snapshots (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    scope           TEXT NOT NULL CHECK (scope IN ('club', 'department', 'region', 'national')),
    last_rank       INTEGER NOT NULL,
    last_points     INTEGER NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, scope)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ranking_snapshots_user_id ON ranking_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_ranking_snapshots_scope ON ranking_snapshots(scope);

-- RLS: only service_role can read/write (used by cron exclusively)
ALTER TABLE ranking_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON ranking_snapshots
    FOR ALL TO service_role USING (true) WITH CHECK (true);
