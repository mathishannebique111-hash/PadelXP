import { CATEGORY_INFO } from "./levelQuestions";
import { selectThreeTips, type QuestionnaireAnswers, type UserProfile } from "./padelTips";

export interface AssessmentResponses {
  // Technique (Questions 1-7)
  vitres: number; // Q1: Gestion des balles après rebond sur la vitre de fond
  coupsBase: number; // Q2: Régularité en fond de court
  service: number; // Q3: Qualité de votre service
  volee: number; // Q4: Niveau à la volée
  smash: number; // Q5: Gestion des lobs adverses
  lobs: number; // Q6: Qualité et fréquence de vos lobs
  coupFiable: number; // Q7: Quel est votre coup le plus fiable sous pression
  // Tactique (Questions 8-13)
  transitions: number; // Q8: Zone de confort et positionnement
  lectureJeu: number; // Q9: Anticipation et lecture du jeu
  communication: number; // Q10: Communication avec le partenaire
  tempo: number; // Q11: Contrôle du tempo
  strategie: number; // Q12: Construction des points
  ratioRisque: number; // Q13: Votre ratio Risque / Réussite
  // Expérience (Questions 14-18)
  passeSportif: number; // Q14: Quel est votre passé sportif
  frequence: number; // Q15: Fréquence de jeu
  tournois: number; // Q16: Niveau de tournoi le plus élevé joué
  resultats: number; // Q17: Meilleurs résultats
  classementFFT: number; // Q18: Votre classement FFT
  // Physique (Questions 19-20)
  endurance: number; // Q19: Endurance sur match long
  pression: number; // Q20: Gestion de la pression
  // Situations (Questions 21-22)
  doublesVitres: number; // Q21: Balles en double vitre
  adversaireSup: number; // Q22: Contre niveau supérieur
}

export interface LevelResult {
  niveau: number;
  categorie: string;
  scoreGlobal: number;
  breakdown: {
    technique: number;
    tactique: number;
    experience: number;
    physique: number;
    situations: number;
    responses?: Record<string, number | number[]>;
  };
  strengths: string[];
  weaknesses: string[];
  tips: {
    technique: string;
    tactique: string;
    mental: string;
  };
  /**
   * Progression vers le niveau suivant (0-100).
   */
  nextLevelProgress: number;
}

export function calculatePadelLevel(
  responses: AssessmentResponses,
  userProfile?: UserProfile
): LevelResult {
  // Technique (7 questions) - 32% du score
  const scoreTechnique =
    (responses.vitres +
      responses.coupsBase +
      responses.service +
      responses.volee +
      responses.smash +
      responses.lobs +
      responses.coupFiable) /
    7;

  // Tactique (6 questions) - 28% du score
  const scoreTactique =
    (responses.transitions +
      responses.lectureJeu +
      responses.communication +
      responses.tempo +
      responses.strategie +
      responses.ratioRisque) /
    6;

  // Expérience (5 questions) - 30% du score
  const scoreExperience =
    (responses.passeSportif +
      responses.frequence +
      responses.tournois +
      responses.resultats +
      responses.classementFFT) /
    5;

  // Physique (2 questions) - 7% du score
  const scorePhysique = (responses.endurance + responses.pression) / 2;

  // Situations (2 questions) - 3% du score
  const scoreSituations =
    (responses.doublesVitres +
      responses.adversaireSup) /
    2;

  const scoreGlobal =
    scoreTechnique * CATEGORY_INFO.technique.weight +
    scoreTactique * CATEGORY_INFO.tactique.weight +
    scoreExperience * CATEGORY_INFO.experience.weight +
    scorePhysique * CATEGORY_INFO.physique.weight +
    scoreSituations * CATEGORY_INFO.situations.weight;

  let niveau = getNiveauFromScore(scoreGlobal);
  niveau = validateHighLevel(niveau, responses);

  const categorie = getCategorieFromLevel(niveau);
  const breakdown = {
    technique: scoreTechnique,
    tactique: scoreTactique,
    experience: scoreExperience,
    physique: scorePhysique,
    situations: scoreSituations,
    responses: responses as unknown as Record<string, number | number[]>,
  };
  const strengths = identifyStrengths(breakdown);
  const weaknesses = identifyWeaknesses(breakdown);

  // Convertir AssessmentResponses en QuestionnaireAnswers pour le nouveau système
  const answers: QuestionnaireAnswers = {
    q1: responses.vitres,
    q2: responses.coupsBase,
    q3: responses.service,
    q4: responses.volee,
    q5: responses.smash,
    q6: responses.lobs,
    q7: responses.coupFiable,
    q8: responses.transitions,
    q9: responses.lectureJeu,
    q10: responses.communication,
    q11: responses.tempo,
    q12: responses.strategie,
    q13: responses.ratioRisque,
    q14: responses.passeSportif,
    q15: responses.frequence,
    q16: responses.tournois,
    q17: responses.resultats,
    q18: responses.classementFFT,
    q19: responses.endurance,
    q20: responses.pression,
    q21: responses.doublesVitres,
    q22: responses.adversaireSup,
  };

  // Utiliser le nouveau système de conseils ultra-personnalisés
  const personalizedTips = selectThreeTips(answers, userProfile);

  const nextLevelProgress = calculateNextLevelProgress(scoreGlobal, niveau);

  return {
    niveau,
    categorie,
    scoreGlobal,
    breakdown,
    strengths,
    weaknesses,
    tips: {
      technique: personalizedTips[0],
      tactique: personalizedTips[1],
      mental: personalizedTips[2],
    },
    nextLevelProgress,
  };
}

function getNiveauFromScore(score: number): number {
  return Math.round(score * 100) / 100;
}

function validateHighLevel(
  niveau: number,
  responses: AssessmentResponses
): number {
  // Entier pour la validation
  const floorNiveau = Math.floor(niveau);

  // Validation basée sur le classement FFT et les résultats en tournois
  if (floorNiveau === 10 && (responses.classementFFT < 9 || responses.tournois < 8)) {
    return 9.9;
  }
  if (floorNiveau === 9 && responses.classementFFT < 7 && responses.tournois < 6) {
    return 8.9;
  }
  return niveau;
}

function getCategorieFromLevel(niveau: number): string {
  const floorNiveau = Math.floor(niveau);
  const categories: Record<number, string> = {
    1: "Débutant - Découverte",
    2: "Débutant - Perfectionnement",
    3: "Intermédiaire - Élémentaire",
    4: "Intermédiaire - Structuré",
    5: "Confirmé",
    6: "Avancé",
    7: "Expert Régional",
    8: "Expert National",
    9: "Pré-Professionnel",
    10: "Professionnel",
  };
  return categories[floorNiveau] ?? "Non évalué";
}

function identifyStrengths(breakdown: {
  technique: number;
  tactique: number;
  experience: number;
  physique: number;
  situations: number;
}): string[] {
  const strengths: string[] = [];
  const entries = Object.entries(breakdown).sort(
    (a, b) => b[1] - a[1]
  );

  entries.slice(0, 2).forEach(([key, value]) => {
    if (value >= 7) {
      const info = CATEGORY_INFO[key as keyof typeof CATEGORY_INFO];
      strengths.push(info.label);
    }
  });

  return strengths.length > 0 ? strengths : ["Continue à progresser !"];
}

function identifyWeaknesses(breakdown: {
  technique: number;
  tactique: number;
  experience: number;
  physique: number;
  situations: number;
}): string[] {
  const weaknesses: string[] = [];
  const entries = Object.entries(breakdown).sort(
    (a, b) => a[1] - b[1]
  );

  entries.slice(0, 2).forEach(([key, value]) => {
    if (value < 6) {
      const info = CATEGORY_INFO[key as keyof typeof CATEGORY_INFO];
      weaknesses.push(info.label);
    }
  });

  return weaknesses;
}

// Ancienne fonction generateRecommendations supprimée - remplacée par generateSmartRecommendations
// dans levelRecommendations.ts

function calculateNextLevelProgress(
  score: number,
  level: number
): number {
  const next = level + 0.5;
  const prev = level - 0.5;
  const raw = ((score - prev) / (next - prev)) * 100;
  return Math.min(Math.max(raw, 0), 100);
}

