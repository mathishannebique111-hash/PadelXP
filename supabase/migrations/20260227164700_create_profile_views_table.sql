-- Création de la table des vues de profil
CREATE TABLE IF NOT EXISTS public.profile_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    viewed_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activation de RLS
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- Index pour les performances
CREATE INDEX IF NOT EXISTS profile_views_viewed_id_idx ON public.profile_views(viewed_id);
CREATE INDEX IF NOT EXISTS profile_views_viewer_id_idx ON public.profile_views(viewer_id);

-- Politiques RLS

-- 1. Permettre aux utilisateurs d'enregistrer une visite (Insert)
-- On ne permet l'insertion que si viewer_id est l'utilisateur connecté
CREATE POLICY "Users can record their own profile views" 
ON public.profile_views 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = viewer_id);

-- 2. Permettre aux utilisateurs de voir qui a consulté leur profil (Select)
-- Un utilisateur peut voir toutes les lignes où viewed_id est son propre ID
CREATE POLICY "Users can see who viewed their own profile" 
ON public.profile_views 
FOR SELECT 
TO authenticated 
USING (auth.uid() = viewed_id);

-- Note : On pourrait restreindre le SELECT aux membres PREMIUM ici, 
-- mais pour l'instant on laisse l'accès et on gérera éventuellement le flou/blocage côté UI si besoin.
