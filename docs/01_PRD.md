# PadelXP — PRD, Vision, Stack et Guidelines (MVP)

Version: 1.0
Statut: Concept validé → MVP
Périmètre: Complexes de padel (B2B) et joueurs (B2C)

1) Executive Summary
Vision: Transformer les complexes de padel en communautés compétitives grâce à un leaderboard temps réel, des rangs, des badges et des ligues faciles à lancer.

Problème: Peu de fidélisation, beaucoup de gestion manuelle, pas de données sur l’engagement, animations chronophages.

Solution: Une plateforme SaaS simple qui:

Permet aux clubs de créer des ligues en 5 minutes.

Gamifie l’expérience (rangs, badges, streaks).

Recalcule automatiquement les classements et expose des stats en temps réel.

Modèle économique:

Free: 0€ jusqu’à 50 joueurs.

Pro: 29€/mois (ligues illimitées, stats).

Enterprise: 99€/mois (multi-sites, API, écrans club).

2) Objectifs (Business et Produit)
Business (6 mois):

50 complexes → 2 500 joueurs → 10 000 matchs enregistrés.

30% de conversion Free → Pro.

70% de rétention à 30 jours.

Produit (SLA et UX):

Setup d’une ligue: < 10 minutes.

Soumission d’un match: < 30 secondes.

Leaderboard à jour: < 5 secondes.

Mobile-first, PWA installable.

3) Personas & Besoins
Gérant de complexe:

Besoins: setup rapide, 0 calcul manuel, dashboard d’activité, différenciation, ROI mesurable.

Jobs-to-be-done: lancer une ligue sans Excel; voir les joueurs actifs et en faire des ambassadeurs.

Joueur compétitif:

Besoins: progression visible, rangs/badges, rivalités, simplicité de saisie.

JTBD: enregistrer le résultat immédiatement, monter au classement, débloquer des badges.

Joueur occasionnel:

Besoins: onboarding doux, matchmaking de niveau, encouragements, stats simples.

JTBD: participer sans pression, se sentir inclus.

Administrateur de ligue:

Besoins: validation souple des résultats, communication automatique, formats flexibles.

JTBD: automatiser la mise à jour et la publication des classements.

4) Problèmes → Solutions
Engagement faible → Gamification (rangs, badges, objectifs hebdo) et leaderboard public.

Organisation chronophage → Calculs auto, soumission par les joueurs, notifications.

Pas de data → Dashboard live (matchs, joueurs actifs, progression), export.

Communauté fragile → Hub social via le leaderboard + rituels (champion du mois).

5) Proposition de valeur
Pour les complexes: +40% de rétention, -100% calculs manuels, +25% revenus (créneaux remplis), différenciation locale.

Pour les joueurs: fun immédiat (badges), accomplissement (rangs), appartenance (classement), objectifs clairs.

6) KPIs (North Star & secondaires)
North Star: matchs soumis/semaine.

Secondaires: complexes inscrits/activés, WAU, matchs/joueur/semaine, D7/D30 retention, conversion Free→Pro, MRR, LTV/CAC.

7) Priorités MVP (P0 → P1 → P2)
P0 (MVP):

Côté club: création d’organisation, création d’une ligue, leaderboard live, dashboard basique.

Côté joueur: auth simple (email/tel), rejoindre un club (QR/lien), soumettre un match (<30s), profil (stats), rangs (Bronze→Challenger), badges basiques (FirstWin, Win5, Streak3, Veteran).

Technique: PWA, base SQL, 1 fonction de calcul du leaderboard (full refresh).

P1 (post-MVP rapide):

Notifications (rank up, badges, défis), multi-ligues, historiques confrontations, objectifs hebdo, exports PDF/CSV.

P2 (croissance):

Matchmaking intelligent, feed social, upload photos, API publique.

8) Feature KILLER: Ghost Players (Joueurs Fantômes)
Problème: un joueur inscrit joue avec des amis non inscrits → friction.

Solution: création automatique d’un “compte fantôme” par téléphone (8 derniers chiffres) lors de la soumission.

Effets:

Le ghost apparait dans le leaderboard (icône 👻), gagne/perd des points, rangs calculés; badges en “locked” jusqu’à inscription.

SMS d’invitation personnalisé (lien pour “réclamer” le compte); à l’inscription, fusion automatique (👻 → ✓) et déblocage des badges.

Bénéfices:

Friction 0, croissance virale (chaque joueur amène 2–3 ghosts), pas de pertes de données, conversion naturelle (50% visé après 3–5 matchs).

Triggers d’invitation:

Après 1er match; après 3 matchs; lors d’un rank up; si détrôné par un ami.

9) Architecture Produit (MVP)
Frontend: PWA (web + mobile)

Pages clés: Accueil club (QR), Leaderboard, Soumission match, Profil joueur, Dashboard club.

Backend logique:

Ingestion des matchs → Recalcul complet du leaderboard (idempotent, déterministe).

Règles métier: points (+10 win, +3 défaite), rangs, streaks, badges, ISO-week.

Ghost Players: création/merge, statistiques conservées, invitations.

Données:

Entités principales: organizations, users, players, leagues, matches, leaderboards, achievements, notifications.

Clé d’identité joueur locale: 8 derniers chiffres du téléphone par organisation (évite les doublons de noms).

10) Stack Technique Recommandée
Frontend:

Next.js 15 (App Router), TypeScript, TailwindCSS + shadcn/ui, Framer Motion, React Query, Zustand.

PWA (installable, cache, push).

Backend:

Base SQL managée (PostgreSQL), Auth (email/phone), Realtime, Storage (avatars), Edge Functions pour la logique métier.

Services:

SMS (Twilio/Vonage), Emails transactionnels (Resend), Analytics (Posthog), Error tracking (Sentry).

Hébergement:

Vercel (frontend + edge) + base gérée (cloud) → déploiement simple, coûts maîtrisés.

11) Analyse Coûts (ordre de grandeur)
MVP (≤ 2 500 joueurs / 50 clubs): ~100–120€/mois (hébergement + SMS/emails).

Croissance (10 000 joueurs / 200 clubs): ~450–900€/mois.

Scale (25 000+ joueurs / 500+ clubs): ~2 500€/mois (toujours rentable vs revenus).

12) Data Model (extrait conceptuel)
organizations: club (nom, adresse, abonnement).

users: comptes authentifiés (email, phone).

players: liaison user↔club, phone_last_8 (unique par club), is_ghost, stats cumulées, rang/level, badges/badges_locked.

leagues: configuration de compétition (type, dates, règles).

matches: résultats (4 joueurs, équipe gagnante, scores/horodatage, validé).

leaderboards: snapshots/entrées de classement par ligue.

achievements: badges attachés à un player.

notifications: événements envoyés aux users (rank up, badge, défi).

Règles-clés:

Identity: (organization_id, phone_last_8) pour dédupliquer.

Ghost flow: is_ghost = true jusqu’au “claim”; merge non destructif.

Calculs: full recompute à chaque ajout/édition (simplicité, robustesse, pas de dérives cumulées).

13) Règles Métier (MVP)
Points:

Victoire: +10 points; Défaite: +3 points.

Streak:

+1 en cas de win, reset 0 en cas de lose; meilleure_serie = max(streak).

Rangs (par points):

Bronze (0–49), Silver (50–99), Gold (100–199), Platinum (200–299), Diamond (300–499), Master (700–999), Challenger (1000+).

Niveaux (par victoires):

Débutant (0–4), Confirmé (5–14), Expert (15–29), Élite (30+).

Badges (MVP):

FirstWin, Win5, Win10, Streak3, Streak5, Veteran (≥50 matchs).

Ghost: badges en “locked” jusqu’à inscription (effet FOMO).

Matchs semaine:

Compte des matchs dans la semaine ISO du dernier match (pour activité récente).

14) User Flows Critiques
Setup club (gérant):

Crée son organisation → Ligues → QR à partager → Dashboard live.

Soumission match (joueur):

Saisie 4 joueurs (auto-suggest ou ajout ghost), équipe gagnante, submit (<30s).

Validation ghost:

Ghost créé si joueur inconnu; invitation SMS; claim → fusion automatique.

Leaderboard:

Tri points décroissants, rangs visibles, icônes (✓ inscrit / 👻 ghost), aperçu badges.

15) Sécurité & Conformité (MVP)
Auth sécurisée (email/phone).

Règles d’accès par organisation (un player n’est visible que dans son club).

Minimisation des données (stockage des 8 derniers chiffres, pas besoin du numéro complet).

Journalisation des actions sensibles (création match, claim ghost).

Export/suppression de compte (conformité RGPD à prévoir en P1).

16) Roadmap Macro
Mois 1–2 (MVP):

PWA, Auth, DB, soumission match, leaderboards, Ghost Players, rangs/badges de base, dashboard simple.

Mois 3–4 (Growth):

Notifications, objectifs hebdo, multi-ligues, exports, stats avancées.

Mois 5–6 (Scale):

P2: Matchmaking, feed social, upload photos, écrans club, API publique.

17) Structure de Documentation (pour Cursor)
Place ce dossier dans /docs (Cursor indexe très bien ce répertoire):

/docs

01_PRD.md (ce document)

02_STACK.md (détails stack, coûts, déploiement)

03_GHOST_PLAYERS.md (spécifications complètes + UX)

04_DATA_MODEL.md (schémas conceptuels + règles d’intégrité)

05_USER_FLOWS.md (fils d’interface détaillés)

06_ACCEPTANCE_CRITERIA.md (crités de recette MVP)

07_METRICS_KPIs.md (mesure et instrumentation)

Conseils d’usage dans Cursor:

Dans les prompts, référence directe: @01_PRD.md, @03_GHOST_PLAYERS.md, etc.

Découper les demandes: “Implémente le flow de soumission @05_USER_FLOWS.md conforme aux règles @13 (section Règles Métier)”.

Maintenir ces docs à jour après chaque itération.

18) Acceptance Criteria (extraits MVP)
Création ligue:

Un gérant peut créer une ligue en <10 min, obtenir un QR code partageable, inviter des joueurs.

Soumission match:

Un joueur peut enregistrer un match en <30s avec 4 participants, avec auto-suggest joueurs + création ghost si inconnu.

Calcul leaderboard:

Ajout d’un match déclenche un recalcul complet; points/rangs/streaks/badges corrects; tri par points; visible en <5s.

Ghost Players:

Un joueur non inscrit apparaît en ghost (👻), gagne/perd des points; badges en locked; reçoit un SMS avec lien de claim; après claim, fusion non destructive et déblocage.

Dashboard club:

Affiche #matchs, #joueurs actifs, top joueurs, activité hebdo.

PWA:

Installable sur mobile; temps de chargement initial < 2s sur réseau 4G.

19) Risques & Mitigations
Adoption lente B2B → onboarding assisté, offre Free, cas pilote.

Soumission erronée → option de validation souple par admin; historique audit.

Scalabilité calcul → recompute full mais optimisé (index DB + pagination, fonctions serverless), possibilité d’incrémental en P2.

Vie privée → minimiser données, consentement communication, RGPD en P1.

20) Conclusion
Le concept est solide (problème réel côté clubs et joueurs), la feature Ghost Players réduit la friction et crée une boucle virale, et la stack proposée permet un MVP rapide, performant et peu coûteux. Lancer avec un club pilote, mesurer les KPIs, itérer sur l’engagement, puis déployer à l’échelle.

Annexe — Rappels de valeurs par défaut (MVP):

Points: +10 (win), +3 (défaite).

Rangs (points): Bronze (0–49), Silver (50–99), Gold (100–199), Platinum (200–299), Diamond (300–499), Master (700–999), Challenger (1000+).

Niveaux (victoires): Débutant (0–4), Confirmé (5–14), Expert (15–29), Élite (30+).

Badges (MVP): FirstWin, Win5, Win10, Streak3, Streak5, Veteran.

Identity joueur locale: 8 derniers chiffres du téléphone par organisation.

