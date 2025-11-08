# 🔧 Instructions de Correction des Bugs

## Bug : Next.js version obsolète (15.5.6 outdated)

### Problème
La version de Next.js dans `package.json` était `^15.0.0`, mais la version installée est 15.5.6 qui est marquée comme "outdated".

### Solution

**Mise à jour effectuée :**
- `package.json` a été mis à jour pour utiliser `^15.5.6`

**Pour appliquer la mise à jour :**

```bash
npm install
# ou
yarn install
# ou
pnpm install
```

Puis redémarrez le serveur de développement :

```bash
npm run dev
# ou
yarn dev
# ou
pnpm dev
```

---

## ✅ Résumé des corrections

1. ✅ **Version Next.js** : Mise à jour vers `^15.5.6` dans `package.json`
2. ✅ **Suppression de league_id** : Toutes les références à `league_id` ont été supprimées du code

**Action requise :**
- Installer les dépendances pour la mise à jour Next.js

