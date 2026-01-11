-- =============================================
-- FORCE FIX: Permissions et Cache
-- =============================================

-- 1. S'assurer que le rôle authentifié a bien les droits
GRANT ALL ON TABLE public.player_partnerships TO authenticated;
GRANT ALL ON TABLE public.player_partnerships TO service_role;
GRANT ALL ON TABLE public.player_partnerships TO postgres;

-- 2. S'assurer que les séquences sont accessibles (si ID est serial/identity, pas uuid gen_random)
-- Pour UUID gen_random(), pas besoin, mais bon à savoir.

-- 3. Forcer le rechargement du cache de schéma
NOTIFY pgrst, 'reload schema';

-- 4. Vérifier que la table est bien là
SELECT 'Table exists' as status, count(*) as count FROM public.player_partnerships;
