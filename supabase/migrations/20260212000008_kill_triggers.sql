
-- KILL BROKEN TRIGGERS
-- The trigger 'update_display_name_trigger' accesses 'NEW.first_name'.
-- The column 'first_name' DOES NOT EXIST in the 'profiles' table.
-- This causes a guaranteed CRASH (Error 500) on every signup.
-- We must delete it.

DROP TRIGGER IF EXISTS update_display_name_trigger ON public.profiles;
DROP FUNCTION IF EXISTS public.update_display_name();

DROP TRIGGER IF EXISTS trigger_set_referral_code ON public.profiles;
DROP FUNCTION IF EXISTS public.set_referral_code_if_null();

DROP TRIGGER IF EXISTS trigger_update_club_players_count ON public.profiles;
DROP FUNCTION IF EXISTS public.update_club_players_count();

-- Verification query to show they are gone
SELECT trigger_name 
FROM information_schema.triggers 
WHERE event_object_table = 'profiles';
