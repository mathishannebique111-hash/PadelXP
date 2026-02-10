-- Add price_hour to courts table for base price
ALTER TABLE "public"."courts" ADD COLUMN "price_hour" numeric;

-- Add pricing_rules to courts table for complex pricing (peak/off-peak)
-- Structure example: [{"days": [1,2,3,4,5], "start": "18:00", "end": "22:00", "price": 40}, ...]
ALTER TABLE "public"."courts" ADD COLUMN "pricing_rules" jsonb;

-- Add opening_hours to clubs table
-- Structure example: {"monday": {"open": "09:00", "close": "22:00"}, ...}
ALTER TABLE "public"."clubs" ADD COLUMN "opening_hours" jsonb;
