-- Ajouter la colonne questionnaire_progress à la table profiles
-- Cette colonne stocke la progression du questionnaire d'évaluation de niveau
-- Format JSON: { currentQuestion: number, responses: Record<number, number | number[]>, updatedAt: string }

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS questionnaire_progress JSONB;

-- Commentaire pour documenter la colonne
COMMENT ON COLUMN public.profiles.questionnaire_progress IS 'Progression sauvegardée du questionnaire d''évaluation de niveau. Format: { currentQuestion: number, responses: Record<number, number | number[]>, updatedAt: string }';
