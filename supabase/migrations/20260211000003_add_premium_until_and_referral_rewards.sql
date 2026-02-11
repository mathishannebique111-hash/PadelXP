-- Migration: Add premium_until column and update referral reward system
-- Instead of boosts, referrals now grant 15 days of premium to both players

-- 1. Add premium_until column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS premium_until TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. Index for quick premium status checks
CREATE INDEX IF NOT EXISTS idx_profiles_premium_until 
  ON public.profiles(premium_until) 
  WHERE premium_until IS NOT NULL;

-- 3. Remove the referral_count limit of 2 (was CHECK constraint)
-- Allow unlimited referrals now (the old limit was for boosts)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_referral_count_check;

-- Re-add a simpler non-negative check
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_referral_count_check CHECK (referral_count >= 0);

-- 4. Add referral_premium_awarded columns to referrals table
ALTER TABLE public.referrals
ADD COLUMN IF NOT EXISTS referrer_premium_awarded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS referred_premium_awarded BOOLEAN DEFAULT false;
