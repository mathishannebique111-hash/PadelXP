
-- Migration to move opening hours to per-court level
-- This allows each court to have its own schedule and slot duration

-- 1. Add opening_hours to courts
-- We store isOpen, openTime, closeTime AND slotDuration (minutes) per day
ALTER TABLE public.courts ADD COLUMN IF NOT EXISTS "opening_hours" JSONB;

-- 2. Migrate existing global club schedule to all courts of that club (best effort)
DO $$
DECLARE
    club_record RECORD;
BEGIN
    FOR club_record IN SELECT id, opening_hours FROM public.clubs WHERE opening_hours IS NOT NULL LOOP
        UPDATE public.courts 
        SET opening_hours = club_record.opening_hours
        WHERE club_id = club_record.id AND opening_hours IS NULL;
    END LOOP;
END $$;

-- 3. Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Horaires déplacés au niveau des terrains (courts)';
END $$;
