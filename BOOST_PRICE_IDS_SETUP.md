# ⚡ Configuration des Price IDs pour les Boosts

## 📋 Variables d'environnement à ajouter dans `.env.local`

Ajoutez ces 3 variables dans votre fichier `.env.local` :

```bash
# Boost x1 (utilise aussi STRIPE_PRICE_PLAYER_BOOST si défini)
NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_1=votre_price_id_boost_x1

# Boost x5 (pack de 5 boosts)
NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_5=price_1SUWLv3RWATPTiiq2HqRby7v

# Boost x10 (pack de 10 boosts)
NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_10=price_1SUWNE3RWATPTiiqMTwmOJUR
```

## 🔄 Compatibilité avec l'ancienne variable

Si vous avez déjà `STRIPE_PRICE_PLAYER_BOOST` configuré pour le boost x1, le système l'utilisera automatiquement comme fallback si `NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_1` n'est pas défini.

**Recommandation** : Ajoutez `NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_1` pour être cohérent avec les autres.

## ✅ Vérification

Après avoir ajouté les variables :

1. **Redémarrez le serveur de développement** (`npm run dev`)
2. **Allez sur `/boost`** et vérifiez que les 3 boutons s'affichent
3. **Testez chaque bouton** pour vérifier qu'il redirige vers Stripe avec le bon Price ID

## 🎯 Structure des produits Stripe

Assurez-vous d'avoir créé 3 produits distincts dans Stripe :

1. **Produit "Boost x1"** → Prix unique → Price ID utilisé pour `NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_1`
2. **Produit "Boost x5"** → Prix unique (pack de 5) → Price ID: `price_1SUWLv3RWATPTiiq2HqRby7v`
3. **Produit "Boost x10"** → Prix unique (pack de 10) → Price ID: `price_1SUWNE3RWATPTiiqMTwmOJUR`

## 📝 Notes importantes

- Les variables doivent commencer par `NEXT_PUBLIC_` car elles sont utilisées dans un Server Component qui passe les valeurs à un Client Component
- Chaque produit Stripe doit être configuré en **paiement unique** (pas d'abonnement)
- La quantité est toujours `1` dans Stripe car chaque produit représente déjà un pack complet


