-- ============================================
-- S'assurer que la table clubs est lisible par tous les utilisateurs authentifiés
-- ============================================

-- Activer RLS sur la table clubs
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- Supprimer toutes les anciennes policies
DROP POLICY IF EXISTS "clubs_select_public" ON public.clubs;
DROP POLICY IF EXISTS "clubs_select_all" ON public.clubs;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.clubs;
DROP POLICY IF EXISTS "Allow public read access" ON public.clubs;

-- Créer une policy qui permet la lecture à tous les utilisateurs authentifiés
CREATE POLICY "clubs_public_read"
ON public.clubs
FOR SELECT
USING (true);

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Politique RLS pour clubs mise à jour : lecture publique activée';
END $$;









