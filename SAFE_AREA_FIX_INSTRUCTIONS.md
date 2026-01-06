# Instructions pour supprimer les bandes blanches dans l'app Capacitor

## ✅ Modifications effectuées

### 1. Configuration Capacitor (`capacitor.config.ts`)
- ✅ `contentInset: 'never'` pour iOS
- ✅ Configuration StatusBar transparente
- ✅ `overlaysWebView: true` pour que la WebView passe sous la status bar

### 2. Code TypeScript/React
- ✅ Hook `useStatusBar` créé dans `lib/hooks/useStatusBar.ts`
- ✅ Composant `StatusBarInitializer` créé dans `components/StatusBarInitializer.tsx`
- ✅ Intégré dans `app/layout.tsx`
- ✅ Meta viewport avec `viewport-fit=cover` et `black-translucent`

### 3. iOS (Xcode)
- ✅ `Info.plist` : Ajout des clés pour status bar style
- ✅ `AppDelegate.swift` : Fenêtre transparente et style status bar
- ✅ `BridgeViewController.swift` : WebView transparente et fullscreen

### 4. Android
- ✅ `styles.xml` : Barres système transparentes
- ✅ `MainActivity.java` : Flags fullscreen pour étendre sous les barres

## 📋 Étapes à suivre

### Étape 1 : Installer le plugin StatusBar
```bash
npm install @capacitor/status-bar
```

### Étape 2 : Synchroniser Capacitor
```bash
npm run build
npx cap sync ios
npx cap sync android
```

### Étape 3 : iOS - Intégrer BridgeViewController dans Xcode

**Option A : Si Capacitor 8 utilise encore un BridgeViewController personnalisé**

1. Ouvrir Xcode :
```bash
npx cap open ios
```

2. Dans Xcode, vérifier si `BridgeViewController.swift` est bien ajouté au projet :
   - Clic droit sur le dossier `App` → "Add Files to App"
   - Sélectionner `BridgeViewController.swift` si pas déjà ajouté

3. Si Capacitor 8 utilise une structure différente, il faudra peut-être modifier directement le fichier généré par Capacitor. Dans ce cas, chercher le fichier qui contient `CAPBridgeViewController` et appliquer les mêmes modifications.

**Option B : Si Capacitor 8 gère différemment**

Dans Capacitor 8, la structure peut être différente. Si le `BridgeViewController.swift` n'est pas utilisé, les modifications dans `AppDelegate.swift` et `Info.plist` devraient suffire.

### Étape 4 : Build et test iOS
```bash
# Dans Xcode :
# 1. Clean Build Folder (Cmd + Shift + K)
# 2. Build (Cmd + B)
# 3. Run sur simulateur ou iPhone réel (Cmd + R)
```

### Étape 5 : Build et test Android
```bash
npx cap open android
# Dans Android Studio :
# 1. Build → Clean Project
# 2. Build → Rebuild Project
# 3. Run sur émulateur ou téléphone Android
```

## 🎯 Résultat attendu

Après ces modifications :
- ✅ Le dégradé s'étend dans le notch iOS
- ✅ Le dégradé descend sous le home indicator
- ✅ Pas de bandes blanches en haut ou en bas
- ✅ Le contenu reste lisible (utilise safe-area-inset en CSS si nécessaire)

## ⚠️ Notes importantes

1. **Plugin StatusBar** : Si l'installation échoue, réessayer avec les permissions appropriées ou installer manuellement.

2. **BridgeViewController** : Dans Capacitor 8, la structure peut avoir changé. Si le fichier `BridgeViewController.swift` n'est pas reconnu, vérifier la documentation Capacitor 8 pour la méthode recommandée.

3. **Meta viewport** : Le `viewport-fit=cover` est CRITIQUE pour iOS. Il est déjà présent dans `app/layout.tsx`.

4. **Safe areas CSS** : Les styles CSS pour les safe areas sont déjà en place dans `app/globals.css` et `app/layout.tsx`.

## 🔍 Vérifications

- [ ] Plugin `@capacitor/status-bar` installé
- [ ] `npx cap sync ios` exécuté sans erreur
- [ ] `npx cap sync android` exécuté sans erreur
- [ ] Build iOS réussi dans Xcode
- [ ] Build Android réussi dans Android Studio
- [ ] Test sur iPhone réel : pas de bandes blanches
- [ ] Test sur Android réel : pas de bandes blanches
- [ ] Le dégradé s'étend bien dans les safe areas


