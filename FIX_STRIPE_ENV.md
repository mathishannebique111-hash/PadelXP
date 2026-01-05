# 🔧 Guide de correction - Configuration Stripe

## Problème identifié

Les variables d'environnement Stripe ne sont pas détectées par l'application, même si vous les avez ajoutées dans `.env.local`.

## ✅ Solution étape par étape

### 1. Vérifiez l'emplacement du fichier `.env.local`

Le fichier `.env.local` doit être **à la racine du projet** (même niveau que `package.json`).

```
PadelXP/
├── .env.local          ← ICI
├── package.json
├── app/
├── components/
└── ...
```

### 2. Format correct des variables

Dans `.env.local`, les variables doivent être formatées **sans espaces** autour du `=` :

```env
# ✅ CORRECT
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_PRICE_MONTHLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_QUARTERLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_ANNUAL=price_xxxxxxxxxxxxx

# ❌ INCORRECT (avec espaces)
STRIPE_PRICE_MONTHLY = price_xxxxxxxxxxxxx
STRIPE_PRICE_MONTHLY="price_xxxxxxxxxxxxx"
STRIPE_PRICE_MONTHLY = "price_xxxxxxxxxxxxx"
```

### 3. Exemple complet de `.env.local`

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx

# Stripe (Mode Test)
STRIPE_SECRET_KEY=sk_test_51xxxxxxxxxxxxx
STRIPE_PRICE_MONTHLY=price_1xxxxxxxxxxxxx
STRIPE_PRICE_QUARTERLY=price_1xxxxxxxxxxxxx
STRIPE_PRICE_ANNUAL=price_1xxxxxxxxxxxxx

# Autres variables...
```

### 4. Vérifiez que les Price IDs sont corrects

1. Allez sur [https://dashboard.stripe.com/test/products](https://dashboard.stripe.com/test/products)
2. **Assurez-vous d'être en mode TEST** (bascule en haut à droite)
3. Pour chaque produit (monthly, quarterly, annual) :
   - Cliquez sur le produit
   - Dans la section "Pricing", vous verrez le Price ID
   - Il doit commencer par `price_` (ex: `price_1OaBcDeFgHiJkLmN`)
   - **Copiez exactement** ce Price ID

### 5. Redémarrez le serveur

**IMPORTANT** : Après avoir modifié `.env.local`, vous **DEVEZ** redémarrer le serveur :

```bash
# 1. Arrêtez le serveur (Ctrl+C dans le terminal où il tourne)
# 2. Redémarrez-le
npm run dev
```

Next.js charge les variables d'environnement **uniquement au démarrage**. Les modifications dans `.env.local` ne sont pas prises en compte sans redémarrage.

### 6. Vérifiez la configuration

Exécutez le script de vérification :

```bash
node check-stripe-config.js
```

Vous devriez voir :
```
✅ STRIPE_SECRET_KEY: Configuré (mode test)
✅ STRIPE_PRICE_MONTHLY: Configuré
✅ STRIPE_PRICE_QUARTERLY: Configuré
✅ STRIPE_PRICE_ANNUAL: Configuré
```

### 7. Vérifiez les logs du serveur

Quand vous essayez d'ajouter un abonnement, regardez les logs du serveur. Vous devriez voir :

```
Subscription API - Action: add_1_month Club ID: xxx
Stripe Price IDs configured: { monthly: true, quarterly: true, annual: true }
```

Si vous voyez `monthly: false`, les variables ne sont toujours pas chargées.

## 🐛 Dépannage

### Les variables ne sont toujours pas détectées

1. **Vérifiez qu'il n'y a pas de guillemets** autour des valeurs
2. **Vérifiez qu'il n'y a pas d'espaces** avant/après le `=`
3. **Vérifiez que le fichier s'appelle exactement** `.env.local` (pas `.env`, pas `.env.local.txt`)
4. **Vérifiez que le fichier est à la racine** du projet
5. **Redémarrez complètement** le serveur (arrêtez et relancez)

### Erreur "Price ID not configured"

Cela signifie que les variables sont chargées mais vides. Vérifiez :
- Les Price IDs sont corrects dans `.env.local`
- Les Price IDs existent dans Stripe Dashboard (mode test)
- Le serveur a été redémarré après modification

### Erreur "No such price" de Stripe

- Vérifiez que vous utilisez les Price IDs de **test** (pas ceux de production)
- Vérifiez que votre `STRIPE_SECRET_KEY` est aussi en mode test (commence par `sk_test_`)

## 📝 Checklist finale

- [ ] Fichier `.env.local` à la racine du projet
- [ ] Variables formatées sans espaces : `VARIABLE=valeur`
- [ ] `STRIPE_SECRET_KEY` commence par `sk_test_`
- [ ] Les 3 Price IDs commencent par `price_`
- [ ] Serveur redémarré après modification
- [ ] Script de vérification (`node check-stripe-config.js`) passe
- [ ] Logs du serveur montrent que les Price IDs sont configurés

Une fois tout cela fait, les boutons d'abonnement devraient fonctionner ! 🎉

