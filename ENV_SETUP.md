# Configuration des variables d'environnement

## Variables requises pour le système de confirmation par email

Ajoutez ces variables à votre fichier `.env.local` :

```bash
# Supabase (déjà configuré)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Resend (pour l'envoi d'emails)
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL="PadelXP <noreply@yourdomain.com>"

# URL de base de l'application
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # En production: https://yourdomain.com
```

## Installation de Resend

1. Créez un compte sur [resend.com](https://resend.com)
2. Générez une clé API
3. Ajoutez la clé dans `.env.local` comme `RESEND_API_KEY`
4. Configurez votre domaine d'envoi (ou utilisez le domaine de test pour le développement)

## Installation de la dépendance

```bash
npm install resend
```

## Configuration Supabase

Exécutez le script SQL `create_match_confirmations_system.sql` dans Supabase SQL Editor pour créer :
- La table `match_confirmations`
- La colonne `status` dans `matches`
- La colonne `players_hash` pour la détection de doublons
- Les politiques RLS appropriées
- Les triggers pour la validation automatique

