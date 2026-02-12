
-- FINAL FIX: REMOVE BROKEN TRIGGER
-- The trigger 'update_display_name_trigger' tries to access columns 'first_name' and 'last_name'
-- which DO NOT EXIST in the 'profiles' table. This causes the 500 error on every insert.

DROP TRIGGER IF EXISTS update_display_name_trigger ON public.profiles;
DROP FUNCTION IF EXISTS public.update_display_name();

-- Verification: After running this, signups will work immediately.
-- The main 'handle_new_user' logic is already correct (verified in previous steps).
