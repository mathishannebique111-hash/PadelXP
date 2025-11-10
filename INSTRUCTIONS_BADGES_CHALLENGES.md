# Instructions - Système de Badges de Challenges

## Vue d'ensemble

Le système de badges de challenges permet aux clubs de créer des badges personnalisés comme récompenses pour les challenges. Lorsqu'un joueur réussit un challenge avec un badge en récompense, un badge personnalisé avec le nom choisi par le club apparaît automatiquement dans la page badges du joueur.

## Déploiement

### 1. Créer la table dans la base de données

Exécutez le script SQL suivant dans votre base de données Supabase :

```bash
# Chemin du fichier
supabase/migrations/create_challenge_badges_table.sql
```

Ou exécutez directement dans l'éditeur SQL de Supabase :

```sql
-- Voir le contenu du fichier create_challenge_badges_table.sql
```

### 2. Vérifier les permissions

Assurez-vous que :
- La table `challenge_badges` est créée
- Les RLS (Row Level Security) sont activés
- Les policies sont en place pour que les utilisateurs puissent voir leurs propres badges
- Le service role a tous les droits (pour l'API)

## Fonctionnement

### Pour les clubs (dashboard)

Quand un club crée un challenge dans le dashboard :
1. Il choisit "Badge" comme type de récompense
2. Il entre le nom du badge (exemple : "Challenge de novembre")
3. Le système attribue automatiquement un emoji unique à ce badge

### Pour les joueurs

Quand un joueur complète un challenge avec un badge en récompense :
1. Le badge est automatiquement créé dans la table `challenge_badges`
2. Un emoji unique est attribué de manière déterministe (basé sur l'ID du challenge)
3. Le badge apparaît immédiatement dans la page "Badges" du joueur
4. Le pop-up de félicitations affiche le badge avec son emoji

### Attribution des emojis

Le système utilise une liste de 30 emojis différents :
- 🏅 🎖️ 🥇 🥈 🥉 🎯 ⭐ 🌟 ✨ 💫
- 🔥 ⚡ 💪 🚀 🎊 🎉 🎁 🏆 👑 💎
- 🌈 ☀️ 🌙 ⚔️ 🛡️ 🎪 🎨 🎭 🎬 🎼

L'emoji est choisi de manière **déterministe** basé sur l'ID du challenge :
- Un même challenge aura toujours le même emoji
- Deux challenges différents auront probablement des emojis différents

## Structure de la base de données

### Table `challenge_badges`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Identifiant unique du badge |
| `user_id` | UUID | ID de l'utilisateur qui a gagné le badge |
| `challenge_id` | TEXT | ID du challenge qui a donné ce badge |
| `badge_name` | TEXT | Nom du badge (défini par le club) |
| `badge_emoji` | TEXT | Emoji attribué au badge |
| `earned_at` | TIMESTAMP | Date et heure d'obtention du badge |

**Contrainte unique** : `(user_id, challenge_id)` - Un joueur ne peut gagner qu'une fois le badge d'un challenge donné.

## Affichage dans la page Badges

La page badges affiche maintenant :

### Section "Badges de Challenges" (si le joueur en a)
- Cartes avec fond jaune/ambré
- Emoji unique pour chaque badge
- Nom du badge défini par le club
- Date d'obtention
- Message "Obtenu via un challenge"

### Section "Badges Standards"
- Badges prédéfinis du système (Première victoire, Série de 3, etc.)
- Affichage normal avec grayscale pour les badges non débloqués

### Statistiques en haut de page
- Compteur total de badges (standards + challenges)
- Décomposition : X badges standards, Y badges de challenges

## Fichiers modifiés

### Backend
1. **`app/api/challenges/claim-reward/route.ts`**
   - Ajout de la fonction `getEmojiForChallenge()` pour attribution déterministe des emojis
   - Ajout de la logique de création de badge dans la table `challenge_badges`
   - Gestion des erreurs si la table n'existe pas

### Frontend
2. **`app/(protected)/badges/page.tsx`**
   - Récupération des badges de challenges depuis la base de données
   - Affichage des badges de challenges dans une section séparée
   - Mise à jour des statistiques pour inclure les badges de challenges

3. **`components/challenges/ChallengeCard.tsx`**
   - Modification du message du pop-up de félicitations selon le type de récompense
   - "Vos points ont été ajoutés" pour les points
   - "Le badge a été ajouté à votre page badges" pour les badges

### Base de données
4. **`supabase/migrations/create_challenge_badges_table.sql`**
   - Création de la table `challenge_badges`
   - Configuration des RLS et policies

## Tests recommandés

1. **Test de création de badge**
   - Créer un challenge avec un badge en récompense dans le dashboard
   - Compléter le challenge avec un joueur
   - Vérifier que le badge apparaît dans la page badges du joueur

2. **Test d'emojis uniques**
   - Créer plusieurs challenges avec des badges différents
   - Vérifier que chaque challenge a un emoji différent
   - Vérifier qu'un même challenge garde le même emoji

3. **Test de contrainte unique**
   - Tenter de réclamer deux fois le même badge de challenge
   - Vérifier que le système refuse la duplication

4. **Test d'affichage**
   - Vérifier que les badges de challenges s'affichent avec le bon style
   - Vérifier que les statistiques sont correctes
   - Vérifier que la date d'obtention est bien affichée

## Dépannage

### Le badge n'apparaît pas
- Vérifier que la table `challenge_badges` existe
- Vérifier les logs de l'API claim-reward
- Vérifier que le RLS est correctement configuré

### Emoji toujours identique
- C'est normal si c'est le même challenge
- Les emojis sont déterministes basés sur l'ID du challenge

### Erreur "table challenge_badges does not exist"
- Exécuter le script SQL de migration
- Redémarrer l'application après la création de la table

## Notes importantes

- Les badges de challenges sont **permanents** - ils ne peuvent pas être perdus
- Un joueur ne peut gagner qu'**une seule fois** le badge d'un challenge donné
- Les emojis sont attribués **automatiquement** et ne peuvent pas être modifiés manuellement
- Les badges de challenges sont **indépendants** des badges standards du système

