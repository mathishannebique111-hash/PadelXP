// =============================================
// MATRICE DE RECOMMANDATIONS PAR NIVEAU ET FAIBLESSE
// Basée sur l'analyse des meilleurs coachs pros de padel
// =============================================

interface RecommendationRule {
  levels: number[]; // Niveaux concernés (ex: [1, 2, 3])
  category: 'technique' | 'tactique' | 'experience' | 'physique' | 'situations';
  priority: 'high' | 'medium' | 'low';
  text: string;
}

export const RECOMMENDATION_MATRIX: RecommendationRule[] = [
  
  // ==================== NIVEAUX 1-3 : DÉBUTANTS ====================
  
  // TECHNIQUE - Débutants
  {
    levels: [1, 2, 3],
    category: 'technique',
    priority: 'high',
    text: 'Entraîne-toi 15min/jour contre un mur : 50 coups droits + 50 revers pour développer la régularité'
  },
  {
    levels: [1, 2, 3],
    category: 'technique',
    priority: 'high',
    text: 'Filme-toi et vérifie que tu frappes au centre de la raquette (pas sur les bords)'
  },
  {
    levels: [1, 2, 3],
    category: 'technique',
    priority: 'medium',
    text: 'Pratique le service 10min avant chaque match : 70% doivent passer dans le carré'
  },
  {
    levels: [1, 2, 3],
    category: 'technique',
    priority: 'medium',
    text: 'Concentre-toi sur la préparation : raquette en arrière AVANT que la balle arrive'
  },
  
  // TACTIQUE - Débutants
  {
    levels: [1, 2, 3],
    category: 'tactique',
    priority: 'high',
    text: 'Joue TOUJOURS en diagonale : ne cherche pas à faire des winners, vise 10 échanges minimum'
  },
  {
    levels: [1, 2, 3],
    category: 'tactique',
    priority: 'high',
    text: 'Reste à 3 mètres de ton partenaire (ni trop près, ni trop loin) pour couvrir le terrain'
  },
  {
    levels: [1, 2, 3],
    category: 'tactique',
    priority: 'medium',
    text: 'Après ton service, monte systématiquement au filet (même si tu rates au début)'
  },
  {
    levels: [1, 2, 3],
    category: 'tactique',
    priority: 'medium',
    text: 'Utilise les vitres latérales pour ralentir la balle au lieu de vouloir tout prendre de volée'
  },
  
  // EXPÉRIENCE - Débutants
  {
    levels: [1, 2, 3],
    category: 'experience',
    priority: 'high',
    text: 'Joue 2 fois par semaine minimum : la régularité bat le talent à ce niveau'
  },
  {
    levels: [1, 2, 3],
    category: 'experience',
    priority: 'high',
    text: 'Inscris-toi à un tournoi P25 dans les 2 mois : objectif de JOUER, pas de gagner'
  },
  {
    levels: [1, 2, 3],
    category: 'experience',
    priority: 'medium',
    text: 'Change de partenaire à chaque session pour t\'adapter à différents styles de jeu'
  },
  {
    levels: [1, 2, 3],
    category: 'experience',
    priority: 'low',
    text: 'Regarde 2 matchs pro par mois pour observer les placements et transitions'
  },
  
  // PHYSIQUE - Débutants
  {
    levels: [1, 2, 3],
    category: 'physique',
    priority: 'medium',
    text: 'Fais 10min d\'échauffement avec focus mobilité épaules et genoux avant chaque session'
  },
  {
    levels: [1, 2, 3],
    category: 'physique',
    priority: 'low',
    text: 'Ajoute 2 séances de 20min de corde à sauter par semaine pour les appuis'
  },
  
  // SITUATIONS - Débutants
  {
    levels: [1, 2, 3],
    category: 'situations',
    priority: 'high',
    text: 'Travaille les situations de jeu au filet : 80% des points se gagnent là'
  },
  {
    levels: [1, 2, 3],
    category: 'situations',
    priority: 'medium',
    text: 'Pratique les sorties de vitre latérale : c\'est la base du padel'
  },
  
  // ==================== NIVEAUX 4-6 : INTERMÉDIAIRES ====================
  
  // TECHNIQUE - Intermédiaires
  {
    levels: [4, 5, 6],
    category: 'technique',
    priority: 'high',
    text: 'Maîtrise la bandeja (smash coupé) : fais 50 répétitions par session avec balles faciles'
  },
  {
    levels: [4, 5, 6],
    category: 'technique',
    priority: 'high',
    text: 'Entraîne les sorties de vitre latérale 20min par session : 80% des points se jouent là'
  },
  {
    levels: [4, 5, 6],
    category: 'technique',
    priority: 'medium',
    text: 'Apprends à varier tes volées (courtes, longues, croisées) au lieu de toujours taper fort'
  },
  {
    levels: [4, 5, 6],
    category: 'technique',
    priority: 'medium',
    text: 'Travaille le lob OFFENSIF lifté et profond : vise 1m du grillage du fond'
  },
  {
    levels: [4, 5, 6],
    category: 'technique',
    priority: 'low',
    text: 'Perfectionne le service slicé qui part en vitre latérale pour créer des ouvertures'
  },
  
  // TACTIQUE - Intermédiaires
  {
    levels: [4, 5, 6],
    category: 'tactique',
    priority: 'high',
    text: 'Quand tu montes au filet, fais un split-step obligatoire avant chaque frappe'
  },
  {
    levels: [4, 5, 6],
    category: 'tactique',
    priority: 'high',
    text: 'Identifie le joueur le plus faible en face et cible-le 70% du temps (réalité de la compétition)'
  },
  {
    levels: [4, 5, 6],
    category: 'tactique',
    priority: 'medium',
    text: 'Utilise le lob offensif quand tu es en difficulté, pas le lob mou qui donne un smash facile'
  },
  {
    levels: [4, 5, 6],
    category: 'tactique',
    priority: 'medium',
    text: 'Apprends à construire : 3 coups de préparation avant de tenter le winner'
  },
  {
    levels: [4, 5, 6],
    category: 'tactique',
    priority: 'low',
    text: 'Communique avec ton partenaire sur QUI prend le milieu à chaque transition'
  },
  
  // EXPÉRIENCE - Intermédiaires
  {
    levels: [4, 5, 6],
    category: 'experience',
    priority: 'high',
    text: 'Filme 3 de tes matchs et analyse où tu perds VRAIMENT les points (ce n\'est pas où tu penses)'
  },
  {
    levels: [4, 5, 6],
    category: 'experience',
    priority: 'high',
    text: 'Joue 1 match par semaine contre des joueurs niveau 7+ : tu vas perdre mais apprendre 10x plus vite'
  },
  {
    levels: [4, 5, 6],
    category: 'experience',
    priority: 'medium',
    text: 'Inscris-toi à 1 tournoi P100 par mois : c\'est là que tu vas comprendre la pression'
  },
  {
    levels: [4, 5, 6],
    category: 'experience',
    priority: 'medium',
    text: 'Trouve un partenaire régulier du même niveau et jouez ensemble 3 mois minimum'
  },
  {
    levels: [4, 5, 6],
    category: 'experience',
    priority: 'low',
    text: 'Prends 2 cours avec un coach pour corriger tes défauts techniques avant qu\'ils deviennent des habitudes'
  },
  
  // PHYSIQUE - Intermédiaires
  {
    levels: [4, 5, 6],
    category: 'physique',
    priority: 'medium',
    text: 'Ajoute 2 séances de renforcement musculaire par semaine : focus jambes et épaules'
  },
  {
    levels: [4, 5, 6],
    category: 'physique',
    priority: 'low',
    text: 'Travaille les déplacements latéraux avec élastiques : 3 séries de 20 pas chassés'
  },
  
  // SITUATIONS - Intermédiaires
  {
    levels: [4, 5, 6],
    category: 'situations',
    priority: 'high',
    text: 'Travaille les situations 2v1 au filet : c\'est là que tu gagnes ou perds les matchs'
  },
  {
    levels: [4, 5, 6],
    category: 'situations',
    priority: 'medium',
    text: 'Pratique les transitions défense → attaque : ne reste jamais coincé entre les deux'
  },
  
  // ==================== NIVEAUX 7-8 : AVANCÉS ====================
  
  // TECHNIQUE - Avancés
  {
    levels: [7, 8],
    category: 'technique',
    priority: 'high',
    text: 'Maîtrise la vibora (smash latéral lifté) : c\'est ce qui te manque pour battre les niveaux 9'
  },
  {
    levels: [7, 8],
    category: 'technique',
    priority: 'high',
    text: 'Travaille les défenses depuis le fond en 2v1 : tu dois tenir 20 frappes sans faute'
  },
  {
    levels: [7, 8],
    category: 'technique',
    priority: 'medium',
    text: 'Perfectionne ton contrôle de balle au filet : vise les pieds adverses (zone 50cm du sol)'
  },
  {
    levels: [7, 8],
    category: 'technique',
    priority: 'medium',
    text: 'Développe la chiquita : drop shot au filet avec 3 zones de placement (pieds gauche/droit/milieu)'
  },
  {
    levels: [7, 8],
    category: 'technique',
    priority: 'low',
    text: 'Travaille les contre-attaques depuis les vitres latérales avec angle inversé'
  },
  
  // TACTIQUE - Avancés
  {
    levels: [7, 8],
    category: 'tactique',
    priority: 'high',
    text: 'Apprends à lire les 3 coups à l\'avance : où sera la balle après ton prochain coup ?'
  },
  {
    levels: [7, 8],
    category: 'tactique',
    priority: 'high',
    text: 'Varie tes overheads : 50% bandejas (sécurité) / 30% viboras (pression) / 20% smashes (finish)'
  },
  {
    levels: [7, 8],
    category: 'tactique',
    priority: 'medium',
    text: 'Travaille les transitions défense → attaque : ne reste jamais "coincé" entre fond et filet'
  },
  {
    levels: [7, 8],
    category: 'tactique',
    priority: 'medium',
    text: 'Impose ton rythme : alterne tempo lent (construction) et tempo rapide (finish)'
  },
  {
    levels: [7, 8],
    category: 'tactique',
    priority: 'low',
    text: 'Communique 30% plus : à ce niveau, le duo bat les individualités'
  },
  
  // EXPÉRIENCE - Avancés
  {
    levels: [7, 8],
    category: 'experience',
    priority: 'high',
    text: 'Joue des P250/P500 même si tu perds au 1er tour : l\'écart de niveau te forcera à t\'adapter'
  },
  {
    levels: [7, 8],
    category: 'experience',
    priority: 'high',
    text: 'Trouve un coach pour 1 session/mois d\'analyse vidéo : à ce niveau, ce sont des micro-détails'
  },
  {
    levels: [7, 8],
    category: 'experience',
    priority: 'medium',
    text: 'Entraîne-toi avec un plan précis (ex: "Aujourd\'hui je travaille QUE les coups dans les pieds")'
  },
  {
    levels: [7, 8],
    category: 'experience',
    priority: 'medium',
    text: 'Participe à 1 stage intensif avec des pros pour découvrir ce qui te sépare de l\'élite'
  },
  {
    levels: [7, 8],
    category: 'experience',
    priority: 'low',
    text: 'Trouve un partenaire fixe niveau 7-8 et jouez ensemble 6 mois : la synergie compte'
  },
  
  // PHYSIQUE - Avancés
  {
    levels: [7, 8],
    category: 'physique',
    priority: 'medium',
    text: 'Ajoute du travail explosif : sprints de 5m + sauts verticaux, 2x/semaine'
  },
  {
    levels: [7, 8],
    category: 'physique',
    priority: 'low',
    text: 'Intègre du yoga ou stretching 15min/jour pour prévenir les blessures'
  },
  
  // SITUATIONS - Avancés
  {
    levels: [7, 8],
    category: 'situations',
    priority: 'high',
    text: 'Maîtrise les situations de break point : c\'est là que se jouent les matchs serrés'
  },
  {
    levels: [7, 8],
    category: 'situations',
    priority: 'medium',
    text: 'Travaille les situations de contre-attaque depuis toutes les positions'
  },
  
  // ==================== NIVEAUX 9-10 : ÉLITE ====================
  
  // TECHNIQUE - Élite
  {
    levels: [9, 10],
    category: 'technique',
    priority: 'high',
    text: 'Perfectionne la chiquita avec effet : 3 zones de placement + 2 types de rotation'
  },
  {
    levels: [9, 10],
    category: 'technique',
    priority: 'high',
    text: 'Maîtrise les smashes en déséquilibre : tu dois pouvoir finir même en position défavorable'
  },
  {
    levels: [9, 10],
    category: 'technique',
    priority: 'medium',
    text: 'Travaille les contre-attaques rapides depuis toutes les positions : réflexes de 0.3s'
  },
  {
    levels: [9, 10],
    category: 'technique',
    priority: 'medium',
    text: 'Perfectionne le contrôle millimétrique : vise des zones de 30cm au filet'
  },
  
  // TACTIQUE - Élite
  {
    levels: [9, 10],
    category: 'tactique',
    priority: 'high',
    text: 'Développe 3 schémas tactiques par match : repère les failles dans les 5 premières minutes'
  },
  {
    levels: [9, 10],
    category: 'tactique',
    priority: 'high',
    text: 'Impose TON rythme : dicte le tempo à volonté selon la situation'
  },
  {
    levels: [9, 10],
    category: 'tactique',
    priority: 'medium',
    text: 'Anticipe les intentions adverses : lis leur position avant qu\'ils frappent'
  },
  {
    levels: [9, 10],
    category: 'tactique',
    priority: 'medium',
    text: 'Joue sur les zones de doute : milieu du court, entre les deux adversaires'
  },
  
  // EXPÉRIENCE - Élite
  {
    levels: [9, 10],
    category: 'experience',
    priority: 'high',
    text: 'Participe à 1 tournoi national par trimestre : seul moyen de progresser encore'
  },
  {
    levels: [9, 10],
    category: 'experience',
    priority: 'high',
    text: 'Trouve un partenaire fixe niveau 9+ et jouez ensemble 6 mois : synergie > talent'
  },
  {
    levels: [9, 10],
    category: 'experience',
    priority: 'medium',
    text: 'Engage un préparateur mental : à ce niveau, 80% du jeu est dans la tête'
  },
  {
    levels: [9, 10],
    category: 'experience',
    priority: 'medium',
    text: 'Analyse vidéo de TOUS tes matchs importants avec un coach certifié'
  },
  
  // PHYSIQUE - Élite
  {
    levels: [9, 10],
    category: 'physique',
    priority: 'medium',
    text: 'Programme d\'entraînement physique personnalisé avec préparateur physique'
  },
  {
    levels: [9, 10],
    category: 'physique',
    priority: 'low',
    text: 'Nutrition optimisée : consultation avec nutritionniste du sport'
  },
  
  // SITUATIONS - Élite
  {
    levels: [9, 10],
    category: 'situations',
    priority: 'high',
    text: 'Maîtrise les situations de tie-break : c\'est là que se jouent les tournois'
  },
  {
    levels: [9, 10],
    category: 'situations',
    priority: 'medium',
    text: 'Travaille les situations de match point : pression maximale, exécution parfaite'
  }
];

// =============================================
// LOGIQUE DE SÉLECTION INTELLIGENTE
// =============================================

interface GenerateRecommendationsParams {
  niveau: number;
  breakdown: {
    technique: number;
    tactique: number;
    experience: number;
    physique: number;
    situations: number;
  };
  frequenceJeu?: string;
  hasTournamentExperience?: boolean;
}

export function generateSmartRecommendations(params: GenerateRecommendationsParams): string[] {
  const { niveau, breakdown } = params;
  
  // 1. Déterminer le groupe de niveau (arrondi à l'inférieur)
  const levelGroup = Math.floor(niveau);
  
  // 2. Identifier les 2 catégories les plus faibles
  const categoryEntries = Object.entries(breakdown) as Array<[keyof typeof breakdown, number]>;
  const sortedCategories = categoryEntries
    .sort((a, b) => a[1] - b[1]) // Trier par score croissant (plus faible = premier)
    .map(([key]) => key);
  
  const weakest = sortedCategories[0];
  const secondWeakest = sortedCategories[1];
  
  // 3. Filtrer les recommandations pertinentes pour le niveau
  const relevantRecs = RECOMMENDATION_MATRIX.filter(rec => 
    rec.levels.includes(levelGroup) || 
    rec.levels.includes(Math.ceil(niveau))
  );
  
  // 4. Sélectionner 2 recommandations pour la catégorie la plus faible
  const weakestRecs = relevantRecs
    .filter(rec => rec.category === weakest)
    .sort((a, b) => {
      const priorityOrder: Record<'high' | 'medium' | 'low', number> = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 2);
  
  // 5. Sélectionner 1 recommandation pour la 2ème catégorie la plus faible
  const secondWeakestRecs = relevantRecs
    .filter(rec => rec.category === secondWeakest)
    .sort((a, b) => {
      const priorityOrder: Record<'high' | 'medium' | 'low', number> = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 1);
  
  // 6. Combiner les recommandations
  const finalRecs: string[] = [
    ...weakestRecs.map(r => r.text),
    ...secondWeakestRecs.map(r => r.text)
  ];
  
  // 7. Si pas assez de recommandations, compléter avec des génériques du même niveau
  if (finalRecs.length < 3) {
    const fallbackRecs = relevantRecs
      .filter(rec => !finalRecs.includes(rec.text))
      .sort((a, b) => {
        const priorityOrder: Record<'high' | 'medium' | 'low', number> = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .slice(0, 3 - finalRecs.length);
    
    finalRecs.push(...fallbackRecs.map(r => r.text));
  }
  
  // 8. S'assurer qu'on a bien 3 recommandations (ou moins si vraiment pas assez de données)
  return finalRecs.slice(0, 3);
}
