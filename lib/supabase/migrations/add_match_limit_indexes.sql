-- ============================================
-- INDEX POUR LIMITATION DE MATCHS PAR JOUR
-- ============================================
-- Ce script crée les index nécessaires pour optimiser les requêtes
-- de vérification de la limite de 2 matchs par jour et par joueur
-- Exécutez ce script dans Supabase SQL Editor

-- Index pour accélérer la recherche des matchs d'un joueur
-- Utilisé dans la requête: SELECT match_id FROM match_participants WHERE user_id = X AND player_type = 'user'
CREATE INDEX IF NOT EXISTS idx_match_participants_user_player_type 
ON public.match_participants(user_id, player_type);

-- Index pour accélérer le filtrage des matchs par date
-- Utilisé dans la requête: SELECT id FROM matches WHERE id IN (...) AND played_at >= ... AND played_at <= ...
CREATE INDEX IF NOT EXISTS idx_matches_played_at 
ON public.matches(played_at);

-- Index composite optionnel pour optimiser encore plus la requête
-- (peut être créé si les deux requêtes précédentes ne sont pas suffisamment performantes)
-- CREATE INDEX IF NOT EXISTS idx_match_participants_user_match 
-- ON public.match_participants(user_id, match_id) 
-- WHERE player_type = 'user';

