# 🔧 Configuration du système de chat support

## ✅ Checklist de configuration

### 1. Base de données Supabase
- [ ] **Exécuter le script SQL** : Ouvrez `create_support_chat_system.sql` dans Supabase SQL Editor et exécutez-le
  - Crée les tables `support_conversations` et `support_messages`
  - Configure les politiques RLS
  - Crée les index nécessaires

### 2. Variables d'environnement
Ajoutez ces variables dans votre `.env.local` (et sur Vercel si vous déployez) :

```bash
# Resend API
RESEND_API_KEY=re_QpdLYDNG_4eAhPB2vYmnfxLk44ocbjTj8

# Adresse email inbound de Resend (où les emails sont capturés par le webhook)
RESEND_INBOUND_EMAIL=contact@updates.padelxp.eu

# Adresse email de destination (votre Gmail où vous recevez les messages)
FORWARD_TO_EMAIL=contactpadelxp@gmail.com

# Adresse email d'envoi
RESEND_FROM_EMAIL=PadelXP Support <support@updates.padelxp.eu>
```

### 3. Configuration Resend

#### A. Vérifier le domaine
- [ ] Allez sur [Resend Dashboard](https://resend.com/domains)
- [ ] Vérifiez que le domaine `updates.padelxp.eu` est vérifié ✅
- [ ] Si non vérifié, suivez les instructions de vérification DNS

#### B. Configurer l'Inbound Email
- [ ] Allez sur [Resend Inbound](https://resend.com/emails/inbound)
- [ ] Vérifiez que l'adresse `contact@updates.padelxp.eu` est configurée
- [ ] Si elle n'existe pas, créez-la

#### C. Configurer le Webhook
- [ ] Allez sur [Resend Webhooks](https://resend.com/webhooks)
- [ ] Vérifiez qu'un webhook pointe vers : `https://padelxp.eu/api/resend-inbound`
- [ ] Le webhook doit écouter l'événement : `email.received`
- [ ] Le webhook doit être **activé** (Enabled)
- [ ] Si le webhook n'existe pas, créez-le :
  - URL : `https://padelxp.eu/api/resend-inbound`
  - Événement : `email.received`
  - Statut : `Enabled`

### 4. Test du système

#### Test 1 : Envoi d'un message depuis le club
1. Connectez-vous au compte club
2. Allez sur la page "Aide & Support"
3. Envoyez un message
4. Vérifiez que :
   - Le message apparaît immédiatement dans le chat
   - Vous recevez l'email dans votre boîte Gmail (`contactpadelxp@gmail.com`)

#### Test 2 : Réponse de l'admin
1. Répondez à l'email depuis Gmail
2. Vérifiez que :
   - Vous **NE recevez PAS** votre propre réponse dans Gmail
   - La réponse apparaît dans le chat de la page "Aide & Support" du club (automatiquement, dans les 5 secondes)

### 5. Dépannage

#### Le message du club n'apparaît pas dans le chat
- Vérifiez que le script SQL a été exécuté correctement
- Vérifiez les logs de l'API `/api/contact` dans la console Vercel
- Vérifiez que les tables existent dans Supabase

#### Les réponses de l'admin n'apparaissent pas dans le chat
- Vérifiez que le webhook est configuré dans Resend
- Vérifiez que le webhook est activé
- Vérifiez les logs du webhook dans Resend Dashboard
- Vérifiez les logs de l'API `/api/resend-inbound` dans la console Vercel
- Vérifiez que le `replyTo` de l'email du club pointe vers `contact@updates.padelxp.eu`

#### L'admin reçoit sa propre réponse dans Gmail
- C'est normal si ça arrive une fois (première fois)
- Si ça continue, vérifiez que le code dans `/api/resend-inbound/route.ts` ne transfère pas les réponses admin vers Gmail (ligne 226-288)

#### Erreur "Table does not exist"
- Exécutez le script `create_support_chat_system.sql` dans Supabase SQL Editor

#### Erreur "RESEND_API_KEY not configured"
- Ajoutez `RESEND_API_KEY` dans `.env.local` et redéployez sur Vercel

#### Erreur "Domain not verified"
- Vérifiez que le domaine `updates.padelxp.eu` est vérifié dans Resend
- Vérifiez les enregistrements DNS

### 6. Déploiement sur Vercel

Si vous déployez sur Vercel, n'oubliez pas d'ajouter les variables d'environnement :
1. Allez sur Vercel Dashboard → Votre projet → Settings → Environment Variables
2. Ajoutez toutes les variables listées ci-dessus
3. Redéployez l'application

---

## 📝 Résumé du flux

1. **Club envoie un message** → Enregistré dans DB → Transféré vers Gmail pour notifier l'admin
2. **Message apparaît immédiatement** dans le chat de la page "Aide & Support"
3. **Admin répond depuis Gmail** → Réponse envoyée à `contact@updates.padelxp.eu`
4. **Webhook capture la réponse** → Enregistre dans DB avec `sender_type: 'admin'`
5. **Réponse apparaît dans le chat** du club (rafraîchissement automatique toutes les 5 secondes)
6. **L'admin NE reçoit PAS sa propre réponse** dans Gmail (elle n'apparaît que dans le chat)

