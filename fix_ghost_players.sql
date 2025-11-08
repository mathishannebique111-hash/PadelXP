-- ============================================
-- FIX: Supprimer la contrainte de clé étrangère pour permettre les profils ghost
-- ============================================
-- Copie-colle ce script dans Supabase SQL Editor et exécute-le
-- Ce script supprime la contrainte qui lie profiles.id à auth.users.id
-- Cela permet de créer des profils pour des joueurs non inscrits (ghost players)

-- 1. Supprimer la contrainte de clé étrangère si elle existe
-- ============================================
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Mettre à jour les politiques RLS pour permettre la lecture des profils ghost
-- ============================================
-- Les profils ghost sont créés avec le service_role, donc ils ne sont pas liés à auth.uid()
-- On doit permettre à tous les utilisateurs authentifiés de lire tous les profils

-- Activer RLS si ce n'est pas déjà fait
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Supprimer l'ancienne policy de lecture restrictive
DROP POLICY IF EXISTS "read_league_profiles" ON public.profiles;

-- Nouvelle policy: tous les utilisateurs authentifiés peuvent lire tous les profils
CREATE POLICY "read_all_profiles"
ON public.profiles
FOR SELECT
USING (auth.role() = 'authenticated');

-- La policy INSERT reste inchangée (seulement pour son propre profil)
-- Mais les profils ghost sont créés via service_role qui bypass RLS

-- Note: Après cette modification, les profils ghost peuvent être créés
-- avec des UUID qui n'existent pas dans auth.users

