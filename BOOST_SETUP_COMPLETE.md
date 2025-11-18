# ⚡ Configuration complète des 3 offres de Boost

## ✅ Modifications terminées

Le système a été mis à jour pour supporter **3 offres distinctes** de boosts avec leurs propres Price IDs Stripe :

1. **Boost x1** : 1 boost
2. **Boost x5** : Pack de 5 boosts
3. **Boost x10** : Pack de 10 boosts

---

## 📋 Variables d'environnement à ajouter dans `.env.local`

Ajoutez ces variables dans votre fichier `.env.local` :

```bash
# Boost x1 (si vous avez déjà STRIPE_PRICE_PLAYER_BOOST, copiez sa valeur ici)
NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_1=votre_price_id_boost_x1

# Boost x5 (pack de 5 boosts)
NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_5=price_1SUWLv3RWATPTiiq2HqRby7v

# Boost x10 (pack de 10 boosts)
NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_10=price_1SUWNE3RWATPTiiqMTwmOJUR
```

### Note importante

Si vous avez déjà `STRIPE_PRICE_PLAYER_BOOST` configuré pour le boost x1 :
- **Copiez la valeur** de `STRIPE_PRICE_PLAYER_BOOST` dans `NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_1`
- Les variables pour les boosts doivent commencer par `NEXT_PUBLIC_` car elles sont utilisées côté client

**Exemple :** Si vous avez `STRIPE_PRICE_PLAYER_BOOST=price_abc123`, ajoutez :
```bash
NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_1=price_abc123
```

---

## 🔄 Comment ça fonctionne

### Côté client (page `/boost`)
- Les 3 boutons affichent "1 boost", "5 boosts", "10 boosts"
- Chaque bouton passe le `priceId` correspondant à l'API

### Côté serveur (API `/api/stripe/checkout-boost`)
- L'API reçoit le `priceId` depuis le frontend
- Elle détermine automatiquement la quantité de boosts à créditer :
  - Si `priceId === NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_1` → créditer **1 boost**
  - Si `priceId === NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_5` → créditer **5 boosts**
  - Si `priceId === NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_10` → créditer **10 boosts**
- Crée une session Stripe Checkout avec `quantity: 1` (car chaque produit est déjà un pack complet)
- Stocke dans les métadonnées la **quantité réelle de boosts** à créditer (1, 5 ou 10)

### Webhook Stripe (`/api/stripe/webhook`)
- Quand le paiement est confirmé, le webhook lit la quantité depuis les métadonnées
- Crédite le bon nombre de boosts au joueur (1, 5 ou 10)

---

## 🧪 Tests à effectuer

### Test 1 : Boost x1
1. Allez sur `/boost`
2. Cliquez sur "1 boost"
3. Complétez le paiement
4. Vérifiez qu'**1 boost** a été ajouté à votre compte

### Test 2 : Boost x5
1. Allez sur `/boost`
2. Cliquez sur "5 boosts"
3. Complétez le paiement
4. Vérifiez qu'**5 boosts** ont été ajoutés à votre compte

### Test 3 : Boost x10
1. Allez sur `/boost`
2. Cliquez sur "10 boosts"
3. Complétez le paiement
4. Vérifiez qu'**10 boosts** ont été ajoutés à votre compte

### Vérification dans Supabase
Après chaque achat, vérifiez dans Supabase :
```sql
SELECT COUNT(*) 
FROM player_boost_credits 
WHERE user_id = 'VOTRE_USER_ID' 
  AND consumed_at IS NULL;
```

---

## 📁 Fichiers modifiés/créés

### Nouveaux fichiers
- `lib/config/boost-prices.ts` - Configuration centralisée des Price IDs
- `BOOST_PRICE_IDS_SETUP.md` - Documentation de configuration
- `BOOST_SETUP_COMPLETE.md` - Ce fichier

### Fichiers modifiés
- `app/api/stripe/checkout-boost/route.ts` - Détermine la quantité selon le Price ID
- `app/api/stripe/webhook/route.ts` - Gère le crédit avec la quantité stockée dans les métadonnées
- `components/BoostPurchaseButton.tsx` - Accepte maintenant un `priceId` en paramètre
- `app/(protected)/boost/page.tsx` - Utilise la configuration centralisée des Price IDs

---

## ⚠️ Notes importantes

1. **Chaque produit Stripe doit être configuré en "paiement unique"** (pas d'abonnement)
2. **La quantité Stripe est toujours 1** car chaque produit représente déjà un pack complet
3. **La quantité réelle de boosts** (1, 5 ou 10) est stockée dans les métadonnées de la session Stripe
4. **Les variables doivent commencer par `NEXT_PUBLIC_`** car elles sont utilisées dans un Server Component qui passe les valeurs à un Client Component

---

## 🔍 Vérification rapide

Pour vérifier que tout est bien configuré :

```bash
# Dans votre terminal
echo $NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_1
echo $NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_5
echo $NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_10
```

Ou dans votre code Node.js (après redémarrage du serveur) :
```typescript
import { BOOST_PRICE_IDS } from '@/lib/config/boost-prices';
console.log('Price IDs:', BOOST_PRICE_IDS);
```

---

## ✅ Après configuration

1. **Redémarrez le serveur de développement** : `npm run dev`
2. **Allez sur `/boost`** et vérifiez que les 3 boutons s'affichent
3. **Testez chaque bouton** pour vérifier qu'ils fonctionnent correctement

Tout est prêt ! 🚀

