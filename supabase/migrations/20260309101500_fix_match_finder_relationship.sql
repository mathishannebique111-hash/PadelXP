-- Migration to fix relationship between match_finder and profiles
-- This adds explicit foreign keys to allow Supabase joins

-- 1. creator_id in match_finder
ALTER TABLE match_finder
DROP CONSTRAINT IF EXISTS match_finder_creator_id_fkey;

ALTER TABLE match_finder
ADD CONSTRAINT match_finder_creator_id_fkey 
FOREIGN KEY (creator_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- 2. user_id in match_finder_participants
ALTER TABLE match_finder_participants
DROP CONSTRAINT IF EXISTS match_finder_participants_user_id_fkey;

ALTER TABLE match_finder_participants
ADD CONSTRAINT match_finder_participants_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;
