# Système d'essai gratuit hybride - Documentation d'implémentation

## ✅ Ce qui a été implémenté

### 1. Migration SQL (`TRIAL_HYBRID_SYSTEM_MIGRATION.sql`)
- ✅ Ajout de tous les champs nécessaires à la table `clubs`
- ✅ Triggers automatiques pour mettre à jour les compteurs (joueurs, matchs, challenges)
- ✅ Fonctions RPC pour incrémenter les compteurs de connexions et d'invitations
- ✅ Index pour optimiser les recherches

### 2. Fonctions utilitaires (`lib/trial-hybrid.ts`)
- ✅ `initiateTrial()` - Initialise un essai de 14 jours
- ✅ `getTrialDaysRemaining()` - Calcule les jours restants
- ✅ `isTrialActive()` - Vérifie si l'essai est actif
- ✅ `expireTrial()` - Marque l'essai comme expiré
- ✅ `updateEngagementMetrics()` - Met à jour les métriques d'engagement
- ✅ `checkAutoExtensionEligibility()` - Vérifie l'éligibilité à l'extension automatique
- ✅ `grantAutoExtension()` - Accorde l'extension automatique (14→30 jours)
- ✅ `checkProposedExtensionEligibility()` - Vérifie l'éligibilité à l'extension proposée (jour 12)
- ✅ `acceptProposedExtension()` - Accepte l'extension proposée (+15 jours)
- ✅ `grantManualExtension()` - Accorde une extension manuelle par admin
- ✅ `getTrialEngagementScore()` - Calcule le score d'engagement (low/medium/high)
- ✅ `canAccessFeature()` - Vérifie l'accès aux fonctionnalités premium

### 3. Routes API
- ✅ `/api/trial/check-extensions` - Vérifie et applique les extensions automatiques et proposées (à appeler via cron)
- ✅ `/api/trial/accept-proposed` - Accepte l'extension proposée
- ✅ `/api/trial/manual-extension` - Accorde une extension manuelle (admin)

### 4. Intégration dans l'inscription
- ✅ Modification de `/app/api/clubs/register/route.ts` pour initialiser l'essai à 14 jours

### 5. Hooks pour mettre à jour les métriques
- ✅ `lib/hooks/use-trial-engagement.ts` - Fonctions pour mettre à jour les métriques après chaque action

## 🔨 Ce qui reste à faire

### 1. Dashboard admin pour les extensions manuelles
- [ ] Créer la page `/app/dashboard/admin/trials/page.tsx`
- [ ] Afficher la liste des clubs en essai avec métriques
- [ ] Formulaire pour prolonger manuellement un essai
- [ ] Score d'engagement visuel (pastille rouge/orange/verte)

### 2. Interface club - Affichage des métriques
- [ ] Ajouter une progress bar gamifiée dans le dashboard club
- [ ] Afficher "Débloquez +16 jours : X/10 joueurs, Y/20 matchs, Z/1 challenge"
- [ ] Badge "Essai gratuit" avec compte à rebours
- [ ] Notification in-app lors de l'extension automatique

### 3. Emails automatiques
- [ ] Jour 0 - Email de bienvenue avec checklist d'onboarding
- [ ] Jour 7 - Email mi-parcours avec statistiques
- [ ] Jour 10 - Email de suggestion d'abonnement
- [ ] Jour 12 - Email d'extension proposée (si éligible)
- [ ] Jour 13 - Email de dernière relance (si pas d'extension)
- [ ] Extension automatique - Email de félicitations
- [ ] Jour 27 (si extension) - Email "3 jours restants"
- [ ] Expiration - Email récapitulatif + invitation à s'abonner

### 4. Intégration des hooks dans les actions
- [ ] Appeler `updateTrialEngagementAfterAction()` après :
  - [ ] Création d'un profil joueur (dans `/app/api/profile/init/route.ts`)
  - [ ] Soumission d'un match (dans `/app/api/matches/submit/route.ts`)
  - [ ] Création d'un challenge (dans `/app/api/clubs/challenges/route.ts`)
- [ ] Appeler `incrementDashboardLoginCount()` dans le layout du dashboard
- [ ] Appeler `incrementInvitationsSentCount()` lors de l'envoi d'invitations

### 5. Cron job / Vérification automatique
- [ ] Configurer un cron job pour appeler `/api/trial/check-extensions` quotidiennement
- [ ] Ou utiliser Vercel Cron Jobs / Supabase Edge Functions

### 6. Mise à jour de la page facturation
- [ ] Utiliser `trial_current_end_date` au lieu de `trial_end_date`
- [ ] Afficher les métriques d'engagement
- [ ] Afficher le statut d'extension (auto/proposée/manuelle)

### 7. Tests
- [ ] Test : Nouveau club → essai 14 jours démarre
- [ ] Test : Club atteint 10 joueurs → extension auto à 30 jours
- [ ] Test : Club à 6 joueurs et 15 matchs au jour 12 → reçoit email proposant +15 jours
- [ ] Test : Club accepte extension proposée → trial prolongé à J+29
- [ ] Test : Admin prolonge manuellement un essai → trial prolongé avec raison logged
- [ ] Test : Club s'abonne au jour 8 → conversion immédiate, essai terminé
- [ ] Test : Essai expire → accès premium bloqué, données préservées

## 📋 Instructions de déploiement

### 1. Exécuter la migration SQL
```sql
-- Exécuter le fichier TRIAL_HYBRID_SYSTEM_MIGRATION.sql dans Supabase SQL Editor
```

### 2. Configurer le cron job (optionnel)
```bash
# Ajouter dans vercel.json ou configurer un cron job externe
{
  "crons": [{
    "path": "/api/trial/check-extensions",
    "schedule": "0 2 * * *" // Tous les jours à 2h du matin
  }]
}
```

### 3. Variables d'environnement
```env
# Optionnel : pour sécuriser l'endpoint de vérification
CRON_SECRET=your-secret-key-here
```

## 🔍 Points d'attention

1. **Compatibilité avec l'ancien système** : Le nouveau système utilise `trial_current_end_date` au lieu de `trial_end_date`. Il faut migrer les clubs existants.

2. **Performance** : Les triggers SQL mettent à jour automatiquement les compteurs, mais `updateEngagementMetrics()` peut être appelée manuellement pour recalculer si nécessaire.

3. **Emails** : Les emails ne sont pas encore implémentés. Il faut créer un système d'emails (Resend, SendGrid, etc.) et les templates.

4. **Dashboard admin** : L'interface admin pour les extensions manuelles n'est pas encore créée. Pour l'instant, on peut utiliser l'API directement.

5. **Sécurité** : L'endpoint `/api/trial/manual-extension` devrait vérifier que l'utilisateur est admin. À implémenter.

## 📝 Notes techniques

- Les métriques sont mises à jour automatiquement via des triggers SQL
- Les extensions automatiques sont vérifiées après chaque action importante
- Les extensions proposées sont vérifiées quotidiennement via le cron job
- Le système est rétrocompatible avec l'ancien système d'essai (30 jours)

