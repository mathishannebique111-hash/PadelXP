-- Migration to automatically grant admin rights to specific email
-- This handles the case where the admin account was deleted and needs to be restored

CREATE OR REPLACE FUNCTION public.handle_admin_restoration()
RETURNS TRIGGER AS $$
DECLARE
    user_email text;
BEGIN
    -- Get the email from auth.users
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = NEW.id;

    -- Check if this is the admin email
    IF user_email = 'contactpadelxp@gmail.com' THEN
        -- Force is_admin to true
        NEW.is_admin := true;
        -- Also ensure club_slug is set if needed, or handle redirection logic
        -- But mainly we want is_admin rights
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run BEFORE INSERT on profiles
-- This ensures the record is written with is_admin=true immediately
DROP TRIGGER IF EXISTS on_profile_created_admin_check ON profiles;
CREATE TRIGGER on_profile_created_admin_check
BEFORE INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION handle_admin_restoration();

-- Also run a one-time update in case the user already re-created the account
-- while this migration was being applied
DO $$
DECLARE
    target_user_id uuid;
BEGIN
    SELECT id INTO target_user_id
    FROM auth.users 
    WHERE email = 'contactpadelxp@gmail.com';

    IF target_user_id IS NOT NULL THEN
        UPDATE profiles 
        SET is_admin = true 
        WHERE id = target_user_id;
    END IF;
END $$;
