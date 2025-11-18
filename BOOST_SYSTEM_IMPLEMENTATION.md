# ⚡ Système de Boost de Points - Implémentation Complète

## ✅ Résumé de l'implémentation

Le système de boost de points a été entièrement implémenté avec les fonctionnalités suivantes :

1. ✅ **Tables de base de données** : `player_boost_credits` et `player_boost_uses`
2. ✅ **Intégration Stripe** : Achat de boosts via checkout session
3. ✅ **Webhook Stripe** : Créditation automatique après paiement
4. ✅ **Logique de boost** : Application lors de l'enregistrement de matchs (+30% si victoire)
5. ✅ **Calcul de points** : Intégration des boosts dans tous les classements
6. ✅ **Interface utilisateur** : Page boost dédiée et option dans le formulaire de match
7. ✅ **Sécurité** : Vérifications côté serveur (limite de 10 boosts/mois, vérification des crédits)

---

## 📋 Migration SQL à exécuter

**Exécutez cette migration dans Supabase SQL Editor :**

```sql
-- Migration : Création des tables pour le système de boost de points des joueurs
-- Date : 2025-01-XX

-- 1. Table pour stocker les crédits de boost achetés mais pas encore utilisés
CREATE TABLE IF NOT EXISTS public.player_boost_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed_at TIMESTAMPTZ NULL, -- NULL = boost disponible, NOT NULL = boost consommé
  stripe_payment_intent_id TEXT NULL, -- Pour tracer l'origine du paiement
  created_by_session_id TEXT NULL, -- Session Stripe Checkout ID
  CONSTRAINT check_not_consumed_on_creation CHECK (consumed_at IS NULL)
);

-- Index pour chercher rapidement les boosts disponibles pour un joueur
CREATE INDEX IF NOT EXISTS idx_player_boost_credits_user_available 
  ON public.player_boost_credits(user_id, consumed_at) 
  WHERE consumed_at IS NULL;

-- Index pour chercher les boosts par session Stripe
CREATE INDEX IF NOT EXISTS idx_player_boost_credits_session 
  ON public.player_boost_credits(created_by_session_id) 
  WHERE created_by_session_id IS NOT NULL;

-- 2. Table pour enregistrer l'utilisation d'un boost sur un match
CREATE TABLE IF NOT EXISTS public.player_boost_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  boost_credit_id UUID NOT NULL REFERENCES public.player_boost_credits(id) ON DELETE RESTRICT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  percentage NUMERIC(5, 4) NOT NULL DEFAULT 0.3, -- 0.3 = +30%, stocké comme 0.3
  points_before_boost INTEGER NOT NULL, -- Points gagnés avant le boost
  points_after_boost INTEGER NOT NULL, -- Points gagnés après le boost (+30%)
  CONSTRAINT check_percentage_range CHECK (percentage >= 0 AND percentage <= 1),
  CONSTRAINT check_points_increased CHECK (points_after_boost >= points_before_boost)
);

-- Index pour vérifier rapidement les boosts utilisés par un joueur dans le mois courant
CREATE INDEX IF NOT EXISTS idx_player_boost_uses_user_month 
  ON public.player_boost_uses(user_id, applied_at);

-- Index pour chercher les boosts utilisés sur un match (si besoin de debug/audit)
CREATE INDEX IF NOT EXISTS idx_player_boost_uses_match 
  ON public.player_boost_uses(match_id);

-- Index pour vérifier qu'un boost_credit n'est utilisé qu'une seule fois
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_boost_uses_credit_unique 
  ON public.player_boost_uses(boost_credit_id);

-- 3. RLS Policies pour player_boost_credits
ALTER TABLE public.player_boost_credits ENABLE ROW LEVEL SECURITY;

-- Les joueurs peuvent voir leurs propres crédits
CREATE POLICY "Users can view their own boost credits"
  ON public.player_boost_credits
  FOR SELECT
  USING (auth.uid() = user_id);

-- Les admins peuvent voir tous les crédits (via service_role)
-- Pas de politique INSERT pour les utilisateurs normaux (géré via API avec service_role)

-- 4. RLS Policies pour player_boost_uses
ALTER TABLE public.player_boost_uses ENABLE ROW LEVEL SECURITY;

-- Les joueurs peuvent voir leurs propres utilisations de boost
CREATE POLICY "Users can view their own boost uses"
  ON public.player_boost_uses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Les admins peuvent voir toutes les utilisations (via service_role)
-- Pas de politique INSERT pour les utilisateurs normaux (géré via API avec service_role)

-- 5. Fonction SQL pour compter les boosts utilisés dans le mois courant
CREATE OR REPLACE FUNCTION public.count_player_boosts_used_this_month(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.player_boost_uses
  WHERE user_id = p_user_id
    AND DATE_TRUNC('month', applied_at) = DATE_TRUNC('month', NOW());
$$ LANGUAGE SQL STABLE;

-- 6. Fonction SQL pour compter les boosts disponibles (non consommés)
CREATE OR REPLACE FUNCTION public.count_player_boost_credits_available(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.player_boost_credits
  WHERE user_id = p_user_id
    AND consumed_at IS NULL;
$$ LANGUAGE SQL STABLE;

-- 7. Commentaires pour documentation
COMMENT ON TABLE public.player_boost_credits IS 'Stocke les boosts de points achetés par les joueurs. Un boost est disponible si consumed_at IS NULL.';
COMMENT ON TABLE public.player_boost_uses IS 'Enregistre chaque utilisation d''un boost sur un match. Limite de 10 utilisations par joueur et par mois.';
COMMENT ON COLUMN public.player_boost_uses.percentage IS 'Pourcentage d''augmentation des points (ex: 0.3 pour +30%)';
COMMENT ON COLUMN public.player_boost_uses.points_before_boost IS 'Points gagnés normalement (ex: 10 pour une victoire)';
COMMENT ON COLUMN public.player_boost_uses.points_after_boost IS 'Points gagnés après application du boost (ex: 13 pour 10 * 1.3)';
```

---

## 🔧 Configuration requise

### Variables d'environnement

Ajoutez dans votre `.env.local` :

```bash
# Price ID Stripe pour l'achat d'un boost de joueur
# À créer dans Stripe Dashboard > Products > Create product
# Exemple : price_xxxxxxxxxxxxx (0.99€ ou 1.49€ par exemple)
STRIPE_PRICE_PLAYER_BOOST=price_xxxxxxxxxxxxx
```

### Créer le produit Stripe

1. Allez sur [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Créez un nouveau produit "Boost de Points Joueur"
3. Ajoutez un prix unique (pas récurrent) : 0.99€ ou 1.49€ par exemple
4. Copiez le **Price ID** (commence par `price_`)
5. Ajoutez-le dans `.env.local` comme `STRIPE_PRICE_PLAYER_BOOST`

---

## 🧪 Guide de test

### Test 1 : Achat de boosts via Stripe

1. **Connectez-vous en tant que joueur**
2. **Allez sur `/boost`**
3. **Cliquez sur "1 boost"** (ou 5, 10)
4. **Complétez le paiement Stripe** (utilisez une carte de test : `4242 4242 4242 4242`)
5. **Vérifiez** :
   - Redirection vers `/boost/success`
   - Le nombre de boosts disponibles a augmenté sur la page `/boost`
   - Dans Supabase : une ou plusieurs lignes dans `player_boost_credits` avec `consumed_at IS NULL`

### Test 2 : Enregistrement d'un match avec boost (victoire)

1. **Assurez-vous d'avoir au moins 1 boost disponible**
2. **Allez sur `/match/new`**
3. **Remplissez le formulaire de match**
4. **Cochez la case "Appliquer un boost (+30% de points si tu gagnes)"**
5. **Enregistrez le match en tant que gagnant** (équipe 1 ou 2)
6. **Vérifiez** :
   - Message de succès avec "Boost appliqué : 10 → 13 points (+30%) !"
   - Dans Supabase :
     - Une ligne dans `player_boost_uses` avec `points_before_boost = 10` et `points_after_boost = 13`
     - La ligne correspondante dans `player_boost_credits` a maintenant `consumed_at` rempli
   - Sur la page profil (`/home`), vos points ont augmenté de 13 au lieu de 10 pour cette victoire

### Test 3 : Enregistrement d'un match avec boost (défaite)

1. **Assurez-vous d'avoir au moins 1 boost disponible**
2. **Enregistrez un match en tant que perdant** avec la case boost cochée
3. **Vérifiez** :
   - Le boost n'est **PAS** consommé (le crédit reste disponible)
   - Vous recevez 3 points normalement (pas de bonus)
   - Aucune ligne dans `player_boost_uses` pour ce match

### Test 4 : Limite mensuelle de 10 boosts

1. **Créez manuellement 11 utilisations de boost pour un joueur dans le mois courant** :
   ```sql
   -- Remplacer USER_ID par un UUID de joueur valide
   INSERT INTO public.player_boost_uses (user_id, match_id, boost_credit_id, percentage, points_before_boost, points_after_boost)
   SELECT 
     'USER_ID'::UUID,
     (SELECT id FROM public.matches LIMIT 1),
     (SELECT id FROM public.player_boost_credits WHERE user_id = 'USER_ID'::UUID LIMIT 1),
     0.3,
     10,
     13;
   -- Répéter 11 fois
   ```
2. **Essayez d'enregistrer un match avec boost**
3. **Vérifiez** :
   - La case boost est désactivée (grisée)
   - Message : "Tu as déjà utilisé 10 boosts ce mois-ci (limite de 10)."

### Test 5 : Vérification du calcul de points dans les classements

1. **Créez un joueur de test avec plusieurs matchs**
2. **Appliquez un boost sur une victoire**
3. **Vérifiez les points dans** :
   - `/home` : Page profil du joueur
   - `/api/leaderboard` : API leaderboard
   - `/api/leaderboard/top3` : API top 3
4. **Comparez avec** :
   - Points sans boost : `wins * 10 + losses * 3 + bonus`
   - Points avec boost : `(wins - 1) * 10 + 1 * 13 + losses * 3 + bonus` (si 1 boost sur une victoire)

---

## 📁 Fichiers créés/modifiés

### Nouveaux fichiers

- `lib/supabase/migrations/create_player_boost_tables.sql` - Migration SQL
- `lib/utils/boost-utils.ts` - Utilitaires pour la gestion des boosts
- `lib/utils/boost-points-utils.ts` - Utilitaires pour le calcul de points avec boosts
- `app/api/stripe/checkout-boost/route.ts` - API route pour créer une session Stripe
- `app/api/player/boost/stats/route.ts` - API route pour récupérer les stats de boost
- `app/(protected)/boost/page.tsx` - Page principale des boosts
- `app/(protected)/boost/success/page.tsx` - Page de succès après achat
- `components/BoostPurchaseButton.tsx` - Composant pour acheter des boosts

### Fichiers modifiés

- `app/api/stripe/webhook/route.ts` - Gestion du crédit des boosts après paiement
- `app/api/matches/submit/route.ts` - Intégration de la logique de boost lors de l'enregistrement
- `components/MatchForm.tsx` - Ajout de l'option boost dans le formulaire
- `components/NavigationBar.tsx` - Ajout du lien vers la page boost
- `app/(protected)/home/page.tsx` - Calcul de points avec boosts
- `components/PlayerSummary.tsx` - Calcul de points avec boosts
- `app/api/leaderboard/top3/route.ts` - Calcul de points avec boosts
- `app/api/leaderboard/route.ts` - Calcul de points avec boosts
- `components/Top3Notification.tsx` - Utilise l'API leaderboard qui calcule déjà avec boosts

---

## 🔒 Sécurité

- ✅ Toute la logique critique est **côté serveur**
- ✅ Vérification des boosts disponibles avant consommation
- ✅ Vérification de la limite mensuelle (10 boosts/mois)
- ✅ Le boost n'est consommé que si le joueur **gagne** le match
- ✅ RLS (Row Level Security) activé sur les tables de boosts
- ✅ Webhook Stripe avec vérification de signature

---

## 📊 Logique de calcul

### Points sans boost
- Victoire : +10 points
- Défaite : +3 points
- Bonus avis : +10 points (une seule fois)
- Points challenges : selon les challenges

### Points avec boost (victoire uniquement)
- Victoire normale : +10 points
- Victoire avec boost : +13 points (+30%)
- Défaite : +3 points (pas de boost appliqué)

### Exemple
- Joueur avec 5 victoires (dont 2 avec boost) et 3 défaites :
  - Points = `3 * 10 + 2 * 13 + 3 * 3 = 30 + 26 + 9 = 65 points`
  - Au lieu de `5 * 10 + 3 * 3 = 59 points` sans boost
  - Gain = +6 points grâce aux 2 boosts

---

## 🎯 Prochaines étapes (optionnelles)

1. **Créer des packs de boosts** (5 boosts, 10 boosts) avec réduction
2. **Ajouter un historique des boosts utilisés** sur la page boost
3. **Notifications push** quand un boost est appliqué
4. **Statistiques** : nombre de boosts utilisés, points gagnés grâce aux boosts
5. **Promotions** : offres spéciales limitées dans le temps

---

## ⚠️ Notes importantes

- Les boosts sont **achetés une fois** et peuvent être **utilisés à tout moment** (pas d'expiration)
- Limite de **10 boosts utilisés par mois** pour éviter le pay-to-win
- Les boosts ne sont consommés **que si le joueur gagne** le match
- Le calcul de points avec boosts est intégré dans **tous les classements** (profil, leaderboard, top 3)


