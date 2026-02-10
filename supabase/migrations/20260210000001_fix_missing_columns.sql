
-- Migration to add opening_hours to clubs and pricing to courts
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS opening_hours JSONB;
ALTER TABLE courts ADD COLUMN IF NOT EXISTS price_hour DECIMAL(10,2);
ALTER TABLE courts ADD COLUMN IF NOT EXISTS pricing_rules JSONB;
