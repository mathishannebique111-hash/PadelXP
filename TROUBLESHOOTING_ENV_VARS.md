# 🔧 Résolution des problèmes de variables d'environnement

## Problème : Les variables NEXT_PUBLIC_* ne sont pas chargées

Si vous avez ajouté les variables dans `.env.local` mais qu'elles ne sont toujours pas disponibles :

### 1. Redémarrez complètement le serveur de développement

**Important** : Dans Next.js, les variables d'environnement sont chargées au démarrage du serveur. Si vous modifiez `.env.local` pendant que le serveur tourne, **vous devez le redémarrer**.

```bash
# Arrêtez le serveur (Ctrl+C ou Cmd+C)
# Puis redémarrez-le
npm run dev
```

### 2. Vérifiez le format des variables dans `.env.local`

Le fichier doit être à la racine du projet (même niveau que `package.json`).

Format correct (sans espaces autour du `=`) :
```bash
NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_1=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_5=price_1SUWLv3RWATPTiiq2HqRby7v
NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_10=price_1SUWNE3RWATPTiiqMTwmOJUR
```

**Format incorrect** :
```bash
# ❌ Avec espaces
NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_1 = price_xxxxxxxxxxxxx

# ❌ Avec guillemets (pas nécessaire)
NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_1="price_xxxxxxxxxxxxx"

# ❌ Avec point-virgule
NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_1=price_xxxxxxxxxxxxx;
```

### 3. Nettoyez le cache Next.js

Parfois, Next.js garde en cache les anciennes valeurs. Nettoyez le cache :

```bash
# Supprimez le dossier .next
rm -rf .next

# Puis redémarrez le serveur
npm run dev
```

### 4. Vérifiez que les variables sont bien définies

Après le redémarrage, vérifiez les logs dans la console du serveur quand vous accédez à `/boost`. Vous devriez voir :
```
[Boost Page] Direct env vars: { x1: 'price_...', x5: 'price_...', x10: 'price_...' }
```

Si vous voyez `NOT SET` ou `EMPTY`, les variables ne sont pas chargées.

### 5. Vérifiez que vous êtes dans le bon environnement

Assurez-vous d'utiliser `.env.local` et non `.env` ou `.env.production`.

L'ordre de priorité dans Next.js est :
1. `.env.local` (toujours chargé, sauf en production)
2. `.env.development` / `.env.production` (selon le mode)
3. `.env`

### 6. Si rien ne fonctionne

Testez manuellement dans un composant :

```typescript
console.log('Test env vars:', {
  x1: process.env.NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_1,
  x5: process.env.NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_5,
  x10: process.env.NEXT_PUBLIC_STRIPE_PRICE_PLAYER_BOOST_10,
});
```

Si ces valeurs sont `undefined`, le problème vient de la configuration Next.js ou du format du fichier `.env.local`.

## Solution appliquée

Le code utilise maintenant des **getters** au lieu de constantes pour forcer l'évaluation des variables d'environnement au runtime plutôt qu'au chargement du module. Cela devrait résoudre les problèmes de cache.


