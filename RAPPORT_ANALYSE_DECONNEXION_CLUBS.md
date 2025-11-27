# 🔴 RAPPORT D'ANALYSE : Déconnexion des comptes CLUB après déploiement

**Date** : Analyse post-déploiement `feature/facturation-stripe-safe`  
**Problème** : Les comptes CLUB sont déconnectés à chaque navigation entre les pages du dashboard  
**Impact** : UNIQUEMENT les comptes club, les comptes joueur fonctionnent correctement

---

## 1. CONTENU COMPLET DU MIDDLEWARE

```typescript
// middleware.ts (lignes 1-334)
// [Voir le fichier complet ci-dessus]
```

---

## 2. ANALYSE STRUCTURÉE

### 🔴 PROBLÈMES CRITIQUES pour les clubs

#### **PROBLÈME #1 : Désynchronisation des cookies entre Middleware et Server Components**

**Localisation** : 
- `middleware.ts` lignes 179-195 (création du client Supabase dans le middleware)
- `lib/supabase/server.ts` lignes 5-44 (création du client Supabase dans les Server Components)

**Description** :
Le middleware utilise `req.cookies` et `res.cookies` pour gérer les cookies Supabase :
```typescript
// middleware.ts (lignes 183-193)
cookies: {
  get(name: string) {
    return req.cookies.get(name)?.value;  // ← Lit depuis la requête
  },
  set(name: string, value: string, options: any) {
    res.cookies.set(name, value, options);  // ← Écrit dans la réponse
  },
  remove(name: string, options: any) {
    res.cookies.set(name, "", { ...options, expires: new Date(0) });
  },
}
```

Mais les Server Components (comme `app/dashboard/facturation/page.tsx`) utilisent `cookies()` de Next.js :
```typescript
// lib/supabase/server.ts (lignes 12-42)
const cookieStore = await cookies();  // ← Utilise l'API Next.js cookies()
return createServerClient<Database>(url, anon, {
  cookies: {
    get(name: string) {
      return cookieStore.get(name)?.value;  // ← Lit depuis cookieStore
    },
    set(name: string, value: string, options: any) {
      try {
        cookieStore.set(name, value, options);  // ← Peut échouer silencieusement
      } catch (error) {
        // Silently fail si dans un Server Component
      }
    },
  },
});
```

**Impact** :
- Le middleware peut mettre à jour les cookies de session Supabase dans `res.cookies`
- Mais les Server Components lisent depuis `cookieStore` qui peut ne pas avoir les mêmes valeurs
- Cela crée une désynchronisation : le middleware pense que l'utilisateur est connecté, mais le Server Component ne voit pas la session

**Pourquoi UNIQUEMENT les clubs ?**
- Les pages club (`/dashboard/*`) appellent `getUserClubInfo()` qui fait plusieurs requêtes Supabase
- Chaque appel à `createClient()` dans `getUserClubInfo()` peut lire des cookies désynchronisés
- Les pages joueur (`/home`, `/player/*`) font moins d'appels à `createClient()` et sont moins affectées

---

#### **PROBLÈME #2 : Double vérification d'authentification dans `app/dashboard/facturation/page.tsx`**

**Localisation** : `app/dashboard/facturation/page.tsx` lignes 18-25

**Description** :
```typescript
export default async function BillingPage() {
  const supabase = await createClient();  // ← Crée un client avec cookies() de Next.js
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/clubs/login?next=/dashboard/facturation");  // ← REDIRECT qui peut casser la session
  }
```

**Impact** :
- Le middleware a déjà vérifié l'authentification (lignes 199-289)
- Mais la page refait une vérification avec un client Supabase qui peut avoir des cookies désynchronisés
- Si `getUser()` retourne `null` à cause de la désynchronisation, le `redirect()` est déclenché
- Ce redirect peut invalider les cookies de session, causant une déconnexion

**Pourquoi UNIQUEMENT les clubs ?**
- Les pages joueur ne font généralement pas de double vérification aussi stricte
- Les pages club vérifient aussi `getUserClubInfo()` qui peut échouer si les cookies sont désynchronisés

---

#### **PROBLÈME #3 : Gestion du cookie `last_activity` dans le middleware**

**Localisation** : `middleware.ts` lignes 234-242

**Description** :
```typescript
// Mettre à jour la dernière activité pour les routes protégées
if (isProtected) {
  res.cookies.set("last_activity", now.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 60,
    path: "/",
  });
}
```

**Impact** :
- Le middleware met à jour `last_activity` dans `res.cookies`
- Mais si les Server Components utilisent `cookies()` qui lit depuis la requête originale, ils ne voient pas cette mise à jour
- Cela peut causer des problèmes de timing où le middleware pense que l'utilisateur est actif, mais les Server Components ne le voient pas

**Pourquoi UNIQUEMENT les clubs ?**
- Les pages club font plus de requêtes et sont plus sensibles aux problèmes de timing
- Les pages joueur sont plus simples et moins affectées

---

### ⚠️ DIFFÉRENCES club vs joueur

#### **1. Routes spécifiques aux clubs**

**Routes club** :
- `/dashboard/*` (toutes les routes dashboard sont pour les clubs)
- `/clubs/*` (routes spécifiques aux clubs)

**Routes joueur** :
- `/home` (page d'accueil joueur)
- `/player/*` (routes spécifiques aux joueurs)

**Logique dans le middleware** :
- Le middleware ne fait **AUCUNE distinction** entre routes club et routes joueur
- Toutes les routes protégées sont traitées de la même manière (lignes 154-168)
- Les routes `/dashboard/*` sont considérées comme protégées (ligne 155)

---

#### **2. Vérification de la session club**

**Dans `getUserClubInfo()`** (`lib/utils/club-utils.ts` lignes 133-257) :
- Appelle `createClient()` qui utilise `cookies()` de Next.js
- Fait plusieurs requêtes Supabase :
  1. `supabase.auth.getUser()` (ligne 135)
  2. `supabase.from("profiles").select(...)` (ligne 151)
  3. `supabaseAdmin.from("club_admins").select(...)` (ligne 187)
  4. `supabaseAdmin.from("profiles").select(...)` (ligne 201)
  5. `supabaseAdmin.from("clubs").select(...)` (ligne 219)

**Impact** :
- Chaque appel à `createClient()` peut lire des cookies désynchronisés
- Si les cookies sont désynchronisés, `getUser()` peut retourner `null`
- Cela fait échouer `getUserClubInfo()`, ce qui peut déclencher un redirect

**Pourquoi UNIQUEMENT les clubs ?**
- Les pages joueur n'appellent généralement pas `getUserClubInfo()`
- Elles font moins de requêtes Supabase complexes
- Elles sont moins sensibles aux problèmes de désynchronisation

---

#### **3. Redirections spécifiques aux clubs**

**Dans `app/dashboard/facturation/page.tsx`** :
- Ligne 24 : `redirect("/clubs/login?next=/dashboard/facturation")` si `!user`
- Cette redirection est déclenchée si `getUser()` retourne `null` à cause de la désynchronisation

**Dans le middleware** :
- Lignes 219-222 : Redirection vers `/login` (route joueur) si session expirée
- Lignes 259-262 : Redirection vers `/login` (route joueur) si session expirée
- Lignes 284-287 : Redirection vers `/login` (route joueur) si pas de session

**Problème** :
- Le middleware redirige vers `/login` (route joueur) même pour les clubs
- Les pages club redirigent vers `/clubs/login` (route club)
- Cette incohérence peut causer des problèmes de session

---

### ✅ CE QUI FONCTIONNE (joueurs)

#### **1. Routes joueur plus simples**

Les pages joueur (`/home`, `/player/*`) :
- Font moins d'appels à `createClient()`
- Ne font pas de double vérification d'authentification aussi stricte
- Ne font pas de requêtes complexes comme `getUserClubInfo()`
- Sont moins sensibles aux problèmes de désynchronisation des cookies

#### **2. Middleware fonctionne pour les joueurs**

Le middleware :
- Vérifie correctement la session pour les routes joueur
- Les cookies sont correctement synchronisés pour les pages joueur simples
- Les redirections vers `/login` fonctionnent pour les joueurs

---

## 3. HYPOTHÈSE SUR LA CAUSE

### 🎯 CAUSE PROBABLE : Désynchronisation des cookies entre Middleware et Server Components

**Ligne/bloc de code problématique** :

1. **`middleware.ts` lignes 179-195** : Création du client Supabase avec `req.cookies` / `res.cookies`
2. **`lib/supabase/server.ts` lignes 12-42** : Création du client Supabase avec `cookies()` de Next.js
3. **`app/dashboard/facturation/page.tsx` lignes 18-25** : Double vérification d'authentification qui peut échouer

**Séquence du problème** :

1. Un club se connecte → Le middleware crée une session Supabase et met à jour les cookies dans `res.cookies`
2. Le club navigue vers `/dashboard/facturation` → Le middleware vérifie la session et la trouve valide
3. La page `BillingPage` s'exécute → Elle appelle `createClient()` qui utilise `cookies()` de Next.js
4. `cookies()` lit depuis la requête originale, pas depuis `res.cookies` du middleware
5. Les cookies de session Supabase ne sont pas synchronisés → `getUser()` retourne `null`
6. La page fait un `redirect("/clubs/login")` → Ce redirect invalide les cookies de session
7. Le club est déconnecté

**Pourquoi UNIQUEMENT les clubs ?**

- Les pages club appellent `getUserClubInfo()` qui fait plusieurs requêtes Supabase
- Chaque appel à `createClient()` peut lire des cookies désynchronisés
- Les pages joueur sont plus simples et moins affectées

---

## 4. RECOMMANDATIONS (SANS MODIFICATION POUR L'INSTANT)

### 🔧 Solution #1 : Utiliser le même mécanisme de cookies partout

**Option A** : Faire en sorte que les Server Components utilisent les cookies modifiés par le middleware
- Problème : Next.js 15 ne permet pas facilement de partager les cookies du middleware avec les Server Components

**Option B** : Faire en sorte que le middleware ne modifie pas les cookies Supabase
- Problème : Le middleware doit pouvoir vérifier et rafraîchir la session

**Option C** : Utiliser un mécanisme de cache partagé pour la session
- Problème : Complexe à implémenter

### 🔧 Solution #2 : Éviter la double vérification d'authentification

- Supprimer la vérification `if (!user) redirect(...)` dans `app/dashboard/facturation/page.tsx`
- Faire confiance au middleware pour l'authentification
- Gérer les cas d'erreur de manière plus gracieuse

### 🔧 Solution #3 : Améliorer la gestion des erreurs dans `getUserClubInfo()`

- Ne pas faire échouer la page si `getUserClubInfo()` échoue temporairement
- Afficher un message d'erreur gracieux au lieu de rediriger
- Retry automatique en cas d'échec temporaire

### 🔧 Solution #4 : Utiliser un client Supabase partagé

- Créer un client Supabase unique qui est partagé entre le middleware et les Server Components
- Problème : Next.js 15 ne permet pas facilement de partager des instances entre middleware et Server Components

---

## 5. PROCHAINES ÉTAPES

1. **Confirmer l'hypothèse** : Vérifier dans les logs Vercel si `getUser()` retourne `null` pour les clubs
2. **Tester la solution #2** : Supprimer la double vérification dans `app/dashboard/facturation/page.tsx`
3. **Tester la solution #3** : Améliorer la gestion des erreurs dans `getUserClubInfo()`
4. **Si nécessaire** : Implémenter une solution plus complexe pour synchroniser les cookies

---

## 6. FICHIERS CONCERNÉS

- ✅ `middleware.ts` (lignes 179-195, 234-242)
- ✅ `lib/supabase/server.ts` (lignes 5-44)
- ✅ `app/dashboard/facturation/page.tsx` (lignes 18-25)
- ✅ `lib/utils/club-utils.ts` (lignes 133-257, fonction `getUserClubInfo()`)

---

**Note** : Cette analyse est basée sur le code actuel. Des tests supplémentaires peuvent être nécessaires pour confirmer l'hypothèse.

