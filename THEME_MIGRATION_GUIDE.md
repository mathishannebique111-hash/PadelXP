# Guide de Migration vers le Système de Thème

Ce document explique comment migrer progressivement les classes CSS hardcodées vers le système de variables CSS pour supporter le Light Mode.

## 🎯 Stratégie

**IMPORTANT :** Le design actuel (Dark Mode) reste inchangé par défaut. Les variables CSS sont configurées pour que le mode dark soit la valeur par défaut.

## 📋 Variables CSS Disponibles

### Couleurs de fond
- `bg-theme-page` → Remplace `bg-black` (fond général)
- `bg-theme-player-page` → Remplace `bg-[#0B1C45]` ou `bg-[#172554]` (pages joueurs)
- `bg-theme-card` → Remplace `bg-slate-900`, `bg-blue-950`, etc. (cartes)
- `bg-theme-secondary` → Remplace `bg-slate-800`, `bg-gray-800`, etc. (éléments secondaires)

### Couleurs de texte
- `text-theme-text` → Remplace `text-white` (texte principal)
- `text-theme-text-muted` → Remplace `text-slate-400`, `text-gray-400` (texte secondaire)
- `text-theme-text-secondary` → Remplace `text-gray-500`, `text-slate-500` (texte tertiaire)

### Bordures
- `border-theme-border` → Remplace `border-slate-700`, `border-gray-700`
- `border-theme-border-light` → Remplace `border-white/10`, `border-white/20`

### Accents
- `bg-theme-accent` → Remplace `bg-blue-500`, `bg-blue-600`
- `bg-theme-accent-hover` → Remplace `hover:bg-blue-600`, `hover:bg-blue-700`
- `text-theme-accent` → Remplace `text-blue-500`, `text-blue-400`

## 🔄 Remplacements Recommandés

### Exemples de remplacements courants

#### 1. Fond de page
```tsx
// AVANT
<div className="bg-black">
<div className="min-h-screen bg-black">

// APRÈS
<div className="bg-theme-page">
<div className="min-h-screen bg-theme-page">
```

#### 2. Pages joueurs
```tsx
// AVANT
<div style={{ backgroundColor: '#0B1C45' }}>
<div className="bg-[#0B1C45]">
<div className="bg-[#172554]">

// APRÈS
<div className="bg-theme-player-page">
```

#### 3. Cartes et conteneurs
```tsx
// AVANT
<div className="bg-slate-900">
<div className="bg-blue-950">
<div className="bg-gray-900">

// APRÈS
<div className="bg-theme-card">
```

#### 4. Texte
```tsx
// AVANT
<p className="text-white">Texte</p>
<span className="text-slate-400">Texte secondaire</span>
<div className="text-gray-500">Texte tertiaire</div>

// APRÈS
<p className="text-theme-text">Texte</p>
<span className="text-theme-text-muted">Texte secondaire</span>
<div className="text-theme-text-secondary">Texte tertiaire</div>
```

#### 5. Bordures
```tsx
// AVANT
<div className="border border-slate-700">
<div className="border border-white/10">

// APRÈS
<div className="border border-theme-border">
<div className="border border-theme-border-light">
```

#### 6. Boutons et accents
```tsx
// AVANT
<button className="bg-blue-500 hover:bg-blue-600 text-white">
<button className="bg-blue-600 hover:bg-blue-700">

// APRÈS
<button className="bg-theme-accent hover:bg-theme-accent-hover text-theme-text">
```

## 🚀 Migration Progressive

### Phase 1 : Composants critiques (recommandé en premier)
1. Layouts principaux (`app/layout.tsx`, `app/(protected)/layout.tsx`)
2. Composants de navigation (PlayerSidebar, NavigationBar)
3. Pages principales (home, dashboard)

### Phase 2 : Composants réutilisables
1. Cartes (Cards, Modals)
2. Formulaires
3. Boutons et inputs

### Phase 3 : Pages spécifiques
1. Pages de profil
2. Pages de matchs
3. Pages d'administration

## ⚠️ Notes Importantes

1. **Ne pas remplacer les couleurs d'accent spécifiques** (badges, tier colors, etc.) sauf si vous voulez qu'elles changent en light mode.

2. **Les couleurs hardcodées restent valides** : Si une couleur n'est pas migrée, elle continuera de fonctionner en dark mode.

3. **Tester en light mode** : Après chaque migration, tester avec le ThemeToggle pour vérifier que le light mode fonctionne correctement.

4. **Gradients et effets** : Les gradients complexes peuvent nécessiter des ajustements manuels pour le light mode.

## 🔍 Recherche de Classes à Migrer

Utilisez ces patterns pour trouver les classes à migrer :

```bash
# Rechercher bg-black
grep -r "bg-black" app/ components/

# Rechercher bg-[#0B1C45] ou bg-[#172554]
grep -r "bg-\[#" app/ components/

# Rechercher text-white
grep -r "text-white" app/ components/

# Rechercher border-slate-700
grep -r "border-slate-700\|border-gray-700" app/ components/
```

## 📝 Checklist de Migration

Pour chaque composant migré :

- [ ] Remplacé les classes de fond (`bg-black`, `bg-slate-900`, etc.)
- [ ] Remplacé les classes de texte (`text-white`, `text-slate-400`, etc.)
- [ ] Remplacé les classes de bordure (`border-slate-700`, etc.)
- [ ] Testé en dark mode (vérifier que rien n'a changé)
- [ ] Testé en light mode (vérifier la lisibilité)
- [ ] Vérifié les contrastes (accessibilité)

## 🎨 Personnalisation des Couleurs Light Mode

Si vous voulez ajuster les couleurs du light mode, modifiez les variables dans `app/globals.css` :

```css
.light-theme {
  --theme-bg-page: #ffffff; /* Ajuster si nécessaire */
  --theme-text-main: #111827; /* Ajuster si nécessaire */
  /* ... */
}
```

## 🐛 Dépannage

### Le light mode ne s'applique pas
- Vérifier que `ThemeProvider` est bien dans le layout racine
- Vérifier que la classe `light-theme` est ajoutée à `<html>` et `<body>`
- Vérifier la console pour les erreurs

### Certaines couleurs ne changent pas
- Vérifier que les classes utilisent les variables CSS (`bg-theme-*`)
- Vérifier que Tailwind a bien été recompilé après modification de `tailwind.config.ts`

### Flash de contenu non stylé (FOUC)
- Le `ThemeProvider` gère déjà cela, mais vous pouvez ajouter un script inline dans `<head>` pour appliquer le thème avant le rendu React.
