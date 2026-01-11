import { CATEGORY_INFO } from "./levelQuestions";
import { selectThreeTips } from "./padelTips";

export interface AssessmentResponses {
  vitres: number;
  coupsBase: number;
  service: number;
  volee: number;
  smash: number;
  coupsTechniques: number[];
  transitions: number;
  lectureJeu: number;
  communication: number;
  tempo: number;
  strategie: number;
  tournois: number;
  classementFFT: number;
  resultats: number;
  frequence: number;
  statutPro: number;
  classementIntl: number;
  revenus: number;
  endurance: number;
  pression: number;
  doublesVitres: number;
  retourService: number;
  adversaireSup: number;
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
  responses: AssessmentResponses
): LevelResult {
  const scoreTechnique =
    (responses.vitres +
      responses.coupsBase +
      responses.service +
      responses.volee +
      responses.smash +
      responses.coupsTechniques.reduce((sum, val) => sum + val, 0) / 2) /
    6;

  const scoreTactique =
    (responses.transitions +
      responses.lectureJeu +
      responses.communication +
      responses.tempo +
      responses.strategie) /
    5;

  const scoreExperience =
    (responses.tournois +
      responses.classementFFT +
      responses.resultats +
      responses.frequence +
      responses.statutPro +
      responses.classementIntl +
      responses.revenus) /
    7;

  const scorePhysique = (responses.endurance + responses.pression) / 2;
  const scoreSituations =
    (responses.doublesVitres +
      responses.retourService +
      responses.adversaireSup) /
    3;

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
  };
  const strengths = identifyStrengths(breakdown);
  const weaknesses = identifyWeaknesses(breakdown);
  
  // Utiliser le nouveau système de conseils (3 conseils distincts)
  const selectedTips = selectThreeTips(
    niveau,
    breakdown,
    {
      vitres: responses.vitres,
      coupsBase: responses.coupsBase,
      service: responses.service,
      volee: responses.volee,
      smash: responses.smash,
    }
  );
  
  const nextLevelProgress = calculateNextLevelProgress(scoreGlobal, niveau);

  return {
    niveau,
    categorie,
    scoreGlobal,
    breakdown,
    strengths,
    weaknesses,
    tips: {
      technique: selectedTips.technique.text,
      tactique: selectedTips.tactique.text,
      mental: selectedTips.mental.text,
    },
    nextLevelProgress,
  };
}

function getNiveauFromScore(score: number): number {
  if (score < 1.5) return 1;
  if (score < 2.5) return 2;
  if (score < 3.5) return 3;
  if (score < 4.5) return 4;
  if (score < 5.5) return 5;
  if (score < 6.5) return 6;
  if (score < 7.5) return 7;
  if (score < 8.5) return 8;
  if (score < 9.5) return 9;
  return 10;
}

function validateHighLevel(
  niveau: number,
  responses: AssessmentResponses
): number {
  if (niveau === 10 && (responses.statutPro < 9 || responses.classementIntl < 8)) {
    return 9;
  }
  if (niveau === 9 && responses.statutPro < 6 && responses.classementIntl < 6) {
    return 8;
  }
  return niveau;
}

function getCategorieFromLevel(niveau: number): string {
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
  return categories[niveau] ?? "Non évalué";
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

