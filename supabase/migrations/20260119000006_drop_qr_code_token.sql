-- Migration: Supprimer le champ qr_code_token (fonctionnalité retirée)
-- Cette migration supprime la colonne ajoutée précédemment

-- Supprimer le champ qr_code_token de la table profiles
ALTER TABLE profiles 
DROP COLUMN IF EXISTS qr_code_token;
