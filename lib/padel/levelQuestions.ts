export type QuestionCategory =
  | "technique"
  | "tactique"
  | "experience"
  | "physique"
  | "situations";

export interface QuestionOption {
  label: string;
  description?: string;
  points: number;
}

export interface Question {
  id: number;
  category: QuestionCategory;
  question: string;
  description?: string;
  options: QuestionOption[];
  /**
   * Si true, l'utilisateur peut choisir plusieurs options.
   */
  multiple?: boolean;
}

export const PADEL_QUESTIONS: Question[] = [
  // CATÉGORIE 1 : TECHNIQUE (Questions 1-7) - 32% du score
  {
    id: 1,
    category: "technique",
    question: "Gestion des balles après rebond sur la vitre de fond ?",
    options: [
      { label: "Je la laisse passer, je ne sais pas la jouer", points: 1 },
      { label: "Je la remets simplement en cloche", points: 3 },
      { label: "Je bloque la balle pour la remettre à plat", points: 5 },
      { label: "J'utilise sa vitesse pour lober ou jouer une chiquita", points: 8 },
      { label: "Je peux attaquer (Bajada) ou sortir la balle", points: 10 },
    ],
  },
  {
    id: 2,
    category: "technique",
    question: "Régularité en fond de court ?",
    options: [
      { label: "Moins de 3 échanges", points: 1 },
      { label: "3-6 échanges, je fais souvent la faute", points: 3 },
      { label: "Capacité à tenir 10+ échanges à vitesse lente", points: 6 },
      { label: "Je tiens l'échange même si l'adversaire accélère", points: 8 },
      { label: "Je ne fais quasiment jamais de faute directe non provoquée", points: 10 },
    ],
  },
  {
    id: 3,
    category: "technique",
    question: "Qualité de votre service ?",
    options: [
      { label: "Basique, souvent dans le filet", points: 1 },
      { label: "Régulier mais prévisible", points: 3 },
      { label: "Varié (puissant/lifté/slicé)", points: 6 },
      { label: "Placement précis (vitre/T) + effets gênants", points: 9 },
      { label: "Service-volée agressif et tactique", points: 10 },
    ],
  },
  {
    id: 4,
    category: "technique",
    question: "Niveau à la volée ?",
    options: [
      { label: "Je reste au fond, je ne monte pas", points: 1 },
      { label: "Je monte mais je rate ou je donne des balles faciles", points: 3 },
      { label: "Je tiens la volée sur balles lentes", points: 6 },
      { label: "Volées claquées et réflexes au filet maîtrisés", points: 8 },
      { label: "Volées de finition et amorties maîtrisées", points: 10 },
    ],
  },
  {
    id: 5,
    category: "technique",
    question: "Gestion des lobs adverses courts ?",
    options: [
      { label: "Je laisse rebondir, je ne smash pas", points: 1 },
      { label: "Je frappe fort sans contrôle (souvent faute ou vitre)", points: 3 },
      { label: "J'assure une bandeja de sécurité au centre", points: 6 },
      { label: "Je termine le point si la balle est facile (Smash par 4)", points: 8 },
      { label: "Je maîtrise la Vibora, le Rulo à la grille et le Par 3", points: 10 },
    ],
  },
  {
    id: 6,
    category: "technique",
    question: "Qualité et fréquence de vos lobs ?",
    options: [
      { label: "Souvent trop courts ou dehors", points: 1 },
      { label: "Je les utilise uniquement en dernier recours (Défense pure)", points: 3 },
      { label: "J'arrive à faire reculer les adversaires, mais hauteur variable", points: 6 },
      { label: "Lobs profonds (ballons) qui collent les adversaires à la vitre", points: 8 },
      { label: "Mon arme principale : je lobe au millimètre pour reprendre le filet", points: 10 },
    ],
  },
  {
    id: 7,
    category: "technique",
    question: "Quel est votre coup le plus fiable sous pression ?",
    options: [
      { label: "Aucun coup particulier", points: 1 },
      { label: "Le coup droit à plat", points: 3 },
      { label: "Le lob profond", points: 6 },
      { label: "La volée de finition", points: 8 },
      { label: "La Bajada ou la sortie de piste", points: 10 },
    ],
  },

  // CATÉGORIE 2 : TACTIQUE (Questions 8-13) - 28% du score
  {
    id: 8,
    category: "tactique",
    question: "Zone de confort et positionnement ?",
    options: [
      { label: "Je reste scotché au fond de court", points: 1 },
      { label: "Je suis attiré par la balle, je me place mal", points: 3 },
      { label: "Je monte au filet quand mon partenaire monte", points: 6 },
      { label: "Je respecte les transitions attaque/défense (bloc équipe)", points: 8 },
      { label: "Je sais défendre devant ma ligne et attaquer depuis le fond", points: 10 },
    ],
  },
  {
    id: 9,
    category: "tactique",
    question: "Anticipation et lecture du jeu ?",
    options: [
      { label: "Je suis souvent surpris par la balle", points: 1 },
      { label: "Je réagis après la frappe adverse", points: 3 },
      { label: "Je suis bien placé 70% du temps", points: 6 },
      { label: "J'anticipe la zone de jeu adverse", points: 8 },
      { label: "Je \"lis\" le coup adverse avant la frappe", points: 10 },
    ],
  },
  {
    id: 10,
    category: "tactique",
    question: "Communication avec le partenaire ?",
    options: [
      { label: "Silence radio ou on se gêne", points: 1 },
      { label: "Basique (\"J'ai\", \"Laisse\")", points: 3 },
      { label: "Communication tactique (annonce position adverse)", points: 6 },
      { label: "Stratégie élaborée en temps réel et encouragement constant", points: 10 },
    ],
  },
  {
    id: 11,
    category: "tactique",
    question: "Contrôle du tempo ?",
    options: [
      { label: "Je subis totalement le jeu", points: 1 },
      { label: "Je joue toujours à la même vitesse", points: 3 },
      { label: "Je sais quand ralentir (lob) pour reprendre le filet", points: 6 },
      { label: "Je varie les effets et vitesses pour gêner", points: 8 },
      { label: "Je dicte le tempo : j'endors ou j'accélère à volonté", points: 10 },
    ],
  },
  {
    id: 12,
    category: "tactique",
    question: "Construction des points ?",
    options: [
      { label: "Frappe fort sans réfléchir", points: 1 },
      { label: "Place quelques coups basiques", points: 3 },
      { label: "Séquences simples", points: 6 },
      { label: "Crée des ouvertures puis attaque", points: 8 },
      { label: "Stratégie élaborée, joue les faiblesses", points: 10 },
    ],
  },
  {
    id: 13,
    category: "tactique",
    question: "Votre ratio Risque / Réussite ?",
    options: [
      { label: "Je tente le coup gagnant dès que je touche la balle (Beaucoup de fautes)", points: 2 },
      { label: "Je n'ose pas attaquer, je renvoie juste la balle (Jeu passif)", points: 4 },
      { label: "J'attaque seulement les balles très faciles (Jeu propre)", points: 6 },
      { label: "Je provoque la faute adverse par ma pression constante", points: 8 },
      { label: "Je ne fais quasiment aucune faute directe (\"Zéro faute\")", points: 10 },
    ],
  },

  // CATÉGORIE 3 : EXPÉRIENCE (Questions 14-18) - 30% du score
  {
    id: 14,
    category: "experience",
    question: "Quel est votre passé sportif (Sports de raquette) ?",
    options: [
      { label: "Aucun ou sport collectif", points: 0 },
      { label: "Badminton / Squash / Tennis de Table (Loisir)", points: 2 },
      { label: "Tennis (Niveau 4ème série / Début 3ème série)", points: 5 },
      { label: "Squash (Compétition) ou Tennis (Fin 3ème série - 15/1)", points: 8 },
      { label: "Tennis (2ème série / Négatif) ou Padel intensif depuis l'enfance", points: 10 },
    ],
  },
  {
    id: 15,
    category: "experience",
    question: "Fréquence de jeu ?",
    options: [
      { label: "1-2x par mois", points: 2 },
      { label: "1x / semaine", points: 5 },
      { label: "2-3x / semaine", points: 8 },
      { label: "+ de 3x / semaine", points: 10 },
    ],
  },
  {
    id: 16,
    category: "experience",
    question: "Niveau de tournoi le plus élevé joué (au moins 2 fois) ?",
    options: [
      { label: "Jamais", points: 0 },
      { label: "Tournois internes / Loisirs", points: 2 },
      { label: "P25 réguliers", points: 4 },
      { label: "P100 (Je passe des tours)", points: 6 },
      { label: "P250 (Tableau final)", points: 8 },
      { label: "P500 et plus", points: 10 },
    ],
  },
  {
    id: 17,
    category: "experience",
    question: "Meilleurs résultats (tous tournois confondus) ?",
    options: [
      { label: "Victoire en poules / quarts P25", points: 1 },
      { label: "Victoire P25 / Podium P100", points: 3 },
      { label: "Victoire P100 / Quarts P250", points: 5 },
      { label: "Victoire P250 / Quarts P500", points: 7 },
      { label: "Victoire P500 / Quarts P1000", points: 9 },
      { label: "Performe en P1000 / P1500", points: 10 },
    ],
  },
  {
    id: 18,
    category: "experience",
    question: "Votre classement FFT (Estimation ou Réel) ?",
    options: [
      { label: "Non classé / Débutant", points: 0 },
      { label: "Au-delà de la 20 000ème place", points: 3 },
      { label: "Entre 10 000 et 20 000", points: 5 },
      { label: "Entre 3 000 et 10 000", points: 7 },
      { label: "Top 3 000", points: 9 },
      { label: "Top 1 000", points: 10 },
    ],
  },

  // CATÉGORIE 4 : PHYSIQUE (Questions 19-20) - 7% du score
  {
    id: 19,
    category: "physique",
    question: "Endurance sur match long ?",
    options: [
      { label: "Fatigué après 30min", points: 2 },
      { label: "1h avec baisse de niveau", points: 4 },
      { label: "1h30 sans problème", points: 6 },
      { label: "2h+ intensité constante", points: 8 },
      { label: "Préparation physique spécifique", points: 10 },
    ],
  },
  {
    id: 20,
    category: "physique",
    question: "Gestion de la pression ?",
    options: [
      { label: "Fautes fréquentes", points: 2 },
      { label: "Moins régulier sous pression", points: 4 },
      { label: "Maintiens mon niveau", points: 6 },
      { label: "Plus solide moments clés", points: 8 },
      { label: "Monte en niveau sous pression", points: 10 },
    ],
  },

  // CATÉGORIE 5 : SITUATIONS (Questions 21-22) - 3% du score
  {
    id: 21,
    category: "situations",
    question: "Balles en double vitre ?",
    options: [
      { label: "Perds systématiquement", points: 1 },
      { label: "Arrive parfois à remettre", points: 3 },
      { label: "Défends correctement", points: 6 },
      { label: "Renvoie avec précision", points: 8 },
      { label: "Contre-attaque depuis double vitre", points: 10 },
    ],
  },
  {
    id: 22,
    category: "situations",
    question: "Contre niveau supérieur ?",
    options: [
      { label: "Perds largement (6-0, 6-1)", points: 2 },
      { label: "Prends quelques jeux (6-3)", points: 4 },
      { label: "Compétitif (6-4, 7-5)", points: 6 },
      { label: "Gagne de temps en temps", points: 8 },
      { label: "Gagne régulièrement contre niveau supérieur", points: 10 },
    ],
  },
];

import { Target, Brain, Trophy, Zap, Dumbbell } from "lucide-react";

export const CATEGORY_INFO: Record<
  QuestionCategory,
  { label: string; color: string; Icon: typeof Target; weight: number }
> = {
  technique: {
    label: "Technique",
    color: "blue",
    Icon: Target,
    weight: 0.32,
  },
  tactique: {
    label: "Tactique",
    color: "purple",
    Icon: Brain,
    weight: 0.28,
  },
  experience: {
    label: "Expérience",
    color: "orange",
    Icon: Trophy,
    weight: 0.3,
  },
  physique: {
    label: "Physique",
    color: "green",
    Icon: Dumbbell,
    weight: 0.07,
  },
  situations: {
    label: "Situations",
    color: "red",
    Icon: Zap,
    weight: 0.03,
  },
};
