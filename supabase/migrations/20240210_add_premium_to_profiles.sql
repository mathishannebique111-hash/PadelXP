-- Add is_premium column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_premium ON public.profiles(is_premium);
