/**
 * Système de conseils ultra-personnalisés basés sur les réponses détaillées du questionnaire
 */

export interface QuestionnaireAnswers {
  q1: number; // Vitre
  q2: number; // Régularité
  q3: number; // Service
  q4: number; // Volée
  q5: number; // Smash
  q6: number; // Lob
  q7: number; // Coup fiable
  q8: number; // Positionnement
  q9: number; // Anticipation
  q10: number; // Communication
  q11: number; // Tempo
  q12: number; // Construction
  q13: number; // Ratio risque
  q14: number; // Passé sportif
  q15: number; // Fréquence
  q16: number; // Tournois
  q17: number; // Résultats
  q18: number; // Classement FFT
  q19: number; // Endurance
  q20: number; // Pression
  q21: number; // Double vitre
  q22: number; // Niveau supérieur
}

export interface UserProfile {
  preferred_side?: "left" | "right" | "indifferent" | null;
}

/**
 * RÈGLE 1 : CONSEIL CORRECTIF (Basé sur la question la plus faible)
 */
function getCorrectiveAdvice(answers: QuestionnaireAnswers): string {
  // Créer un tableau avec toutes les questions et leurs scores
  const questions = [
    { id: 1, score: answers.q1, priority: 1 }, // Technique prioritaire
    { id: 2, score: answers.q2, priority: 1 },
    { id: 3, score: answers.q3, priority: 1 },
    { id: 4, score: answers.q4, priority: 1 },
    { id: 5, score: answers.q5, priority: 1 },
    { id: 6, score: answers.q6, priority: 1 },
    { id: 7, score: answers.q7, priority: 1 },
    { id: 8, score: answers.q8, priority: 2 },
    { id: 9, score: answers.q9, priority: 2 },
    { id: 10, score: answers.q10, priority: 2 },
    { id: 11, score: answers.q11, priority: 2 },
    { id: 12, score: answers.q12, priority: 2 },
    { id: 13, score: answers.q13, priority: 2 },
    { id: 14, score: answers.q14, priority: 3 },
    { id: 15, score: answers.q15, priority: 3 },
    { id: 16, score: answers.q16, priority: 3 },
    { id: 17, score: answers.q17, priority: 3 },
    { id: 18, score: answers.q18, priority: 3 },
    { id: 19, score: answers.q19, priority: 4 },
    { id: 20, score: answers.q20, priority: 4 },
    { id: 21, score: answers.q21, priority: 5 },
    { id: 22, score: answers.q22, priority: 5 },
  ];

  // Trier par score croissant, puis par priorité (technique en premier)
  questions.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return a.priority - b.priority;
  });

  const weakestQuestion = questions[0];
  const score = weakestQuestion.score;

  // Conseils par question et score
  switch (weakestQuestion.id) {
    case 1: // Vitre
      if (score <= 3) {
        return "À l'entraînement, oblige-toi à laisser la balle toucher la vitre avant de frapper. Dis 'Vitre' à voix haute pour programmer ton cerveau.";
      } else if (score <= 6) {
        return "Arrête de reculer en ligne droite. Fais un pas chassé vers le centre avant de reculer pour t'ouvrir l'angle croisé.";
      } else {
        return "Ta défense est passive. Sur balle facile après vitre, travaille la Chiquita (balle lente dans les pieds) pour monter au filet.";
      }

    case 2: // Régularité
      if (score <= 3) {
        return "Objectif : tenir 10 échanges sans faute. Joue au centre à 70% de puissance. La régularité bat la puissance au padel.";
      } else if (score <= 6) {
        return "Tu fais trop de fautes gratuites. Règle : si tu es mal placé ou en déséquilibre, joue haut et au centre. Ne force jamais.";
      } else {
        return "Ta régularité est bonne. Ajoute la pression : tiens 20 échanges en variant les zones sans perdre en précision.";
      }

    case 3: // Service
      if (score <= 3) {
        return "Concentre-toi sur la régularité : vise le carré central à 60% de puissance. Zéro double-faute = victoire.";
      } else if (score <= 6) {
        return "Ton service est prévisible. Alterne : service lifté sur vitre latérale puis service plat sur le T. Change tous les 2 points.";
      } else {
        return "Ton service est une arme. Sur service fort au centre, monte immédiatement au filet. Service = attaque au padel moderne.";
      }

    case 4: // Volée
      if (score <= 3) {
        return "Tu as peur du filet. Règle : dès que tu joues un lob qui passe, cours toucher le filet avec ta raquette. Le filet = victoire.";
      } else if (score <= 6) {
        return "Tu rates tes volées basses. Plie les genoux jusqu'au niveau de la balle, garde la raquette haute. Tes cuisses brûlent, pas ton poignet.";
      } else {
        return "Ajoute la volée amortie de revers : quand la balle arrive doucement, caresse le dessous pour qu'elle meure derrière le filet.";
      }

    case 5: // Smash
      if (score <= 3) {
        return "La force est punie par la vitre. Fais un smash à 50% qui rebondit avant le carré adverse : plus efficace que la puissance.";
      } else if (score <= 6) {
        return "Adopte la Bandeja : coup coupé au centre quand le lob est profond. Ton but : garder le filet, pas finir à tout prix.";
      } else {
        return "Lis la position adverse : au filet = Par 4, au fond = Rulo à la grille, mal placés = Vibora rapide. Le choix fait le joueur d'élite.";
      }

    case 6: // Lob
      if (score <= 3) {
        return "Ton lob est trop court. Pense HAUTEUR. Vise le toit. Une balle très haute est plus difficile à smasher qu'une mi-haute.";
      } else if (score <= 6) {
        return "Tu lobes en reculant, d'où tes lobs courts. Règle : on lobe seulement si on est stable. En déséquilibre, joue bas.";
      } else {
        return "Masque ta préparation : prépare comme un coup fort, puis passe sous la balle au dernier moment. Le lob masqué est l'arme fatale.";
      }

    case 7: // Coup fiable
      if (score <= 3) {
        return "Choisis un coup signature et travaille-le 80% du temps : le lob défensif est le plus utile pour progresser.";
      } else if (score <= 6) {
        return "Rends ton coup fort infaillible : 9 fois sur 10 sous pression. C'est ta bouée de sauvetage.";
      } else {
        return "Ajoute la sortie de balle (salida) sur balles lentes. C'est le coup spectaculaire qui brise le moral adverse.";
      }

    case 8: // Positionnement
      if (score <= 4) {
        return "Si ton partenaire monte, tu montes. Si il recule, tu recules. Vous êtes un bloc, jamais séparés.";
      } else if (score <= 7) {
        return "Monte uniquement après un lob profond ou une balle dans les pieds adverse. Sinon, tu te feras passer.";
      } else {
        return "Travaille le replacement éclair après un smash raté. 2 pas rapides vers le fond, jambes fléchies, prêt à défendre.";
      }

    case 9: // Anticipation
      if (score <= 3) {
        return "Regarde la raquette adverse, pas la balle. Sa direction te dit où la balle va partir 0.5 sec avant.";
      } else if (score <= 6) {
        return "Identifie les 3 zones possibles (croisé, centre, long de ligne) et positionne-toi pour couvrir les 2 plus probables.";
      } else {
        return "Lis le langage corporel : préparation tôt = coup fort. Préparation tardive = coup haut. Anticipe l'intention.";
      }

    case 10: // Communication
      if (score <= 3) {
        return "Avant chaque point, désignez qui prend le centre : 'Je prends les lobs' ou 'Tu prends le centre'. Clarifiez avant de jouer.";
      } else if (score <= 6) {
        return "Annonce la position adverse ('Au fond !', 'Collés !') pour aider ton partenaire qui a le dos tourné.";
      } else {
        return "Utilisez des codes courts ('Milieu', 'Faible', 'Switch'). Encourage après chaque faute de ton partenaire.";
      }

    case 11: // Tempo
      if (score <= 3) {
        return "Prends le contrôle : après un échange rapide, joue un lob lent pour reprendre souffle et position. Tu décides du tempo.";
      } else if (score <= 6) {
        return "Joue 3 balles lentes puis une très rapide. Le changement de rythme provoque la faute adverse.";
      } else {
        return "Identifie si l'adversaire préfère le jeu lent ou rapide. Impose le tempo opposé à sa préférence.";
      }

    case 12: // Construction
      if (score <= 3) {
        return "70% des points se gagnent sur faute adverse. Ton but : faire jouer UNE balle de plus à l'adversaire.";
      } else if (score <= 6) {
        return "Identifie le joueur faible et jouez 80% des balles sur lui pendant 3 jeux. C'est tactique, pas méchant.";
      } else {
        return "Joue 'au frigo' : envoie 3 balles croisées, l'adversaire anticipe croisé, puis frappe long de ligne. Piège mental.";
      }

    case 13: // Ratio risque
      if (score <= 4) {
        return "Tu perds plus de points que l'adversaire n'en gagne. Joue au centre et bas pendant 5 points. La patience gagne.";
      } else if (score <= 6) {
        return "Tu ne fais pas de fautes mais tu subis. Règle : si tu as le filet ET balle lente, tu DOIS attaquer.";
      } else {
        return "Ton ratio est bon. Compte tes winners et fautes par match. Objectif : 2 winners pour 1 faute. C'est le ratio des pros.";
      }

    case 19: // Endurance
      if (score <= 4) {
        return "Tu t'épuises car tu es mal placé. Replace-toi au centre de ton carré après chaque coup. L'endurance = économie de mouvement.";
      } else {
        return "Ton endurance est bonne. Maintenant, travaille l'intensité : accélère sur les balles faciles pour économiser l'énergie sur les difficiles.";
      }

    case 20: // Pression
      if (score <= 4) {
        return "Avant chaque Punto de Oro, prends 3 grandes respirations et visualise ton meilleur coup. Le cerveau suit le corps.";
      } else {
        return "Tu gères bien la pression. Deviens le joueur 'Clutch' : demande à servir sur les points décisifs. Ton mental est un atout.";
      }

    case 14: // Passé sportif
      if (score <= 2) {
        return "Ton passé sportif est limité. Compense par la régularité : joue 80% au centre, 20% varié. La constance bat le talent non entraîné.";
      } else if (score <= 5) {
        return "Tu as une base solide. Transfère tes automatismes : si tu viens du tennis, oublie les effets latéraux, privilégie la profondeur.";
      } else {
        return "Ton expérience sportive est un atout. Utilise-la pour lire les trajectoires : ton œil est déjà formé, adapte juste la raquette.";
      }

    case 15: // Fréquence
      if (score <= 2) {
        return "Tu joues peu. Pour progresser malgré tout : concentre-toi sur UNE chose par match (ex: 'Aujourd'hui je lobe à chaque balle haute').";
      } else if (score <= 5) {
        return "Ta fréquence est correcte. Pour maximiser : avant chaque match, fixe-toi 2 objectifs techniques précis (ex: '10 volées gagnantes').";
      } else {
        return "Tu joues régulièrement. Exploite cette régularité : teste une nouvelle tactique pendant 3 matchs, puis ajuste selon les résultats.";
      }

    case 16: // Tournois
      if (score <= 2) {
        return "Tu ne joues pas en compétition. Pour progresser : participe à des tournois internes. La pression révèle tes vraies faiblesses.";
      } else if (score <= 4) {
        return "Tu commences les tournois. Objectif : passe au moins un tour. Pour ça, joue ton jeu le plus sûr les 2 premiers matchs.";
      } else {
        return "Tu es habitué aux tournois. En compétition, sois plus agressif qu'à l'entraînement : les adversaires sont moins prévisibles.";
      }

    case 17: // Résultats
      if (score <= 1) {
        return "Tes résultats sont limités. Change de stratégie : au lieu de viser la victoire, vise 'ne pas faire de fautes gratuites'. Les résultats suivront.";
      } else if (score <= 5) {
        return "Tu progresses en tournois. Pour gagner plus : identifie ton meilleur moment (début/milieu/fin) et exploite-le tactiquement.";
      } else {
        return "Tu as de bons résultats. Pour aller plus loin : analyse tes défaites. 80% des erreurs viennent de mauvais choix, pas de technique.";
      }

    case 18: // Classement FFT
      if (score <= 3) {
        return "Ton classement est bas. Pour progresser : joue contre des joueurs 2 niveaux au-dessus. Tu perdras mais tu apprendras 10x plus vite.";
      } else if (score <= 5) {
        return "Ton classement progresse. Continue : joue 70% contre ton niveau, 30% contre niveau supérieur. L'équilibre fait progresser.";
      } else {
        return "Tu es bien classé. Pour monter encore : travaille tes points faibles en match amical, garde tes points forts pour la compétition.";
      }

    case 22: // Niveau supérieur
      if (score <= 4) {
        return "Tu perds contre niveau supérieur. Stratégie : joue 2x plus lentement. Ils s'impatientent et font des fautes. La patience est ta force.";
      } else if (score <= 6) {
        return "Tu es compétitif contre niveau supérieur. Pour gagner : exploite leur ego. Joue simple, ils vont forcer et faillir.";
      } else {
        return "Tu gagnes régulièrement contre niveau supérieur. Tu es sous-classé. Monte de niveau : joue des tournois plus relevés pour progresser encore.";
      }

    default:
      // Ne devrait jamais arriver, mais au cas où, retourner un conseil basé sur la question la plus faible
      const allScores = [
        answers.q1, answers.q2, answers.q3, answers.q4, answers.q5, answers.q6, answers.q7,
        answers.q8, answers.q9, answers.q10, answers.q11, answers.q12, answers.q13,
        answers.q14, answers.q15, answers.q16, answers.q17, answers.q18,
        answers.q19, answers.q20, answers.q21, answers.q22
      ];
      const minScore = Math.min(...allScores);
      if (minScore <= 3) {
        return "Tu as plusieurs points faibles. Concentre-toi sur UN seul aspect pendant 2 semaines. La spécialisation temporaire accélère la progression.";
      } else if (minScore <= 6) {
        return "Tes bases sont solides. Pour progresser : ajoute la variété. Alterne jeu offensif et défensif selon le score et la fatigue adverse.";
      } else {
        return "Tu es équilibré partout. Pour monter de niveau : travaille l'intensité. Joue chaque point comme un Punto de Oro pendant 1 set par match.";
      }
  }
}

/**
 * RÈGLE 2 : CONSEIL DE RENFORCEMENT (Basé sur le point fort)
 */
function getReinforcementAdvice(answers: QuestionnaireAnswers): string {
  // Calculer les moyennes par catégorie
  const moyenneTechnique = (
    answers.q1 + answers.q2 + answers.q3 + answers.q4 + answers.q5 + answers.q6 + answers.q7
  ) / 7;

  const moyenneTactique = (
    answers.q8 + answers.q9 + answers.q10 + answers.q11 + answers.q12 + answers.q13
  ) / 6;

  const moyenneExperience = (
    answers.q14 + answers.q15 + answers.q16 + answers.q17 + answers.q18
  ) / 5;

  // Identifier la catégorie la plus forte
  const maxMoyenne = Math.max(moyenneTechnique, moyenneTactique, moyenneExperience);

  // PRIORITÉ 1 : Conseils spécifiques pour questions individuelles exceptionnelles
  if (answers.q2 >= 8) {
    return "Ta régularité est exceptionnelle. Joue le 'Jeu Long' : impose des échanges de 15+ coups. Tu ne fatigues pas, eux oui.";
  }

  if (answers.q20 >= 8) {
    return "Tu es solide sous pression. Deviens le joueur 'Clutch' : demande à servir sur les Puntos de Oro. Ton mental compense les faiblesses techniques.";
  }

  if (answers.q6 >= 8) {
    return "Ton lob est une arme. Utilise-le stratégiquement : 3 balles au centre pour les faire reculer, puis 1 lob profond. Ils ne peuvent plus attaquer.";
  }

  if (answers.q4 >= 8) {
    return "Ta volée est excellente. Exploite-la : après chaque service, monte immédiatement. Le service-volée est le combo gagnant au padel moderne.";
  }

  if (answers.q9 >= 8) {
    return "Tu anticipes parfaitement. Deviens le stratège : annonce à ton partenaire où tu vas jouer AVANT de frapper. La communication préventive gagne les matchs.";
  }

  // PRIORITÉ 2 : Conseils selon la catégorie la plus forte
  if (maxMoyenne === moyenneTechnique && moyenneTechnique >= 7) {
    return "Tu as un bras solide. Garde ton meilleur coup pour finir. Pour construire, joue simple et profond. Ton arme n'est pas une obligation.";
  }

  if (maxMoyenne === moyenneTactique && moyenneTactique >= 7) {
    return "Tu lis bien le jeu. Deviens le capitaine : annonce les zones libres. Utilise le changement de rythme (3 lentes + 1 rapide) pour déstabiliser.";
  }

  if (maxMoyenne === moyenneExperience && moyenneExperience >= 7) {
    return "Ton expérience est un atout. En début de match, analyse les adversaires : identifie leur maillon faible et exploite-le pendant 3 jeux.";
  }

  // PRIORITÉ 3 : Si les moyennes sont moyennes, trouver la meilleure question individuelle
  const allQuestions = [
    { id: 1, score: answers.q1, label: "Vitre" },
    { id: 2, score: answers.q2, label: "Régularité" },
    { id: 3, score: answers.q3, label: "Service" },
    { id: 4, score: answers.q4, label: "Volée" },
    { id: 5, score: answers.q5, label: "Smash" },
    { id: 6, score: answers.q6, label: "Lob" },
    { id: 7, score: answers.q7, label: "Coup fiable" },
    { id: 8, score: answers.q8, label: "Positionnement" },
    { id: 9, score: answers.q9, label: "Anticipation" },
    { id: 10, score: answers.q10, label: "Communication" },
    { id: 11, score: answers.q11, label: "Tempo" },
    { id: 12, score: answers.q12, label: "Construction" },
    { id: 13, score: answers.q13, label: "Ratio risque" },
    { id: 19, score: answers.q19, label: "Endurance" },
    { id: 20, score: answers.q20, label: "Pression" },
    { id: 21, score: answers.q21, label: "Double vitre" },
  ];

  // Trier par score décroissant pour trouver le meilleur point
  allQuestions.sort((a, b) => b.score - a.score);
  const bestQuestion = allQuestions[0];

  if (bestQuestion.score >= 6) {
    // Conseils spécifiques selon la meilleure question
    switch (bestQuestion.id) {
      case 1:
        return "Ta gestion des vitres est solide. Exploite-la : joue volontairement sur la vitre latérale pour créer des angles impossibles à défendre.";
      case 2:
        return "Ta régularité est ton atout. Joue le 'Jeu Long' : impose des échanges de 15+ coups. Tu ne fatigues pas, eux oui.";
      case 3:
        return "Ton service est efficace. Monte au filet après chaque service réussi. Le service-volée est le combo gagnant.";
      case 4:
        return "Ta volée est bonne. Exploite-la : après chaque lob qui passe, monte immédiatement. Le filet est ta zone de domination.";
      case 5:
        return "Ton smash est maîtrisé. Utilise-le stratégiquement : au filet = Par 4, au fond = Rulo, mal placés = Vibora. Le choix fait la différence.";
      case 6:
        return "Ton lob est efficace. Utilise-le pour reprendre le filet : 3 balles au centre, puis 1 lob profond. Ils reculent, tu montes.";
      case 7:
        return "Tu as un coup fiable. Utilise-le sous pression : sur les points décisifs, joue ton coup signature. La confiance gagne les matchs serrés.";
      case 8:
        return "Ton positionnement est bon. Améliore-le : après chaque coup, replace-toi au centre de ton carré. L'économie de mouvement = endurance.";
      case 9:
        return "Tu anticipes bien. Exploite-le : annonce à ton partenaire où tu vas jouer AVANT de frapper. La communication préventive gagne.";
      case 10:
        return "Ta communication est efficace. Renforce-la : utilise des codes courts ('Milieu', 'Faible', 'Switch'). La clarté évite les erreurs.";
      case 11:
        return "Tu contrôles le tempo. Exploite-le : joue 3 balles lentes puis 1 très rapide. Le changement de rythme provoque la faute adverse.";
      case 12:
        return "Tu construis bien tes points. Améliore-le : identifie le joueur faible et joue 80% des balles sur lui pendant 3 jeux. C'est tactique.";
      case 13:
        return "Ton ratio risque/réussite est bon. Compte tes winners et fautes par match. Objectif : 2 winners pour 1 faute. C'est le ratio des pros.";
      case 19:
        return "Ton endurance est bonne. Exploite-la : en fin de set, accélère. Tes adversaires sont fatigués, toi non. C'est l'avantage décisif.";
      case 20:
        return "Tu gères bien la pression. Deviens le joueur 'Clutch' : demande à servir sur les Puntos de Oro. Ton mental est un atout.";
      case 21:
        return "Tu gères bien les doubles vitres. Transforme en contre-attaque : sors la balle coupée entre les 2 adversaires. Coup démoralisant.";
      default:
        break;
    }
  }

  // Dernier recours : conseil basé sur la meilleure catégorie même si moyenne < 7
  if (maxMoyenne === moyenneTechnique) {
    return "Ta technique est ton point le plus solide. Pour progresser : ajoute la variété. Alterne puissance et placement selon la situation.";
  }

  if (maxMoyenne === moyenneTactique) {
    return "Ta tactique est ton atout. Pour progresser : deviens le capitaine. Annonce les zones libres et guide ton partenaire.";
  }

  if (maxMoyenne === moyenneExperience) {
    return "Ton expérience est un atout. Exploite-la : en début de match, analyse les adversaires et adapte ta stratégie selon leurs faiblesses.";
  }

  // Si vraiment tout est équilibré, conseil spécifique basé sur la meilleure question
  if (bestQuestion.score >= 5) {
    return `Ton point fort est ${bestQuestion.label.toLowerCase()}. Exploite-le : utilise cette compétence 30% de plus que les autres. La spécialisation temporaire accélère la progression.`;
  }

  // Dernier recours absolu : conseil actionnable même si tout est faible
  return "Tu as plusieurs points à travailler. Stratégie : concentre-toi sur UN seul aspect pendant 2 semaines. La spécialisation temporaire accélère la progression.";
}

/**
 * RÈGLE 3 : CONSEIL DE PROFIL (Basé sur côté + style)
 */
function getProfileAdvice(
  answers: QuestionnaireAnswers,
  preferredSide?: "left" | "right" | "indifferent" | null
): string {
  const side = preferredSide || "indifferent";
  const q13Score = answers.q13;

  // Déterminer le style de risque
  let style: "fonceur" | "équilibré" | "solide";
  if (q13Score <= 3) {
    style = "fonceur";
  } else if (q13Score >= 8) {
    style = "solide";
  } else {
    style = "équilibré";
  }

  // Conseils par profil
  if (side === "left") {
    if (style === "fonceur") {
      return "Tu es à gauche et tu veux finir. Parfait. Sur TOUS les lobs au milieu, c'est TOI le patron. Prends la balle, même sur le coup droit de ton partenaire.";
    } else if (style === "solide") {
      return "Un joueur de gauche qui ne prend pas de risques perd son rôle. Ton partenaire compte sur ton agressivité. Ose smasher sur balles faciles !";
    } else {
      return "À gauche avec un jeu équilibré, c'est optimal ! Ton rôle : prendre les balles aériennes au centre et finir les points ouverts.";
    }
  }

  if (side === "right") {
    if (style === "solide") {
      return "À droite avec un jeu solide, tu es le cerveau. Joue 70% en diagonale sur le gauche adverse. Long de ligne uniquement pour surprendre.";
    } else if (style === "fonceur") {
      return "Joueur de droite agressif, c'est rare ! Monte au filet après ton service et intercepte. Tu surprendras les joueurs classiques.";
    } else {
      return "À droite avec un jeu équilibré, c'est le profil idéal. Ton arme : le lob croisé sur le gauche adverse. Répète-le 10 fois par match.";
    }
  }

  // Polyvalent / Indifférent
  return "Tu joues des deux côtés. Ta force : l'adaptation. Teste les 2 adversaires pendant 3 jeux, puis : 'On joue tout sur le faible'.";
}

/**
 * Sélectionne 3 conseils ultra-personnalisés basés sur les réponses détaillées
 */
export function selectThreeTips(
  answers: QuestionnaireAnswers,
  userProfile?: UserProfile
): string[] {
  // DEBUG : Afficher les réponses détaillées
  console.log("🔍 DEBUG CONSEILS - Réponses du questionnaire:", {
    q1: answers.q1, q2: answers.q2, q3: answers.q3, q4: answers.q4,
    q5: answers.q5, q6: answers.q6, q7: answers.q7,
    q8: answers.q8, q9: answers.q9, q10: answers.q10, q11: answers.q11,
    q12: answers.q12, q13: answers.q13,
    q14: answers.q14, q15: answers.q15, q16: answers.q16, q17: answers.q17, q18: answers.q18,
    q19: answers.q19, q20: answers.q20, q21: answers.q21, q22: answers.q22,
  });

  // Trouver la question la plus faible pour le debug
  const allScores = [
    { q: "Q1 (Vitre)", score: answers.q1 },
    { q: "Q2 (Régularité)", score: answers.q2 },
    { q: "Q3 (Service)", score: answers.q3 },
    { q: "Q4 (Volée)", score: answers.q4 },
    { q: "Q5 (Smash)", score: answers.q5 },
    { q: "Q6 (Lob)", score: answers.q6 },
    { q: "Q7 (Coup fiable)", score: answers.q7 },
    { q: "Q8 (Positionnement)", score: answers.q8 },
    { q: "Q9 (Anticipation)", score: answers.q9 },
    { q: "Q10 (Communication)", score: answers.q10 },
    { q: "Q11 (Tempo)", score: answers.q11 },
    { q: "Q12 (Construction)", score: answers.q12 },
    { q: "Q13 (Ratio risque)", score: answers.q13 },
    { q: "Q14 (Passé sportif)", score: answers.q14 },
    { q: "Q15 (Fréquence)", score: answers.q15 },
    { q: "Q16 (Tournois)", score: answers.q16 },
    { q: "Q17 (Résultats)", score: answers.q17 },
    { q: "Q18 (Classement FFT)", score: answers.q18 },
    { q: "Q19 (Endurance)", score: answers.q19 },
    { q: "Q20 (Pression)", score: answers.q20 },
    { q: "Q21 (Double vitre)", score: answers.q21 },
    { q: "Q22 (Niveau supérieur)", score: answers.q22 },
  ];
  allScores.sort((a, b) => a.score - b.score);
  const questionFaible = allScores[0];

  // Calculer les moyennes pour le debug
  const moyenneTechnique = (
    answers.q1 + answers.q2 + answers.q3 + answers.q4 + answers.q5 + answers.q6 + answers.q7
  ) / 7;
  const moyenneTactique = (
    answers.q8 + answers.q9 + answers.q10 + answers.q11 + answers.q12 + answers.q13
  ) / 6;
  const moyenneExperience = (
    answers.q14 + answers.q15 + answers.q16 + answers.q17 + answers.q18
  ) / 5;

  const maxMoyenne = Math.max(moyenneTechnique, moyenneTactique, moyenneExperience);
  let categorieForte = "technique";
  if (maxMoyenne === moyenneTactique) categorieForte = "tactique";
  if (maxMoyenne === moyenneExperience) categorieForte = "experience";

  const styleRisque = answers.q13 <= 3 ? "fonceur" : answers.q13 >= 8 ? "solide" : "équilibré";

  console.log("🔍 DEBUG CONSEILS - Analyse:", {
    questionFaible: questionFaible.q,
    scoreFaible: questionFaible.score,
    categorieForte,
    scoreCategorieForte: maxMoyenne.toFixed(2),
    styleRisque,
    cotePrefere: userProfile?.preferred_side || "non renseigné",
  });

  const advice1 = getCorrectiveAdvice(answers);
  const advice2 = getReinforcementAdvice(answers);
  const advice3 = getProfileAdvice(answers, userProfile?.preferred_side || null);

  console.log("🔍 DEBUG CONSEILS - Conseils générés:", {
    conseil1: advice1.substring(0, 80) + "...",
    conseil2: advice2.substring(0, 80) + "...",
    conseil3: advice3.substring(0, 80) + "...",
  });

  return [advice1, advice2, advice3];
}

// ============================================
// FONCTIONS DE COMPATIBILITÉ (pour l'ancien système)
// ============================================

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
  beginner: {
    technique: [],
    tactique: [],
    mental: { text: "" },
  },
  intermediate: {
    technique: [],
    tactique: [],
    mental: { text: "" },
  },
  advanced: {
    technique: [],
    tactique: [],
    mental: { text: "" },
  },
  expert: {
    technique: [],
    tactique: [],
    mental: { text: "" },
  },
};

export function getLevelCategory(niveau: number): TipCategory {
  if (niveau <= 2.5) return 'beginner';
  if (niveau <= 4.5) return 'intermediate';
  if (niveau <= 6.5) return 'advanced';
  return 'expert';
}

export function getWeakTechnicalPoint(
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
    lobs?: number;
  }
): string {
  if (responses) {
    const techniqueScores = [
      { tag: 'vitres', score: responses.vitres || 0 },
      { tag: 'coupsBase', score: responses.coupsBase || 0 },
      { tag: 'service', score: responses.service || 0 },
      { tag: 'volee', score: responses.volee || 0 },
      { tag: 'smash', score: responses.smash || 0 },
      { tag: 'lob', score: responses.lobs || 0 },
    ];
    techniqueScores.sort((a, b) => a.score - b.score);
    if (techniqueScores[0].score < 6) {
      return techniqueScores[0].tag;
    }
  }
  return 'general';
}
