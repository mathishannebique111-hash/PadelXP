# Configuration du système de chat support

Ce document explique comment configurer le système de chat intégré dans la page "Aide & Support" qui permet aux clubs de voir les réponses par email dans l'interface.

## 📋 Prérequis

1. Avoir exécuté le script SQL `create_support_chat_system.sql` dans Supabase SQL Editor
2. Avoir configuré Resend avec une clé API valide
3. Avoir un domaine vérifié dans Resend (pour recevoir les emails entrants)

## 🗄️ Structure de la base de données

Le système utilise deux tables :

- `support_conversations` : Stocke les conversations de support entre un club et l'admin
- `support_messages` : Stocke tous les messages d'une conversation

## 📧 Configuration Resend

### 1. Configurer Inbound Email dans Resend

1. Connectez-vous à [resend.com](https://resend.com)
2. Allez dans **Settings** → **Domains**
3. Vérifiez votre domaine (par exemple : `padelleague.com`)
4. Allez dans **Settings** → **Inbound Email**
5. Activez "Inbound Email" pour votre domaine
6. Configurez le webhook vers : `https://votredomaine.com/api/webhooks/resend`

### 2. Variables d'environnement

Ajoutez dans `.env.local` :

```bash
RESEND_API_KEY=re_votre_cle_api
RESEND_FROM_EMAIL="PadelXP <noreply@padelleague.com>"
RESEND_REPLY_DOMAIN=padelleague.com  # Votre domaine vérifié
```

### 3. Configuration du domaine pour les réponses

Pour que les réponses soient correctement routées vers votre webhook, vous devez :

1. Configurer un catch-all email sur votre domaine qui redirige vers Resend
2. Ou configurer spécifiquement les emails `reply+*@votredomaine.com` vers Resend

## 🔄 Fonctionnement

### Flux d'un nouveau message

1. Le club envoie un message via le formulaire sur `/dashboard/aide`
2. L'API `/api/contact` :
   - Crée ou récupère une conversation active pour ce club
   - Envoie un email à `contactpadelxp@gmail.com` avec un header `X-Conversation-ID`
   - Enregistre le message dans `support_messages`
3. Le message apparaît immédiatement dans la conversation de la page

### Flux d'une réponse par email

1. L'admin répond à l'email depuis `contactpadelxp@gmail.com`
2. Resend reçoit l'email via Inbound Email
3. Resend envoie un webhook à `/api/webhooks/resend`
4. Le webhook :
   - Extrait l'ID de conversation depuis les headers ou le Reply-To
   - Enregistre le message dans `support_messages` avec `sender_type = 'admin'`
   - Met à jour `last_message_at` de la conversation
5. La page recharge automatiquement toutes les 5 secondes et affiche le nouveau message

## 🔍 Identification des conversations

Le système identifie la conversation de plusieurs façons :

1. **Header `X-Conversation-ID`** : Le plus fiable, ajouté dans chaque email envoyé
2. **Reply-To header** : Format `reply+TOKEN@domain.com` où TOKEN est l'ID de conversation encodé
3. **In-Reply-To / References** : Headers standards des emails
4. **Sujet de l'email** : Format `[Conversation-ID] Sujet`

## 📱 Interface utilisateur

La page `/dashboard/aide` affiche :

- **Mini-FAQ** : Questions fréquentes
- **Conversation de support** : Si une conversation existe avec des messages
  - Messages du club alignés à droite (bleu)
  - Messages du support alignés à gauche (gris)
  - Rafraîchissement automatique toutes les 5 secondes
  - Scroll automatique vers les nouveaux messages
- **Formulaire de contact** : Pour envoyer un nouveau message

## 🐛 Dépannage

### Les réponses n'apparaissent pas dans la conversation

1. Vérifiez que le webhook Resend est bien configuré
2. Vérifiez les logs du serveur pour voir si le webhook est appelé
3. Vérifiez que l'ID de conversation est bien présent dans les headers de l'email
4. Vérifiez les logs de Resend dans leur dashboard

### Les messages ne s'enregistrent pas

1. Vérifiez que les tables `support_conversations` et `support_messages` existent
2. Vérifiez que les RLS policies permettent l'insertion
3. Vérifiez les logs du serveur pour les erreurs de base de données

### Les emails ne sont pas reçus par Resend

1. Vérifiez que Inbound Email est activé pour votre domaine
2. Vérifiez la configuration DNS de votre domaine
3. Vérifiez que le domaine est bien vérifié dans Resend

## 🔐 Sécurité

- Le webhook devrait vérifier la signature de Resend (optionnel mais recommandé)
- Les RLS policies assurent que les clubs ne peuvent voir que leurs propres conversations
- L'API utilise Supabase Admin uniquement pour écrire, pas pour lire

## 📝 Notes importantes

- Une seule conversation "ouverte" est maintenue par club
- Les nouvelles conversations sont créées si la précédente est fermée
- Les messages sont ordonnés par date de création
- Le système évite les doublons grâce à `email_message_id`

