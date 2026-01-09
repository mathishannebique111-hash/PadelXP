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
  // CATÉGORIE 1 : TECHNIQUE (Questions 1-6) - 35% du score
  {
    id: 1,
    category: "technique",
    question: "Comment utilisez-vous les vitres ?",
    description: "Les vitres sont essentielles au padel",
    options: [
      { label: "Je ne les utilise pas encore", points: 1 },
      { label: "Occasionnellement (latérales)", points: 3 },
      { label: "Régulièrement (latérales + fond)", points: 6 },
      { label: "Maîtrise totale + doubles vitres", points: 9 },
      { label: "Utilisation offensive (contre-attaque 360°)", points: 10 },
    ],
  },
  {
    id: 2,
    category: "technique",
    question: "Régularité en fond de court ?",
    description: "Combien d'échanges consécutifs sans faute ?",
    options: [
      { label: "Moins de 5 échanges", points: 1 },
      { label: "5-10 échanges", points: 3 },
      { label: "10-20 échanges réguliers", points: 6 },
      { label: "Plus de 20 avec placement précis", points: 8 },
      { label: "Échanges longs avec effets variés", points: 10 },
    ],
  },
  {
    id: 3,
    category: "technique",
    question: "Qualité de votre service ?",
    options: [
      { label: "Basique, souvent dans le filet", points: 1 },
      { label: "Régulier mais prévisible", points: 3 },
      { label: "Varié (puissant/liffé/slicé)", points: 6 },
      { label: "Placement précis + effets", points: 9 },
      { label: "Service-volée maîtrisé", points: 10 },
    ],
  },
  {
    id: 4,
    category: "technique",
    question: "Niveau à la volée ?",
    description: "Jeu au filet et réflexes",
    options: [
      { label: "Je ne monte presque jamais", points: 1 },
      { label: "Monte parfois mais rate souvent", points: 3 },
      { label: "Maîtrise volées hautes/moyennes", points: 6 },
      { label: "Volées réflexes + dans les pieds", points: 8 },
      { label: "Volées offensives millimétrées", points: 10 },
    ],
  },
  {
    id: 5,
    category: "technique",
    question: "Efficacité au smash ?",
    options: [
      { label: "Rarement, 30% de réussite", points: 1 },
      { label: "Occasionnel, 40% de réussite", points: 3 },
      { label: "Régulier et puissant, 70%", points: 6 },
      { label: "Varié (puissance/placement), 80%+", points: 8 },
      { label: "Gagnant + vibora/bandeja", points: 10 },
    ],
  },
  {
    id: 6,
    category: "technique",
    question: "Coups techniques maîtrisés ?",
    description: "Sélectionnez tous les coups que vous réalisez",
    multiple: true,
    options: [
      { label: "Lob défensif", points: 2 },
      { label: "Lob offensif lifté", points: 4 },
      { label: "Bandeja", points: 6 },
      { label: "Vibora", points: 7 },
      { label: "Chiquita", points: 8 },
      { label: "Bajada", points: 9 },
      { label: "Globo", points: 10 },
    ],
  },

  // CATÉGORIE 2 : TACTIQUE (Questions 7-11) - 25% du score
  {
    id: 7,
    category: "tactique",
    question: "Gestion des transitions ?",
    description: "Attaque/défense, montées/descentes",
    options: [
      { label: "Reste au fond de court", points: 1 },
      { label: "Monte après un bon coup", points: 3 },
      { label: "Maîtrise transitions montée/descente", points: 6 },
      { label: "Anticipe quand monter/descendre", points: 8 },
      { label: "Transitions fluides + communication", points: 10 },
    ],
  },
  {
    id: 8,
    category: "tactique",
    question: "Anticipation et placement ?",
    options: [
      { label: "Je cours après la balle", points: 1 },
      { label: "Anticipe parfois", points: 3 },
      { label: "Bon placement 70% du temps", points: 6 },
      { label: "Anticipe la majorité des coups", points: 8 },
      { label: "Lis le jeu avant qu'il arrive", points: 10 },
    ],
  },
  {
    id: 9,
    category: "tactique",
    question: "Communication partenaire ?",
    options: [
      { label: "On se gêne souvent", points: 1 },
      { label: "Basique (\"Toi\", \"Moi\")", points: 3 },
      { label: "Bonne coordination terrain", points: 6 },
      { label: "Communication stratégique", points: 8 },
      { label: "Symbiose totale", points: 10 },
    ],
  },
  {
    id: 10,
    category: "tactique",
    question: "Contrôle du tempo ?",
    options: [
      { label: "Subis le rythme adverse", points: 1 },
      { label: "Essaie de varier parfois", points: 3 },
      { label: "Sais quand ralentir/accélérer", points: 6 },
      { label: "Casse le rythme pour déstabiliser", points: 8 },
      { label: "Dicte le tempo à volonté", points: 10 },
    ],
  },
  {
    id: 11,
    category: "tactique",
    question: "Construction des points ?",
    options: [
      { label: "Frappe fort sans réfléchir", points: 1 },
      { label: "Place quelques coups basiques", points: 3 },
      { label: "Séquences simples", points: 6 },
      { label: "Crée des ouvertures puis attaque", points: 8 },
      {
        label: "Stratégie élaborée, joue les faiblesses",
        points: 10,
      },
    ],
  },

  // CATÉGORIE 3 : EXPÉRIENCE (Questions 12-23) - 30% du score
  {
    id: 12,
    category: "experience",
    question: "Tournois officiels ?",
    options: [
      { label: "Jamais", points: 0 },
      { label: "Tournois loisirs/amicaux", points: 2 },
      { label: "P25", points: 4 },
      { label: "P25 et P100", points: 6 },
      { label: "P250 et P500", points: 8 },
      { label: "P1000+ ou nationaux", points: 10 },
    ],
  },
  {
    id: 13,
    category: "experience",
    question: "Classement FFT ?",
    options: [
      { label: "Non classé", points: 0 },
      { label: "15000-40000", points: 4 },
      { label: "6000-15000", points: 6 },
      { label: "3000-6000", points: 8 },
      { label: "1000-3000", points: 9 },
      { label: "Top 1000", points: 10 },
    ],
  },
  {
    id: 14,
    category: "experience",
    question: "Meilleurs résultats ?",
    options: [
      { label: "Jamais gagné de match", points: 0 },
      { label: "Victoires en poules", points: 3 },
      { label: "Quarts P25/P100", points: 5 },
      { label: "Demi/Finale P100", points: 7 },
      { label: "Victoire P100 ou podium P250", points: 9 },
      { label: "Victoires multiples P250+", points: 10 },
    ],
  },
  {
    id: 15,
    category: "experience",
    question: "Fréquence de jeu ?",
    options: [
      { label: "Moins d'1x/mois", points: 1 },
      { label: "1-2x/mois", points: 3 },
      { label: "1x/semaine", points: 5 },
      { label: "2-3x/semaine", points: 7 },
      { label: "4+/semaine (entraînements)", points: 10 },
    ],
  },
  {
    id: 21,
    category: "experience",
    question: "Statut dans le padel ?",
    options: [
      { label: "Loisir uniquement", points: 0 },
      { label: "Compétition amateur", points: 3 },
      { label: "Semi-pro (coaching + tournois)", points: 6 },
      { label: "Professionnel temps plein", points: 9 },
      { label: "World Padel Tour", points: 10 },
    ],
  },
  {
    id: 22,
    category: "experience",
    question: "Classement international ?",
    options: [
      { label: "Non", points: 0 },
      { label: "Hors Top 1000", points: 4 },
      { label: "Top 500-1000", points: 6 },
      { label: "Top 100-500", points: 8 },
      { label: "Top 100 mondial", points: 10 },
    ],
  },
  {
    id: 23,
    category: "experience",
    question: "Revenus du padel ?",
    options: [
      { label: "Non, pur loisir", points: 0 },
      { label: "Occasionnels (coaching ponctuel)", points: 3 },
      { label: "Réguliers (coaching pro)", points: 6 },
      { label: "Principaux (sponsoring + tournois)", points: 9 },
      {
        label: "Exclusifs (pro + sponsoring majeur)",
        points: 10,
      },
    ],
  },

  // CATÉGORIE 4 : PHYSIQUE (Questions 16-17) - 7% du score
  {
    id: 16,
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
    id: 17,
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

  // CATÉGORIE 5 : SITUATIONS (Questions 18-20) - 3% du score
  {
    id: 18,
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
    id: 19,
    category: "situations",
    question: "Retour de service ?",
    options: [
      { label: "Souvent faute", points: 2 },
      { label: "Retours basiques", points: 4 },
      { label: "Variés (lob/contre-pied)", points: 6 },
      { label: "Retours offensifs", points: 8 },
      { label: "Retours gagnants", points: 10 },
    ],
  },
  {
    id: 20,
    category: "situations",
    question: "Contre niveau supérieur ?",
    options: [
      { label: "Perds largement (6-0, 6-1)", points: 2 },
      { label: "Prends quelques jeux (6-3)", points: 4 },
      { label: "Compétitif (6-4, 7-5)", points: 6 },
      { label: "Peux gagner si bien", points: 8 },
      { label: "Gagne régulièrement contre sup", points: 10 },
    ],
  },
];

export const CATEGORY_INFO: Record<
  QuestionCategory,
  { label: string; color: string; icon: string; weight: number }
> = {
  technique: {
    label: "Technique",
    color: "blue",
    icon: "🎾",
    weight: 0.35,
  },
  tactique: {
    label: "Tactique",
    color: "purple",
    icon: "🧠",
    weight: 0.25,
  },
  experience: {
    label: "Expérience",
    color: "orange",
    icon: "🏆",
    weight: 0.3,
  },
  physique: {
    label: "Physique",
    color: "green",
    icon: "💪",
    weight: 0.07,
  },
  situations: {
    label: "Situations",
    color: "red",
    icon: "⚡",
    weight: 0.03,
  },
};

