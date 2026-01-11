/**
 * Banque de données de conseils padel
 * Organisée par niveau et par type de conseil
 */

export type TipCategory = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface TechniqueTip {
  tag: string;
  text: string;
}

export interface Tip {
  text: string;
}

export interface TipsByLevel {
  technique: TechniqueTip[];
  tactique: Tip[];
  mental: Tip[];
}

export const PADEL_TIPS: Record<TipCategory, TipsByLevel> = {
  // NIVEAU 1-2.5 (DÉBUTANT)
  beginner: {
    technique: [
      { tag: 'general', text: "Ne cherche pas la puissance. Ton seul objectif est de remettre la balle une fois de plus que l'adversaire, au centre du terrain." },
      { tag: 'revers', text: "En revers, prépare ta raquette très tôt, avant même que la balle ne rebondisse. Garde ton geste court et compact." },
      { tag: 'volee', text: "À la volée, ne frappe pas fort. Contente-toi de bloquer la balle en gardant la raquette devant toi, comme un bouclier." },
      { tag: 'service', text: "Assure ta première balle. Vise simplement le centre du carré adverse pour réduire les angles et éviter la faute directe." },
      { tag: 'vitres', text: "Laisse passer la balle ! Apprends à faire confiance à la vitre du fond. Si la balle est rapide, laisse-la rebondir contre la vitre avant de la frapper." },
      { tag: 'coupsBase', text: "Joue au centre. C'est la zone de sécurité (le 'divorce') qui crée de la confusion entre les deux adversaires sans risquer la faute latérale." },
      { tag: 'smash', text: "Au smash, ne cherche pas à finir. Vis simplement le centre du terrain adverse pour mettre la balle en jeu et continuer l'échange." },
    ],
    tactique: [
      { text: "Laisse passer la balle ! Apprends à faire confiance à la vitre du fond. Si la balle est rapide, laisse-la rebondir contre la vitre avant de la frapper." },
      { text: "Joue au centre. C'est la zone de sécurité (le 'divorce') qui crée de la confusion entre les deux adversaires sans risquer la faute latérale." },
      { text: "Reste aligné avec ton partenaire. S'il monte au filet, monte aussi. S'il recule, recule. Ne laissez pas de trou au milieu." },
    ],
    mental: [
      { text: "Oublie le score. Concentre-toi uniquement sur le plaisir de l'échange et la sécurité de tes coups." },
      { text: "Communique ! Dis simplement 'J'ai' ou 'À toi' avant chaque balle litigieuse pour éviter les collisions." },
    ],
  },

  // NIVEAU 3-4.5 (INTERMÉDIAIRE LOISIR)
  intermediate: {
    technique: [
      { tag: 'general', text: "Active tes jambes ! Le padel se joue avec les pieds. Plie les genoux sur chaque frappe pour gagner en contrôle." },
      { tag: 'lob', text: "Le lob est ton arme n°1. Ne le tente pas si tu es pressé. Attends une balle facile pour monter ton lob très haut et reprendre le filet." },
      { tag: 'bajanda', text: "Sortie de vitre : si la balle rebondit haut, n'hésite pas à attaquer. Si elle est basse, joue un lob défensif pour te replacer." },
      { tag: 'bandeja', text: "Sur les balles hautes adverses, ne recule pas en courant. Mets-toi de profil et fais des pas chassés pour jouer ta bandeja." },
      { tag: 'volee', text: "Varie tes volées. Alterne entre volée profonde au centre pour repousser et volée courte croisée (chiquita) pour finir." },
      { tag: 'service', text: "Varie ton service. Alterne service slicé qui part en vitre latérale et service lifté pour surprendre." },
    ],
    tactique: [
      { text: "La zone morte : Ne reste jamais entre la ligne de fond et le carré de service. Soit tu es au fond (défense), soit tu es collé au filet (attaque)." },
      { text: "Jouer dans les pieds. Quand tes adversaires montent, ne cherche pas toujours le passing. Vise leurs pieds pour provoquer une volée facile à attaquer." },
      { text: "Joue 'simple et sûr' : vise majoritairement le centre et les pieds, varie la hauteur (balle lente puis lob), et évite les zones à risque tant que tu n'as pas repris le filet." },
    ],
    mental: [
      { text: "Pardonner l'erreur. Ton partenaire va rater. Tape-lui dans la main immédiatement. La frustration est le pire ennemi de la paire." },
      { text: "Analyse l'adversaire. Au bout de 3 jeux, tu dois savoir si l'adversaire préfère son coup droit ou son revers. Joue sur son point faible." },
    ],
  },

  // NIVEAU 5-6.5 (AVANCÉ)
  advanced: {
    technique: [
      { tag: 'general', text: "L'accompagnement du corps : Cesse de jouer uniquement avec le bras. Sur tes volées et bandejas, utilise le transfert du poids du corps vers l'avant au moment de l'impact pour donner de la lourdeur à la balle sans forcer." },
      { tag: 'vibora', text: "Travaille ta Vibora pour mettre de l'effet latéral. L'objectif n'est pas de finir le point, mais de forcer une défense difficile dans le coin." },
      { tag: 'volee', text: "Varie tes volées. Alterne entre volée profonde au centre pour repousser et volée courte croisée (chiquita) pour finir." },
      { tag: 'smash', text: "Le Par 3 n'est pas automatique. Apprends à reconnaître la balle idéale (proche du filet) et garde le smash à plat pour surprendre." },
      { tag: 'bandeja', text: "Sur ta bandeja, varie les zones. Alterne bandeja au centre pour repousser et bandeja croisée pour créer l'ouverture." },
    ],
    tactique: [
      { text: "Défense sous pression : Quand tu es acculé dans le coin, joue un lob très haut en diagonale. C'est le coup qui donne le plus de temps pour te replacer." },
      { text: "Le blocage au filet : Quand l'adversaire frappe fort du fond, ne tente pas de voléer. Contente-toi de bloquer la balle pour utiliser sa vitesse." },
      { text: "Gestion des vitres : Utilise la double vitre pour changer le rythme. Une balle qui tourne dans le coin est souvent létale." },
    ],
    mental: [
      { text: "Le 'Reset' mental. Après une faute bête, effectue un rituel (toucher le grillage, regarder ta raquette) pour effacer l'erreur avant le point suivant." },
      { text: "Gestion des temps forts. À 40-40 (Punto de Oro), joue ton coup le plus sûr. Ce n'est pas le moment de tenter un coup de génie." },
    ],
  },

  // NIVEAU 7+ (COMPÉTITION/EXPERT)
  expert: {
    technique: [
      { tag: 'general', text: "L'intensité des jambes est non-négociable. Tu dois être en mouvement constant, même quand tu ne joues pas la balle." },
      { tag: 'kick-smash', text: "Maîtrise le smash lifté vers la grille (rulo). C'est essentiel pour contrer des adversaires qui défendent bien les vitres." },
      { tag: 'defense', text: "Le 'Scan' adverse : Avant de smasher, jette un coup d'œil éclair à la position adverse. Ne joue pas ton coup favori, joue celui que leur placement laisse ouvert (trou ou contre-pied)." },
      { tag: 'volee', text: "Perfectionne tes volées dans les pieds. À ce niveau, vise la zone de 30cm autour des pieds adverses pour forcer les erreurs." },
    ],
    tactique: [
      { text: "Le Leurre du Regard : Dissocie ton regard de ta frappe. Les experts anticipent selon tes yeux : fixe la ligne ou la grille, mais joue ta volée au centre pour les prendre à contre-pied." },
      { text: "Isolation tactique. Identifie qui défend le moins bien les lobs et pilonne-le en hauteur pour épuiser son physique." },
      { text: "Changement de rythme. Alterne balles molles sans poids et accélérations violentes. C'est la variation qui provoque la faute à ce niveau." },
    ],
    mental: [
      { text: "Body Language. Ne montre AUCUNE frustration. À ce niveau, si l'adversaire sent que tu doutes, il va appuyer là où ça fait mal." },
      { text: "Analyse vidéo. Filme tes matchs pour analyser tes choix tactiques, pas ta technique. 'Ai-je joué la bonne zone à 30-40 ?'" },
    ],
  },
};

/**
 * Détermine la catégorie de niveau d'un joueur
 */
export function getLevelCategory(niveau: number): TipCategory {
  if (niveau <= 2.5) return 'beginner';
  if (niveau <= 4.5) return 'intermediate';
  if (niveau <= 6.5) return 'advanced';
  return 'expert';
}

/**
 * Détermine le point faible technique à partir du breakdown
 * Retourne un tag correspondant (ex: 'revers', 'volee', 'service', etc.)
 */
export function getWeakTechnicalPoint(breakdown: {
  technique: number;
  tactique: number;
  experience: number;
  physique: number;
  situations: number;
}, responses?: {
  vitres?: number;
  coupsBase?: number;
  service?: number;
  volee?: number;
  smash?: number;
}): string {
  // Si on a les réponses détaillées, on peut identifier le point faible précis
  if (responses) {
    const techniqueScores = [
      { tag: 'vitres', score: responses.vitres || 0 },
      { tag: 'coupsBase', score: responses.coupsBase || 0 },
      { tag: 'service', score: responses.service || 0 },
      { tag: 'volee', score: responses.volee || 0 },
      { tag: 'smash', score: responses.smash || 0 },
    ];

    // Trier par score croissant (plus faible = premier)
    techniqueScores.sort((a, b) => a.score - b.score);
    
    // Retourner le tag du point le plus faible
    if (techniqueScores[0].score < 6) {
      return techniqueScores[0].tag;
    }
  }

  // Sinon, retourner 'general' par défaut
  return 'general';
}

/**
 * Sélectionne un conseil technique aléatoirement dans un tableau
 */
function selectRandomTip<T extends { text: string }>(tips: T[]): T {
  if (tips.length === 0) throw new Error('No tips available');
  const randomIndex = Math.floor(Math.random() * tips.length);
  return tips[randomIndex];
}

/**
 * Sélectionne un conseil technique basé sur le point faible
 */
function selectTechnicalTip(
  tips: TechniqueTip[],
  weakPoint: string
): TechniqueTip {
  // Essayer de trouver un conseil avec le tag correspondant
  const matchingTips = tips.filter(tip => tip.tag === weakPoint);
  
  if (matchingTips.length > 0) {
    return selectRandomTip(matchingTips);
  }
  
  // Sinon, prendre un conseil général
  const generalTips = tips.filter(tip => tip.tag === 'general');
  if (generalTips.length > 0) {
    return selectRandomTip(generalTips);
  }
  
  // En dernier recours, prendre n'importe quel conseil
  return selectRandomTip(tips);
}

/**
 * Sélectionne 3 conseils distincts pour un joueur
 */
export interface SelectedTips {
  technique: TechniqueTip;
  tactique: Tip;
  mental: Tip;
}

export function selectThreeTips(
  niveau: number,
  breakdown: {
    technique: number;
    tactique: number;
    experience: number;
    physique: number;
    situations: number;
  },
  responses?: {
    vitres?: number;
    coupsBase?: number;
    service?: number;
    volee?: number;
    smash?: number;
  }
): SelectedTips {
  const category = getLevelCategory(niveau);
  const tips = PADEL_TIPS[category];
  
  // Déterminer le point faible technique
  const weakPoint = getWeakTechnicalPoint(breakdown, responses);
  
  // Sélectionner le conseil technique basé sur le point faible
  const technicalTip = selectTechnicalTip(tips.technique, weakPoint);
  
  // Sélectionner un conseil tactique aléatoire
  const tacticalTip = selectRandomTip(tips.tactique);
  
  // Sélectionner un conseil mental aléatoire
  const mentalTip = selectRandomTip(tips.mental);
  
  return {
    technique: technicalTip,
    tactique: tacticalTip,
    mental: mentalTip,
  };
}
