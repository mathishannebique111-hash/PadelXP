# PadelXP — Résumé du SaaS

## Vue d'ensemble

**PadelXP** est une plateforme SaaS B2B/B2C qui transforme les complexes de padel en communautés compétitives grâce à un système de classement en temps réel, de gamification et de gestion automatisée des ligues.

### Problème résolu

- **Pour les clubs** : Gestion manuelle chronophage, faible fidélisation des joueurs, manque de données sur l'engagement, animations difficiles à organiser
- **Pour les joueurs** : Manque de motivation, pas de visibilité sur la progression, difficulté à suivre les classements

### Solution proposée

Une plateforme complète qui permet aux clubs de :
- Créer des ligues en 5 minutes
- Automatiser les calculs de classement en temps réel
- Gamifier l'expérience avec des rangs, badges et challenges
- Suivre l'activité via un dashboard dédié

---

## Fonctionnalités principales

### Pour les clubs

1. **Gestion de ligues**
   - Création de ligues en quelques clics
   - Classement automatique et temps réel
   - Formats de tournois variés (TMC, élimination, poules, etc.)

2. **Gamification**
   - Système de rangs (Bronze → Challenger)
   - Badges automatiques (première victoire, séries, etc.)
   - Challenges mensuels configurables

3. **Dashboard administrateur**
   - Statistiques d'activité (matchs, joueurs actifs)
   - Export de données (PDF, CSV)
   - Gestion des membres et invitations

4. **Page club publique**
   - Page personnalisable avec logo et couleurs
   - Classement public en temps réel
   - Profils joueurs avec statistiques

5. **Système de "Ghost Players"**
   - Création automatique de comptes pour joueurs non inscrits
   - Conversion progressive via SMS d'invitation
   - Fusion automatique des données lors de l'inscription

### Pour les joueurs

1. **Classement et progression**
   - Leaderboard en temps réel
   - Système de points et rangs
   - Historique des matchs

2. **Gamification**
   - Badges à débloquer
   - Challenges hebdomadaires
   - Statistiques détaillées (victoires, défaites, % de réussite)

3. **Gestion des matchs**
   - Soumission de résultats en < 30 secondes
   - Confirmation par les adversaires
   - Feed social du club

4. **Profil personnalisé**
   - Statistiques complètes
   - Historique des confrontations
   - Badges obtenus

---

## Système d'abonnement des clubs

### Essai gratuit

- **Durée** : 30 jours
- **Conditions** : Sans carte bancaire requise
- **Accès** : Toutes les fonctionnalités pendant la période d'essai

### Plans d'abonnement

#### Plan Mensuel
- **Prix** : 99€/mois
- **Facturation** : Mensuelle
- **Renouvellement** : Automatique chaque mois

#### Plan Trimestriel
- **Prix** : 89€/mois (soit 267€ tous les 3 mois)
- **Économie** : 10% par rapport au plan mensuel
- **Facturation** : Tous les 3 mois
- **Renouvellement** : Automatique tous les 3 mois

#### Plan Annuel
- **Prix** : 82€/mois (soit 986€ par an)
- **Économie** : 17% par rapport au plan mensuel (équivalent à 2 mois gratuits)
- **Facturation** : Annuelle
- **Renouvellement** : Automatique chaque année

### Fonctionnement de l'abonnement

#### Pendant la période d'essai

1. **Choix d'un plan** :
   - Le club peut choisir un plan à tout moment pendant les 30 jours d'essai
   - Le premier paiement est programmé pour le **lendemain de la fin de l'essai**
   - L'abonnement démarre automatiquement après la fin de l'essai gratuit

2. **Affichage** :
   - Le plan choisi est mis en évidence avec le badge "Plan actuel"
   - Le compteur d'essai continue d'afficher les jours restants (sans additionner les jours d'abonnement)
   - Les informations de facturation future sont visibles

#### Après la période d'essai

1. **Si un plan a été choisi** :
   - L'abonnement démarre automatiquement le lendemain de la fin de l'essai
   - Le premier paiement est effectué à cette date
   - Les cycles suivants se renouvellent automatiquement selon le plan choisi

2. **Si aucun plan n'a été choisi** :
   - Un message invite le club à choisir un abonnement
   - L'accès aux fonctionnalités peut être limité

### Gestion de l'abonnement

#### Renouvellement automatique
- Tous les plans se renouvellent automatiquement
- Le paiement est effectué automatiquement à chaque échéance
- Notification avant chaque renouvellement

#### Annulation
- Le club peut annuler son abonnement à tout moment
- L'accès reste actif jusqu'à la fin de la période payée
- Aucun remboursement du cycle en cours
- Possibilité de réactiver l'abonnement avant la fin de la période

#### Modification de plan
- Le club peut changer de plan à tout moment
- Le nouveau plan prend effet au prochain cycle de facturation
- Ajustement pro-rata si nécessaire

### Informations affichées

La page "Abonnement & essai" affiche :

1. **Statut de l'essai** :
   - Jours restants de l'essai gratuit
   - Date de fin de l'essai

2. **Statut de l'abonnement** :
   - Plan actuel (si choisi)
   - Date de prochain renouvellement
   - Date de fin (si annulé)

3. **Informations de facturation** :
   - Méthode de paiement enregistrée
   - Historique des paiements (via portail Stripe)
   - Factures disponibles

4. **Actions disponibles** :
   - Choisir/modifier un plan
   - Annuler/réactiver l'abonnement
   - Accéder au portail client Stripe
   - Mettre à jour les informations de facturation

### Intégration Stripe

- **Paiements sécurisés** : Gestion via Stripe (cartes bancaires)
- **Webhooks** : Synchronisation automatique des statuts d'abonnement
- **Portail client** : Accès direct au portail Stripe pour gérer les factures et la méthode de paiement
- **Synchronisation** : Mise à jour automatique des statuts (actif, annulé, en attente de paiement)

---

## Stack technique

- **Frontend** : Next.js 15 (App Router), TypeScript, TailwindCSS
- **Backend** : Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Paiements** : Stripe
- **Hébergement** : Vercel
- **PWA** : Application installable sur mobile

---

## Objectifs business

- **Engagement** : Augmenter la rétention des joueurs de 40%
- **Efficacité** : Éliminer 100% des calculs manuels pour les clubs
- **Revenus** : Augmenter les revenus des clubs de 25% (meilleure occupation des créneaux)
- **Expérience** : Soumission d'un match en < 30 secondes, classement à jour en < 5 secondes

---

## Différenciation

1. **Ghost Players** : Système unique permettant d'inclure les joueurs non inscrits sans friction
2. **Gamification avancée** : Rangs, badges et challenges automatiques
3. **Temps réel** : Classements et statistiques mis à jour instantanément
4. **Simplicité** : Setup d'une ligue en 5 minutes, soumission de match en 30 secondes
5. **Mobile-first** : PWA installable, interface optimisée pour mobile

