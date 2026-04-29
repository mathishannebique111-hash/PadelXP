-- Add onboarding_reward_claimed flag to profiles
-- Used by the onboarding progress bar to know if the +20 points reward was claimed
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_reward_claimed BOOLEAN DEFAULT false;
