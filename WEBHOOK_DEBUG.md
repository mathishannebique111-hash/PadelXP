# 🔍 Debug du Webhook resend-inbound

## Problème
Le webhook `resend-inbound` ne semble pas être appelé quand l'admin répond depuis Gmail à un email de modération d'avis.

## Vérifications nécessaires

### 1. Configuration du webhook dans Resend

Vérifiez que le webhook est bien configuré dans le dashboard Resend :

1. Allez sur https://resend.com/dashboard
2. Allez dans "Inbound" → "Settings" ou "Webhooks"
3. Vérifiez que l'inbound email est configuré : `contact@updates.padelxp.eu`
4. Vérifiez que le webhook est configuré pour pointer vers :
   ```
   https://votre-domaine.com/api/resend-inbound
   ```
   Ou en local :
   ```
   http://localhost:3000/api/resend-inbound
   ```

### 2. Vérification que les emails sont capturés

Quand l'admin répond depuis Gmail, l'email doit être envoyé à l'adresse `contact@updates.padelxp.eu` pour être capturé par Resend.

Vérifiez que :
- Le `replyTo` de l'email initial est bien `contact@updates.padelxp.eu`
- L'email transféré vers Gmail a bien `replyTo: contact@updates.padelxp.eu`
- Quand vous répondez depuis Gmail, l'email est bien envoyé à `contact@updates.padelxp.eu`

### 3. Logs

Les logs devraient maintenant apparaître avec ces préfixes :
- `🚀🚀🚀 WEBHOOK RESEND-INBOUND CALLED 🚀🚀🚀` - Le webhook est appelé
- `📧 Email metadata:` - Les métadonnées de l'email
- `🔍 Checking if this is a review conversation reply:` - Vérification si c'est une réponse à un avis modéré

### 4. Si l'application est déployée sur Vercel

Les logs peuvent ne pas apparaître dans le terminal local. Vérifiez les logs dans :
- Dashboard Vercel → Votre projet → Logs
- Ou via la CLI : `vercel logs`

### 5. Test du webhook

Pour tester si le webhook fonctionne, vous pouvez :

1. **Envoyer un email directement à l'inbound email** :
   - Depuis votre boîte mail, envoyez un email à `contact@updates.padelxp.eu`
   - Vérifiez si le webhook est appelé (logs `🚀🚀🚀`)

2. **Vérifier dans Resend Dashboard** :
   - Allez dans "Inbound" → "Emails"
   - Vérifiez si les emails arrivent bien
   - Vérifiez si le webhook est appelé (statut des webhooks)

### 6. Configuration de l'inbound email dans Resend

Assurez-vous que :
- L'inbound email `contact@updates.padelxp.eu` est bien activé
- Le domaine `updates.padelxp.eu` est vérifié dans Resend
- Le webhook est activé et pointe vers la bonne URL

## Prochaines étapes

1. Vérifiez que le webhook est bien configuré dans Resend
2. Testez en envoyant un email directement à `contact@updates.padelxp.eu`
3. Vérifiez les logs Vercel si l'app est déployée
4. Vérifiez que le `replyTo` est bien configuré quand l'email est transféré vers Gmail

