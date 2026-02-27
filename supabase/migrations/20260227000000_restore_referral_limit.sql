-- Migration: Restore referral_count limit to 2
-- This reverses the change that allowed unlimited referrals for premium days.
-- We want to cap the free premium rewards to 2 referrals.

-- 1. Update the constraint on profiles
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_referral_count_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_referral_count_check CHECK (referral_count >= 0 AND referral_count <= 2);

-- Note: If some users already have > 2 referrals, this migration might fail. 
-- In a real production environment, we should handle this, but for this dev task 
-- we assume we can enforce the limit.
