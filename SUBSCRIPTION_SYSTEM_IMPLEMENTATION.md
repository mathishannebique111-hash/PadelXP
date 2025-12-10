# Système d'abonnement - Implémentation complète

## ✅ Fichiers créés

### Types et Helpers
- ✅ `/lib/subscription.ts` - Types TypeScript et fonctions utilitaires

### Routes API
- ✅ `/app/api/subscription/create/route.ts` - Création d'une subscription pendant l'essai
- ✅ `/app/api/subscription/get/route.ts` - Récupération des données de subscription
- ✅ `/app/api/subscription/cancel/route.ts` - Annulation d'abonnement
- ✅ `/app/api/webhooks/stripe/route.ts` - Handler pour les webhooks Stripe

### Pages
- ✅ `/app/dashboard/subscription/page.tsx` - Page principale de gestion d'abonnement
- ✅ `/app/dashboard/subscription/checkout/page.tsx` - Page de checkout avec Stripe Elements

### Composants
- ✅ `/components/TrialStatusBanner.tsx` - Bannière de statut d'abonnement
- ✅ `/components/TrialStatusBannerWrapper.tsx` - Wrapper serveur pour TrialStatusBanner
- ✅ `/components/subscription/PlanSelection.tsx` - Sélection de plan
- ✅ `/components/subscription/ActiveSubscription.tsx` - Gestion d'abonnement actif

### Intégration
- ✅ `/app/dashboard/layout.tsx` - Intégration de TrialStatusBanner dans le layout

## 📋 À faire (Migration SQL)

### 1. Migration de la table `clubs`

Vous devez ajouter les champs suivants à la table `clubs` dans Supabase :

```sql
-- Ajouter les colonnes pour le système d'abonnement
ALTER TABLE clubs
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS selected_plan TEXT CHECK (selected_plan IN ('monthly', 'quarterly', 'annual')),
ADD COLUMN IF NOT EXISTS plan_selected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing' CHECK (subscription_status IN ('trialing', 'trialing_with_plan', 'active', 'past_due', 'canceled', 'trial_expired')),
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP WITH TIME ZONE;

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_clubs_stripe_customer_id ON clubs(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_clubs_stripe_subscription_id ON clubs(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_clubs_subscription_status ON clubs(subscription_status);
```

### 2. Initialisation des essais pour les clubs existants

Si vous avez des clubs existants sans `trial_start_date` et `trial_end_date`, vous pouvez les initialiser :

```sql
-- Initialiser les essais pour les clubs existants sans dates d'essai
UPDATE clubs
SET 
  trial_start_date = COALESCE(trial_start_date, created_at),
  trial_end_date = COALESCE(trial_end_date, created_at + INTERVAL '30 days'),
  subscription_status = COALESCE(subscription_status, 'trialing')
WHERE trial_start_date IS NULL OR trial_end_date IS NULL;
```

## 🔧 Configuration requise

### Variables d'environnement

Assurez-vous d'avoir ces variables dans votre `.env.local` :

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs
NEXT_PUBLIC_STRIPE_PRICE_MONTHLY=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_QUARTERLY=price_yyy
NEXT_PUBLIC_STRIPE_PRICE_ANNUAL=price_zzz
```

### Webhook Stripe

Configurez un webhook dans Stripe Dashboard pointant vers :
```
https://votre-domaine.com/api/webhooks/stripe
```

Événements à écouter :
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.trial_will_end`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## 🎯 Fonctionnalités implémentées

### 1. Sélection de plan pendant l'essai
- ✅ Affichage des 3 plans (Mensuel, Trimestriel, Annuel)
- ✅ Badge "PLUS POPULAIRE" pour l'annuel
- ✅ Badge "2 MOIS OFFERTS" pour l'annuel
- ✅ Calcul automatique des économies
- ✅ Message d'encouragement si en essai

### 2. Checkout avec Stripe Elements
- ✅ Intégration Stripe Elements pour la méthode de paiement
- ✅ Affichage des jours d'essai restants
- ✅ Date du premier paiement clairement indiquée
- ✅ Message rassurant : "Votre carte ne sera débitée qu'à la fin de votre essai gratuit"
- ✅ Confirmation du paiement sans redirection si possible

### 3. Bannière de statut
- ✅ Affichage selon le statut (trialing, trialing_with_plan, active, past_due, trial_expired)
- ✅ Compteur de jours restants en temps réel
- ✅ Date du premier paiement pour les plans sélectionnés
- ✅ Actions contextuelles (Choisir un plan, Gérer, etc.)

### 4. Gestion d'abonnement actif
- ✅ Affichage du plan actuel
- ✅ Date de prochain renouvellement
- ✅ Bouton "Gérer mon abonnement" (portail Stripe)
- ✅ Annulation avec confirmation modale

### 5. Webhooks Stripe
- ✅ Gestion de tous les événements critiques
- ✅ Mise à jour automatique des statuts
- ✅ Gestion des échecs de paiement
- ✅ Activation automatique après le premier paiement

## 🔄 Flux utilisateur

### Pendant l'essai (30 jours)
1. Club s'inscrit → `trial_start_date` et `trial_end_date` initialisés
2. Club choisit un plan → Subscription Stripe créée avec `trial_end`
3. Club ajoute sa carte → Paiement confirmé mais non débité
4. Statut : `trialing_with_plan`
5. Premier paiement : Le lendemain de la fin de l'essai

### Après l'essai
1. Webhook `invoice.payment_succeeded` → Statut passe à `active`
2. Abonnement se renouvelle automatiquement selon le cycle
3. Club peut gérer via le portail Stripe
4. Club peut annuler (accès jusqu'à la fin de la période payée)

## 🐛 Points d'attention

1. **Migration SQL** : N'oubliez pas d'exécuter la migration SQL avant de déployer
2. **Webhook Secret** : Configurez le webhook secret dans Stripe et dans les variables d'environnement
3. **Price IDs** : Vérifiez que les Price IDs Stripe sont corrects dans les variables d'environnement
4. **Customer Portal** : La route `/api/stripe/customer-portal` doit exister (elle existe déjà dans votre codebase)
5. **TrialStatusBannerWrapper** : Utilise un client Supabase admin, assurez-vous que les permissions sont correctes

## 📝 Notes importantes

- Le système utilise `trial_end` dans Stripe pour garantir que le premier paiement se fait après la fin de l'essai
- Les statuts sont synchronisés entre Stripe et Supabase via les webhooks
- Le composant `TrialStatusBanner` se met à jour automatiquement toutes les heures
- Tous les messages d'erreur sont en français pour l'utilisateur final

## 🚀 Prochaines étapes

1. Exécuter la migration SQL dans Supabase
2. Configurer les webhooks Stripe
3. Tester le flux complet :
   - Création d'un club
   - Sélection d'un plan pendant l'essai
   - Ajout de la méthode de paiement
   - Vérification du premier paiement après l'essai
4. Tester les webhooks avec Stripe CLI en local si nécessaire
