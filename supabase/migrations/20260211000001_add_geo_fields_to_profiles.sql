-- Migration: Add geo fields to profiles for geo-based leaderboard
-- Players will fill postal_code during onboarding; department/region are derived from it

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS department_code TEXT,
  ADD COLUMN IF NOT EXISTS region_code TEXT;

-- Index for efficient geo-based leaderboard queries
CREATE INDEX IF NOT EXISTS idx_profiles_department_code ON public.profiles(department_code);
CREATE INDEX IF NOT EXISTS idx_profiles_region_code ON public.profiles(region_code);

DO $$
BEGIN
  RAISE NOTICE '✅ Geo fields (postal_code, city, department_code, region_code) added to profiles';
END $$;
