-- Add column to track conversion
ALTER TABLE guest_players
ADD COLUMN IF NOT EXISTS converted_to_user_id UUID REFERENCES auth.users(id);

-- Function to handle the conversion
CREATE OR REPLACE FUNCTION handle_new_user_guest_conversion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_email text;
BEGIN
    -- Get the email of the new user from auth.users
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = NEW.id;

    -- If email found (should always be true for new users)
    IF user_email IS NOT NULL THEN
        -- 1. Update match_participants
        -- Re-assign entries from guest_players with this email to the new user
        -- We look for guest_players with the same email (case insensitive)
        UPDATE match_participants mp
        SET 
            user_id = NEW.id,
            player_type = 'user',
            guest_player_id = NULL
        FROM guest_players gp
        WHERE mp.guest_player_id = gp.id
        AND mp.player_type = 'guest'
        AND lower(gp.email) = lower(user_email)
        AND gp.converted_to_user_id IS NULL; -- Only process non-converted ones

        -- 2. Mark guest_players as converted
        UPDATE guest_players
        SET converted_to_user_id = NEW.id
        WHERE lower(email) = lower(user_email)
        AND converted_to_user_id IS NULL;
        
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger on public.profiles
DROP TRIGGER IF EXISTS on_profile_created_convert_guest ON profiles;
CREATE TRIGGER on_profile_created_convert_guest
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION handle_new_user_guest_conversion();
