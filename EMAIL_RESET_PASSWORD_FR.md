# Configuration de l'email de réinitialisation de mot de passe en français

## 📧 Configuration dans Supabase Dashboard

Pour que l'email de réinitialisation de mot de passe soit envoyé en français, vous devez configurer le template d'email dans Supabase :

### Étapes :

1. **Connectez-vous à votre Supabase Dashboard**
   - Allez sur [supabase.com](https://supabase.com)
   - Sélectionnez votre projet

2. **Accédez aux templates d'email**
   - Menu de gauche : **Authentication**
   - Sous-menu : **Email Templates**
   - Sélectionnez : **Reset Password**

3. **Personnalisez le template en français**

   Remplacez le contenu par défaut par :

   **Sujet de l'email :**
   ```
   Réinitialisation de votre mot de passe PadelXP
   ```

   **Corps de l'email (HTML) :**
   ```html
   <h2>Réinitialisation de votre mot de passe</h2>
   <p>Bonjour,</p>
   <p>Vous avez demandé à réinitialiser votre mot de passe pour votre compte PadelXP.</p>
   <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
   <p><a href="{{ .ConfirmationURL }}">Réinitialiser mon mot de passe</a></p>
   <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.</p>
   <p>Ce lien est valide pendant 1 heure.</p>
   <p>Cordialement,<br>L'équipe PadelXP</p>
   ```

   **Corps de l'email (Texte brut) :**
   ```
   Réinitialisation de votre mot de passe
   
   Bonjour,
   
   Vous avez demandé à réinitialiser votre mot de passe pour votre compte PadelXP.
   
   Cliquez sur le lien suivant pour définir un nouveau mot de passe :
   {{ .ConfirmationURL }}
   
   Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.
   
   Ce lien est valide pendant 1 heure.
   
   Cordialement,
   L'équipe PadelXP
   ```

4. **Sauvegardez les modifications**
   - Cliquez sur **Save** en bas de la page

## ✅ Vérification

Après avoir configuré le template :
- Les emails de réinitialisation seront envoyés en français
- Le lien de réinitialisation pointera vers `/reset-password`
- Tous les messages d'erreur dans l'application sont déjà en français

## 📝 Variables disponibles dans le template

- `{{ .ConfirmationURL }}` : URL de réinitialisation avec le token
- `{{ .Token }}` : Token de réinitialisation (si besoin)
- `{{ .Email }}` : Email de l'utilisateur
- `{{ .SiteURL }}` : URL de base de votre application

## 🔗 Lien de redirection

Le lien de redirection est configuré dans le code (`ForgotPasswordForm.tsx`) :
```typescript
const redirectUrl = `${siteUrl}/reset-password`;
```

Assurez-vous que `NEXT_PUBLIC_SITE_URL` est correctement configuré dans vos variables d'environnement.
