-- Mettre à jour tous les clubs existants pour qu'ils soient considérés comme "Fondateurs"
-- Cela garantit qu'ils bénéficient du tarif de 39€/mois au lieu de 49€/mois
UPDATE clubs 
SET offer_type = 'founder' 
WHERE offer_type = 'standard' OR offer_type IS NULL;
