
-- Migration to add RLS update policy for clubs and refine courts policy
-- Permet aux administrateurs de club de modifier les informations de leur club et leurs terrains

-- 1. Autoriser les admins à modifier leur club (notamment opening_hours)
DROP POLICY IF EXISTS "clubs_admin_update" ON public.clubs;
CREATE POLICY "clubs_admin_update"
ON public.clubs
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM club_admins
    WHERE club_admins.club_id = clubs.id::text
    AND club_admins.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM club_admins
    WHERE club_admins.club_id = clubs.id::text
    AND club_admins.user_id = auth.uid()
  )
);

-- 2. Raffiner la policy de modification des terrains (courts)
-- On s'assure que le cast est correct et homogène
DROP POLICY IF EXISTS "courts_update_club_admin" ON public.courts;
CREATE POLICY "courts_update_club_admin"
ON public.courts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM club_admins 
    WHERE club_admins.club_id = courts.club_id::text 
    AND club_admins.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM club_admins 
    WHERE club_admins.club_id = courts.club_id::text 
    AND club_admins.user_id = auth.uid()
  )
);

-- 3. S'assurer que les admins peuvent aussi supprimer des réservations de leur club (blocages)
DROP POLICY IF EXISTS "reservations_admin_manage" ON public.reservations;
CREATE POLICY "reservations_admin_manage"
ON public.reservations
FOR ALL -- Permet INSERT, UPDATE, DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM courts c
    WHERE c.id = reservations.court_id
    AND EXISTS (
      SELECT 1 FROM club_admins ca
      WHERE ca.club_id = c.club_id::text
      AND ca.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM courts c
    WHERE c.id = reservations.court_id
    AND EXISTS (
      SELECT 1 FROM club_admins ca
      WHERE ca.club_id = c.club_id::text
      AND ca.user_id = auth.uid()
    )
  )
);

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Politiques RLS mises à jour pour les administrateurs de clubs (clubs, courts, reservations)';
END $$;
