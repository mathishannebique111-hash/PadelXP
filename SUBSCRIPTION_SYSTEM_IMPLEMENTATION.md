# 🎯 Système d'Abonnement et d'Essai - Implémentation Complète

## 📋 Vue d'ensemble

Implémentation complète d'un système de gestion d'abonnements pour clubs avec essai gratuit de 30 jours, gestion des états, transitions automatiques, et notifications.

## 🗄️ Structure de Base de Données

### Migration SQL
Fichier: `supabase/migrations/create_subscriptions_table.sql`

**Tables créées :**
- `subscriptions` : Gestion des abonnements avec tous les états et métadonnées
- `subscription_notifications` : Tracking des notifications envoyées
- `subscription_events` : Audit de tous les événements d'abonnement

**États d'abonnement supportés :**
- `trialing` : Essai gratuit actif
- `scheduled_activation` : Activation programmée à la fin de l'essai
- `active` : Abonnement actif
- `paused` : Abonnement en pause
- `canceled` : Abonnement annulé
- `past_due` : Paiement en retard

**Fonctions SQL créées :**
- `initialize_club_subscription(p_club_id UUID)` : Initialise un abonnement en essai
- `transition_subscription_status(...)` : Gère les transitions d'état avec validation

## 🛠️ Fonctions Utilitaires

Fichier: `lib/utils/subscription-utils.ts`

**Fonctions principales :**
- `getClubSubscription(clubId)` : Récupère l'abonnement d'un club
- `initializeSubscription(clubId)` : Initialise un nouvel abonnement
- `activateSubscription(...)` : Active immédiatement l'abonnement
- `scheduleActivation(...)` : Programme l'activation à la fin de l'essai
- `pauseSubscription(...)` : Met en pause l'abonnement
- `cancelSubscription(...)` : Annule l'abonnement (immédiat ou à la fin de période)
- `resumeSubscription(...)` : Reprend un abonnement en pause
- `handleTrialEnd(...)` : Gère automatiquement la fin d'essai
- `canAccessFeature(...)` : Vérifie les règles d'accès selon l'état

## 🔌 API Routes

### GET `/api/subscriptions/current`
Récupère l'abonnement actuel d'un club ou en initialise un s'il n'existe pas.

### POST `/api/subscriptions/activate`
Active l'abonnement immédiatement ou programme l'activation à la fin de l'essai.

**Body:**
```json
{
  "planCycle": "monthly" | "quarterly" | "annual",
  "activateNow": boolean
}
```

### POST `/api/subscriptions/pause`
Met en pause l'abonnement (seulement si status = "active").

### POST `/api/subscriptions/resume`
Reprend l'abonnement depuis paused (nécessite un moyen de paiement).

### POST `/api/subscriptions/cancel`
Annule l'abonnement immédiatement ou à la fin de la période.

**Body:**
```json
{
  "cancelAtPeriodEnd": boolean
}
```

### POST `/api/subscriptions/consent`
Met à jour le consentement d'activation automatique à la fin de l'essai.

**Body:**
```json
{
  "consent": boolean
}
```

### GET `/api/subscriptions/cron?secret=YOUR_SECRET`
Cron job pour gérer les transitions automatiques :
- Fin d'essai
- Rappels d'essai (J-10, J-3, J-1)
- Renouvellements
- Période de grâce (paused -> canceled après 7 jours)

## 🔄 Comportements et Transitions

### Fin d'essai sans carte
- Si `has_payment_method = false` → Basculer en `paused` (politique actuelle)
- Alternative : Basculer en `canceled` (configurable)
- Aucune facturation déclenchée

### Fin d'essai avec carte + consentement
- Si `has_payment_method = true` ET `auto_activate_at_trial_end = true` → Activer automatiquement
- Si succès → `status = active`, `next_renewal_at` calculé selon le cycle
- Si échec → `status = past_due`, relances nécessaires

### Pause vs Annulation
- **Pause** : Accès en lecture seule, soumission de matchs désactivée, page publique accessible
- **Annulation** : Aucun accès opérationnel, données conservées
- **Période de grâce** : 7 jours en `paused` avant passage en `canceled`

### Past Due
- En cas d'échec de paiement → `status = past_due`
- Relances nécessaires
- Si non résolu avant fin de période de grâce → Basculer en `paused`

## 📧 Système de Notifications

**Rappels d'essai :**
- J-10 : Notification avec date de fin et action requise
- J-3 : Rappel avec CTA pour ajouter carte/activer
- J-1 : Dernier rappel avant fin d'essai

**Notifications à implémenter :**
- `trial_ended` : Essai terminé
- `payment_failed` : Échec de paiement
- `subscription_activated` : Abonnement activé
- `subscription_canceled` : Abonnement annulé
- `subscription_paused` : Abonnement mis en pause
- `subscription_resumed` : Abonnement repris

**TODO:** Implémenter les fonctions d'envoi d'emails (Resend ou autre service).

## 🔐 Règles d'Accès

### En `paused` :
- ✅ Back-office en lecture seule
- ❌ Soumission de matchs désactivée
- ✅ Page publique accessible
- ✅ Réactivation instantanée via "Activer maintenant" si carte présente

### En `canceled` :
- ❌ Aucun accès opérationnel
- ✅ Données conservées
- ℹ️ Reprise = recréer un abonnement

### En `active` ou `trialing` :
- ✅ Accès complet à toutes les fonctionnalités

## 📝 Configuration du Cron Job

Pour activer le cron job automatique, configurez un cron externe (Vercel Cron, GitHub Actions, etc.) :

**Vercel Cron (vercel.json) :**
```json
{
  "crons": [
    {
      "path": "/api/subscriptions/cron?secret=YOUR_SECRET",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Variable d'environnement requise :**
```
SUBSCRIPTION_CRON_SECRET=your-secret-key
```

## 🔗 Intégration avec la Page de Facturation

**Composant Client :** `components/billing/BillingActions.tsx`

Ce composant gère les actions d'abonnement (activer, pauser, annuler) avec des appels API.

**À faire :**
1. Intégrer `BillingActions` dans `app/dashboard/facturation/page.tsx`
2. Remplacer les données mockées par les vraies données depuis `/api/subscriptions/current`
3. Afficher les états réels de l'abonnement

## 📊 Exemple d'Utilisation

### Initialiser un abonnement pour un nouveau club
```typescript
import { initializeSubscription } from "@/lib/utils/subscription-utils";

const subscription = await initializeSubscription(clubId);
```

### Récupérer l'abonnement actuel
```typescript
import { getClubSubscription } from "@/lib/utils/subscription-utils";

const subscription = await getClubSubscription(clubId);
```

### Activer un abonnement
```typescript
import { activateSubscription } from "@/lib/utils/subscription-utils";

const success = await activateSubscription(subscriptionId, "monthly", userId);
```

### Vérifier les règles d'accès
```typescript
import { canAccessFeature } from "@/lib/utils/subscription-utils";

const canSubmitMatches = canAccessFeature(subscription, "matches");
const canAccessDashboard = canAccessFeature(subscription, "dashboard");
```

## ✅ Prochaines Étapes

1. **Notifications** : Implémenter l'envoi d'emails (Resend)
2. **Intégration Stripe** : Ajouter la gestion des paiements réels
3. **Webhooks Stripe** : Gérer les événements de paiement (success, failure)
4. **Intégration UI** : Connecter la page de facturation aux API routes
5. **Tests** : Ajouter des tests unitaires et d'intégration
6. **Documentation** : Ajouter de la documentation utilisateur

## 🔒 Sécurité

- Toutes les API routes vérifient l'authentification
- Les transitions d'état sont validées côté serveur
- RLS activé sur toutes les tables
- Service Role utilisé uniquement pour les opérations système
- Secret requis pour le cron job

## 📌 Notes Importantes

- **Opt-in par défaut** : L'activation automatique nécessite un consentement explicite
- **Pas de facturation sans carte** : Aucune facturation ne peut être déclenchée sans moyen de paiement
- **Données conservées** : Les données sont conservées même après annulation
- **Période de grâce** : 7 jours en `paused` avant passage en `canceled` pour maximiser les réactivations

