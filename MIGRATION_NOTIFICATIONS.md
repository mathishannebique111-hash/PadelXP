# 🔄 Migration des Notifications Historiques

## 📋 Vue d'ensemble

Ce système permet de générer automatiquement les notifications historiques pour tous les joueurs existants, incluant :

- 🎯 **Notifications de niveau** (Bronze, Argent, Or, Diamant, Champion)
- 🏅 **Notifications de badges** (Première victoire, Séries, Marathonien, etc.)
- 🏆 **Notifications de classement** (Top 3 du club)

## 🚀 Configuration

### 1. Définir le secret d'administration

Ajoutez cette ligne à votre fichier `.env.local` :

```bash
ADMIN_MIGRATION_SECRET=votre_secret_securise_ici
```

⚠️ **Important** : Utilisez un secret fort et unique en production !

### 2. Redémarrer le serveur de développement

```bash
npm run dev
```

## 📝 Méthodes d'exécution

### Méthode 1 : Interface Web (Recommandée)

1. Accédez à : `http://localhost:3000/admin/migrate-notifications`
2. Entrez votre secret d'administration
3. Cochez "Supprimer les notifications existantes" si nécessaire
4. Cliquez sur "🚀 Lancer la migration"
5. Attendez la fin de l'exécution (quelques minutes selon le nombre de joueurs)

### Méthode 2 : API directe

```bash
curl -X POST http://localhost:3000/api/admin/migrate-notifications \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "votre_secret_ici",
    "clearExisting": false
  }'
```

### Méthode 3 : Script Node.js

```bash
cd scripts
npx tsx migrate-historical-notifications.ts
```

## 🔍 Détails techniques

### Que fait le script ?

1. **Récupère tous les clubs actifs**
2. **Pour chaque club** :
   - Récupère tous les joueurs
   - Calcule leurs statistiques (victoires, défaites, points, streak)
   - Génère le classement du club
3. **Pour chaque joueur** :
   - Crée une notification de niveau si points > 0
   - Crée des notifications pour chaque badge débloqué
   - Crée une notification de classement si dans le Top 3

### Calculs effectués

#### Points et Niveaux
- **Bronze** : 0-99 points
- **Argent** : 100-199 points
- **Or** : 200-299 points
- **Diamant** : 300-499 points
- **Champion** : 500+ points

#### Badges disponibles (15 au total)
- 🏆 Première victoire (1+ victoire)
- 🔥 Séries (3, 5, 7, 10, 15, 20 victoires consécutives)
- 🎖️ Marathonien (50 matchs)
- 🏅 Centurion (100 matchs)
- 💯 Meilleur scoreur (100+ points)
- 💎 Diamant (500+ points)
- 📈 En progression (5 victoires de plus que défaites)
- 🎯 Précision (5 victoires sans défaite)
- 🏆🏆🏆 Légende (200 victoires)
- 🎾 Amour du padel (200 matchs)

## 📊 Exemple de résultat

```json
{
  "success": true,
  "stats": {
    "players": 45,
    "notifications": 187
  },
  "logs": [
    "📊 3 clubs trouvés",
    "🏢 Club: Padel Club Paris",
    "   👥 15 joueurs",
    "   ✅ Marc L.: 8 notifications",
    "   ✅ Sophie D.: 12 notifications",
    "..."
  ]
}
```

## ⚠️ Considérations importantes

### Performances
- Le script peut prendre **plusieurs minutes** pour les grandes bases de données
- Il traite **tous les clubs et joueurs** en une seule exécution
- Les calculs de streak peuvent être coûteux en ressources

### Notifications en double
- Par défaut, le script **ne supprime pas** les notifications existantes
- Utilisez `clearExisting: true` pour supprimer et régénérer
- Les joueurs verront **toutes les notifications** créées dans le NotificationCenter

### Idempotence
- Le script peut être exécuté **plusieurs fois**
- Si `clearExisting: false`, il créera des doublons
- Si `clearExisting: true`, il régénérera tout depuis zéro

## 🔒 Sécurité

- L'endpoint `/api/admin/migrate-notifications` est **protégé par secret**
- Le secret doit être défini dans `.env.local`
- Ne **jamais exposer** le secret publiquement
- En production, utilisez un secret **fort et unique**

## 🐛 Dépannage

### Erreur "Non autorisé"
→ Vérifiez que le secret dans `.env.local` correspond à celui envoyé

### Erreur "Erreur récupération clubs"
→ Vérifiez les credentials Supabase (`SUPABASE_SERVICE_ROLE_KEY`)

### Notifications non visibles
→ Vérifiez que le joueur a bien un `club_id` dans la table `profiles`

### Script trop lent
→ Normal pour de grandes bases, soyez patient ou exécutez par club

## 📚 Fichiers concernés

- `/app/api/admin/migrate-notifications/route.ts` - API endpoint
- `/app/admin/migrate-notifications/page.tsx` - Interface web
- `/scripts/migrate-historical-notifications.ts` - Script standalone
- `/lib/notifications.ts` - Fonctions de création de notifications
- `/components/notifications/NotificationItem.tsx` - Affichage des notifications

## 🎯 Utilisation future

### Nouveaux joueurs
Les nouveaux joueurs recevront automatiquement leurs notifications **en temps réel** grâce aux composants :
- `LevelUpNotifier` - Détecte les changements de niveau
- `BadgesUnlockNotifier` - Détecte les nouveaux badges
- `Top3Notification` - Détecte les changements de classement

### Re-migration
Pour régénérer toutes les notifications après un changement de logique :
```bash
curl -X POST http://localhost:3000/api/admin/migrate-notifications \
  -H "Content-Type: application/json" \
  -d '{"secret": "votre_secret", "clearExisting": true}'
```

---

**Dernière mise à jour** : Décembre 2025
**Version** : 1.0.0

