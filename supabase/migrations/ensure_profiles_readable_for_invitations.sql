-- =============================================
-- ASSURER LA LECTURE DES PROFILS POUR LES INVITATIONS
-- =============================================
-- Cette migration garantit que les utilisateurs authentifiés peuvent lire
-- les profils des joueurs avec qui ils ont des invitations de match

-- Activer RLS si ce n'est pas déjà fait
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Vérifier si la policy "read_all_profiles" existe déjà (créée par fix_ghost_players.sql)
-- Si elle n'existe pas, la créer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'read_all_profiles'
  ) THEN
    -- Policy: Tous les utilisateurs authentifiés peuvent lire tous les profils
    -- (nécessaire pour afficher les noms/avatars dans les invitations)
    CREATE POLICY "read_all_profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Commentaire
COMMENT ON POLICY "read_all_profiles" ON public.profiles IS 
'Permet à tous les utilisateurs authentifiés de lire tous les profils (nécessaire pour afficher les invitations de match et les profils ghost)';
