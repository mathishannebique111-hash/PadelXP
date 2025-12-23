# 🎾 Système de Confirmation de Matchs

## Vue d'ensemble

Le système de confirmation permet de :
- ✅ Envoyer un email de confirmation aux 3 autres joueurs lorsqu'un match est enregistré
- ✅ Valider automatiquement le match lorsque 2 joueurs sur 3 confirment
- ✅ Empêcher l'enregistrement de matchs en double pour éviter la triche

## 📋 Configuration requise

### 1. Exécuter le script SQL

Exécutez le script `create_match_confirmations_system.sql` dans Supabase SQL Editor pour créer :
- La table `match_confirmations`
- La colonne `status` dans `matches` (pending/confirmed/rejected)
- La colonne `players_hash` pour la détection de doublons
- Les politiques RLS
- Les triggers pour la validation automatique

### 2. Installer Resend

```bash
npm install resend
```

### 3. Configurer les variables d'environnement

Ajoutez dans `.env.local` :

```bash
# Resend (pour l'envoi d'emails)
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL="PadelXP <noreply@yourdomain.com>"

# URL de base de l'application
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # En production: https://yourdomain.com
```

### 4. Créer un compte Resend

1. Allez sur [resend.com](https://resend.com)
2. Créez un compte
3. Générez une clé API
4. Configurez votre domaine d'envoi (ou utilisez le domaine de test pour le développement)

## 🔄 Flux de fonctionnement

1. **Enregistrement du match** :
   - Le joueur remplit le formulaire et soumet le match
   - Un match est créé avec le statut `pending`
   - Un hash des joueurs est créé pour détecter les doublons
   - Des confirmations sont créées pour les 3 autres joueurs
   - Des emails sont envoyés aux 3 autres joueurs avec un lien unique

2. **Confirmation** :
   - Chaque joueur reçoit un email avec un lien de confirmation
   - En cliquant sur le lien, le joueur est redirigé vers `/matches/confirm?token=...`
   - Le joueur peut confirmer le match
   - Dès que 2 joueurs sur 3 confirment, le match passe automatiquement à `confirmed`

3. **Statistiques** :
   - Seuls les matchs avec `status = 'confirmed'` sont comptés dans les statistiques
   - Les sets gagnés/perdus sont calculés uniquement pour les matchs confirmés

## 🛡️ Détection des doublons

Le système vérifie automatiquement si un match avec les mêmes joueurs a été enregistré dans les 48 dernières heures. Si c'est le cas, l'enregistrement est bloqué avec un message d'erreur.

## 📧 Format des emails

Les emails contiennent :
- Le nom du créateur du match
- Le score du match
- Un bouton pour confirmer
- Un lien direct vers la page de confirmation

## 🔐 Sécurité

- Chaque confirmation a un token unique et sécurisé
- Les tokens ne peuvent être utilisés que par le joueur concerné
- Les confirmations sont vérifiées côté serveur
- Utilisation de `service_role` pour bypass RLS quand nécessaire

## ⚠️ Notes importantes

- Si `RESEND_API_KEY` n'est pas configuré, les emails ne seront pas envoyés mais le système continuera de fonctionner (avertissement dans les logs)
- Les matchs en attente (`pending`) ne sont pas comptés dans les statistiques
- Les matchs non confirmés après un certain délai peuvent être supprimés automatiquement (fonctionnalité future)

