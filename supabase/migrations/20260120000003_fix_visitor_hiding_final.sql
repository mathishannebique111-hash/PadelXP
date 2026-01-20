-- 1. Secure helper function to check admin role without RLS recursion
CREATE OR REPLACE FUNCTION public.check_is_club_admin(lookup_club_id uuid, lookup_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM club_admins 
    WHERE club_id::uuid = lookup_club_id
    AND user_id = lookup_user_id
  );
END;
$$;

-- 2. Fix Foreign Key constraint to point to profiles instead of auth.users
-- This allows hiding "orphan" profiles (visitors who no longer have a user account)
ALTER TABLE club_hidden_visitors
DROP CONSTRAINT IF EXISTS club_hidden_visitors_user_id_fkey;

ALTER TABLE club_hidden_visitors
ADD CONSTRAINT club_hidden_visitors_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Update Policies to use the secure function
-- First drop existing policies to ensure clean slate
drop policy if exists "Club admins can insert hidden visitors" on club_hidden_visitors;
drop policy if exists "Club admins can select hidden visitors" on club_hidden_visitors;
drop policy if exists "Club admins can delete hidden visitors" on club_hidden_visitors;

-- Re-create policies using the SECURITY DEFINER function
create policy "Club admins can insert hidden visitors"
  on club_hidden_visitors for insert
  to authenticated
  with check (
    check_is_club_admin(club_hidden_visitors.club_id, auth.uid())
  );

create policy "Club admins can select hidden visitors"
  on club_hidden_visitors for select
  to authenticated
  using (
    check_is_club_admin(club_hidden_visitors.club_id, auth.uid())
  );

create policy "Club admins can delete hidden visitors"
  on club_hidden_visitors for delete
  to authenticated
  using (
    check_is_club_admin(club_hidden_visitors.club_id, auth.uid())
  );

-- 4. Reload schema cache
NOTIFY pgrst, 'reload schema';
