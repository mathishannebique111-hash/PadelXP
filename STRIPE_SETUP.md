# Configuration Stripe - Mode Test

## 📋 Étapes pour configurer les Price IDs Stripe en mode test

### 1. Accéder au Dashboard Stripe (Mode Test)

1. Allez sur [https://dashboard.stripe.com/test](https://dashboard.stripe.com/test)
2. Assurez-vous d'être en **mode test** (bascule en haut à droite doit être sur "Test")

### 2. Créer ou trouver vos produits

#### Option A : Utiliser des produits existants
1. Allez dans **Products** (Produits) dans le menu de gauche
2. Cliquez sur un produit existant (ou créez-en un nouveau)

#### Option B : Créer de nouveaux produits
1. Cliquez sur **"+ Add product"**
2. Créez 3 produits :
   - **Monthly** : Abonnement mensuel
   - **Quarterly** : Abonnement trimestriel  
   - **Annual** : Abonnement annuel

### 3. Récupérer les Price IDs

Pour chaque produit :

1. Cliquez sur le produit
2. Dans la section **"Pricing"**, vous verrez les prix configurés
3. Chaque prix a un **Price ID** qui commence par `price_` (ex: `price_1AbCdEfGhIjKlMn`)
4. **Important** : Utilisez les Price IDs en mode **test** (pas ceux en mode live)

### 4. Configurer les variables d'environnement

Ajoutez ces variables dans votre fichier `.env.local` :

```env
# Stripe Price IDs (Mode Test)
STRIPE_PRICE_MONTHLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_QUARTERLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_ANNUAL=price_xxxxxxxxxxxxx
```

**Exemple :**
```env
STRIPE_PRICE_MONTHLY=price_1OaBcDeFgHiJkLmN
STRIPE_PRICE_QUARTERLY=price_1OaBcDeFgHiJkLmO
STRIPE_PRICE_ANNUAL=price_1OaBcDeFgHiJkLmP
```

### 5. Vérifier la configuration

Après avoir ajouté les variables, redémarrez votre serveur de développement :

```bash
npm run dev
```

Les Price IDs seront automatiquement chargés au démarrage.

## 🔍 Comment vérifier que ça fonctionne

1. Allez sur la page admin d'un club : `/admin/clubs/[id]`
2. Cliquez sur un bouton d'abonnement (ex: "Ajouter 1 mois d'abonnement")
3. Si les Price IDs sont correctement configurés, l'abonnement sera créé/mis à jour dans Stripe
4. Si une erreur apparaît, vérifiez les logs du serveur pour voir quel Price ID manque

## ⚠️ Notes importantes

- **Mode Test vs Live** : Assurez-vous d'utiliser les Price IDs de **test** (commencent par `price_` et sont visibles uniquement en mode test)
- **Format** : Les Price IDs doivent commencer par `price_` suivi de caractères alphanumériques
- **Sécurité** : Ne commitez jamais votre fichier `.env.local` dans Git (il devrait être dans `.gitignore`)

## 🆘 Dépannage

### Erreur : "Price ID not configured"
- Vérifiez que les variables sont bien dans `.env.local`
- Vérifiez que les noms des variables sont exactement : `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_QUARTERLY`, `STRIPE_PRICE_ANNUAL`
- Redémarrez le serveur après avoir modifié `.env.local`

### Erreur : "No such price"
- Vérifiez que vous utilisez les Price IDs de **test** (pas ceux de production)
- Vérifiez que les Price IDs sont corrects dans Stripe Dashboard
- Assurez-vous que votre `STRIPE_SECRET_KEY` est aussi en mode test (commence par `sk_test_`)

### Erreur : "Invalid API Key"
- Vérifiez que votre `STRIPE_SECRET_KEY` est bien configurée
- Assurez-vous d'utiliser la clé de **test** (commence par `sk_test_`)


