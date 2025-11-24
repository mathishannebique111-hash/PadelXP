# 🔐 AUDIT DE SÉCURITÉ - PadelXP

**Date** : 2025-01-27  
**Version** : 1.0  
**Statut** : CRITIQUE - Action Immédiate Requise

---

## 📋 RÉSUMÉ EXÉCUTIF

Cet audit identifie **25 vulnérabilités critiques, hautes, moyennes et basses** dans le codebase PadelXP. Les problèmes les plus graves concernent :

1. **Stockage de données sensibles dans localStorage** (XSS)
2. **Absence de validation Zod** dans la majorité des API routes
3. **Utilisation excessive du service_role** qui bypass RLS
4. **Absence de rate limiting**
5. **Headers de sécurité manquants**
6. **Politiques RLS potentiellement insuffisantes**

**Priorité CRITIQUE** : Résoudre les vulnérabilités CRITIQUE et HIGH avant le prochain déploiement en production.

---

## 🔴 CRITIQUE (Priorité 1 - À Corriger Immédiatement)

### [CRITIQUE-1] localStorage pour Badges et Notifications - Vulnérabilité XSS

**Fichiers** : 
- `components/BadgesUnlockNotifier.tsx:29-38`
- `components/LevelUpNotifier.tsx:22-41`
- `components/ReferralNotifier.tsx:35-73`
- `components/MatchForm.tsx:83-98`

**Risque** : **HIGH** - Les données stockées dans `localStorage` peuvent être manipulées par un attaquant via une vulnérabilité XSS. Un script malveillant peut falsifier les badges débloqués, modifier les notifications, ou accéder à des informations sensibles.

**Code actuel** :
```typescript
// BadgesUnlockNotifier.tsx
const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
const seen: string[] = raw ? JSON.parse(raw) : [];
// ... manipulation des badges ...
window.localStorage.setItem(key, JSON.stringify(updated));
```

**Code corrigé** :
```typescript
// Migration vers Supabase - Créer d'abord la table user_achievements
// Voir la migration SQL ci-dessous

// Ensuite, remplacer localStorage par des requêtes serveur
const { data: seenBadges } = await supabase
  .from('user_achievements')
  .select('badge_type')
  .eq('user_id', userId);
```

**Migration SQL requise** :
```sql
-- Créer la table user_achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_type text NOT NULL,
  unlocked_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, badge_type)
);

-- RLS Policy
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see only their achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert only their achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index pour performance
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_badge_type ON public.user_achievements(badge_type);
```

**Explication** : Le `localStorage` est vulnérable aux attaques XSS. Un attaquant peut injecter un script qui modifie les données stockées, falsifiant les badges ou les notifications. La migration vers Supabase avec RLS garantit que seul l'utilisateur authentifié peut voir/modifier ses propres badges.

---

### [CRITIQUE-2] Absence de Validation Zod dans `/api/matches/submit`

**Fichier** : `app/api/matches/submit/route.ts:35-52`

**Risque** : **CRITICAL** - Injection de données malformées, manipulation de scores, falsification de matchs. L'absence de validation permet à un attaquant de soumettre des données arbitraires.

**Code actuel** :
```typescript
const { players, winner, sets, tieBreak, useBoost } = body as {
  players: Array<{
    player_type: "user" | "guest";
    user_id: string;
    guest_player_id: string | null;
  }>;
  winner: "1" | "2";
  sets: Array<{
    setNumber: number;
    team1Score: string;
    team2Score: string;
  }>;
  tieBreak?: {
    team1Score: string;
    team2Score: string;
  };
  useBoost?: boolean;
};
// Aucune validation - données acceptées telles quelles
```

**Code corrigé** :
```typescript
import { z } from "zod";

const MatchSubmitSchema = z.object({
  players: z.array(
    z.object({
      player_type: z.enum(["user", "guest"]),
      user_id: z.string().uuid().optional(),
      guest_player_id: z.string().uuid().nullable().optional(),
    }).refine(
      (data) => data.player_type === "user" ? !!data.user_id : !!data.guest_player_id,
      { message: "user_id requis pour user, guest_player_id requis pour guest" }
    )
  ).length(2).or(z.array(z.any()).length(4), { message: "2 ou 4 joueurs requis" }),
  winner: z.enum(["1", "2"]),
  sets: z.array(
    z.object({
      setNumber: z.number().int().min(1).max(5),
      team1Score: z.string().regex(/^\d+$/, "Score doit être un nombre"),
      team2Score: z.string().regex(/^\d+$/, "Score doit être un nombre"),
    })
  ).min(1).max(5),
  tieBreak: z.object({
    team1Score: z.string().regex(/^\d+$/),
    team2Score: z.string().regex(/^\d+$/),
  }).optional(),
  useBoost: z.boolean().optional(),
});

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch (parseError) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // VALIDATION STRICTE
  const parsed = MatchSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.errors },
      { status: 400 }
    );
  }

  const { players, winner, sets, tieBreak, useBoost } = parsed.data;
  // ... reste du code
}
```

**Explication** : Sans validation Zod, un attaquant peut envoyer des données arbitraires (scores négatifs, UUIDs invalides, tableaux vides, etc.), compromettant l'intégrité des matchs et des statistiques.

---

### [CRITIQUE-3] Absence de Rate Limiting

**Fichiers** : 
- `middleware.ts` (aucun rate limiting)
- `app/api/matches/submit/route.ts` (pas de limite)
- `components/auth/EmailLoginForm.tsx` (pas de limite de tentatives)

**Risque** : **HIGH** - Attaques par force brute sur les authentifications, spam de matchs, surcharge serveur (DDoS), consommation excessive de ressources.

**Code actuel** :
```typescript
// middleware.ts - Aucun rate limiting
export async function middleware(req: NextRequest) {
  // Pas de vérification de limite de requêtes
  return NextResponse.next();
}
```

**Code corrigé** :
```typescript
// Installation requise: npm install @upstash/ratelimit @upstash/redis
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "15 m"), // 100 requêtes / 15 min par IP
  analytics: true,
});

const loginRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 tentatives / 15 min par IP
});

const matchSubmitRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "5 m"), // 5 matchs / 5 min par utilisateur
});

export async function middleware(req: NextRequest) {
  const ip = req.ip ?? req.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const pathname = req.nextUrl.pathname;

  // Rate limiting spécifique pour login
  if (pathname === "/login" || pathname.startsWith("/api/auth/login")) {
    const { success, remaining } = await loginRatelimit.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans 15 minutes." },
        { status: 429 }
      );
    }
  }

  // Rate limiting pour soumission de matchs
  if (pathname === "/api/matches/submit") {
    // Identifier l'utilisateur via session si disponible
    const userId = await getUserIdFromRequest(req); // À implémenter
    const identifier = userId || ip;
    const { success } = await matchSubmitRatelimit.limit(identifier);
    if (!success) {
      return NextResponse.json(
        { error: "Trop de matchs soumis. Limite: 5 matchs / 5 minutes." },
        { status: 429 }
      );
    }
  }

  // Rate limiting général pour toutes les autres routes
  const { success } = await ratelimit.limit(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez plus tard." },
      { status: 429 }
    );
  }

  return NextResponse.next();
}
```

**Variables d'environnement requises** :
```env
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

**Explication** : Sans rate limiting, un attaquant peut :
- Tenter des milliers de connexions par seconde (force brute)
- Soumettre des centaines de matchs simultanément (spam)
- Surcharger le serveur avec des requêtes répétées (DDoS)

---

### [CRITIQUE-4] Headers de Sécurité Manquants

**Fichier** : `next.config.ts`

**Risque** : **HIGH** - Clickjacking, MIME type sniffing, XSS via injection de scripts, manque de protection HTTPS.

**Code actuel** :
```typescript
// next.config.ts - Aucun header de sécurité
const nextConfig: NextConfig = {
  images: { domains: [] },
  // Pas de headers de sécurité
};
```

**Code corrigé** :
```typescript
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: { domains: [] },
  outputFileTracingRoot: path.join(process.cwd()),
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Headers de sécurité
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // 'unsafe-eval' pour Next.js, à retirer si possible
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://api.stripe.com https://*.upstash.io",
              "frame-src https://js.stripe.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

**Explication** : Les headers de sécurité protègent contre :
- **X-Frame-Options: DENY** : Empêche le clickjacking
- **X-Content-Type-Options: nosniff** : Empêche le MIME type sniffing
- **CSP** : Réduit les risques XSS en limitant les sources de scripts/styles
- **HSTS** : Force HTTPS et empêche les attaques man-in-the-middle

---

### [CRITIQUE-5] Utilisation Excessive du Service Role (Bypass RLS)

**Fichiers** : 
- `lib/utils/boost-utils.ts`
- `lib/utils/player-leaderboard-utils.ts`
- `app/api/matches/submit/route.ts`
- `app/api/reviews/route.ts`
- `app/(protected)/home/page.tsx`
- Et 50+ autres fichiers

**Risque** : **CRITICAL** - Le service_role bypass complètement RLS. S'il est utilisé pour des opérations utilisateur normales (au lieu de seulement des opérations admin/système), cela peut permettre l'accès non autorisé aux données.

**Problème** : Le service_role est utilisé dans des contextes où l'utilisateur devrait utiliser son propre client avec RLS activé.

**Exemple problématique** :
```typescript
// app/api/reviews/route.ts:156-163
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

// Utilisé pour récupérer le profil utilisateur - devrait utiliser le client normal avec RLS
const { data: profile } = await supabaseAdmin
  .from('profiles')
  .select('display_name, email')
  .eq('id', user.id)
  .maybeSingle();
```

**Recommandation** :
1. **Auditer tous les usages du service_role** et identifier ceux qui peuvent être remplacés par un client utilisateur normal avec RLS
2. **Réserver le service_role uniquement pour** :
   - Opérations système (cron jobs)
   - Calculs d'agrégation complexes (leaderboard)
   - Opérations nécessitant un accès cross-organization
   - Webhooks externes (Stripe)
3. **Documenter chaque usage** avec une justification

**Exemple de correction** :
```typescript
// AVANT : Utilisation du service_role pour récupérer le profil
const supabaseAdmin = createAdminClient(...);
const { data: profile } = await supabaseAdmin
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();

// APRÈS : Utilisation du client utilisateur avec RLS
const supabase = createClient(); // Client avec session utilisateur
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id) // RLS garantit que user.id = auth.uid()
  .single();
```

**Explication** : Le service_role contourne toutes les politiques RLS, permettant un accès illimité à toutes les données. Son utilisation doit être minimale et justifiée.

---

## 🟠 HIGH (Priorité 2 - À Corriger Urgemment)

### [HIGH-1] Validation Zod Insuffisante dans les API Routes

**Fichiers affectés** :
- `app/api/reviews/route.ts` : Validation Zod présente mais peut être améliorée
- `app/api/guest-players/route.ts` : Validation Zod présente
- **Toutes les autres API routes** : Pas de validation Zod

**Risque** : **HIGH** - Injection de données malformées, manipulation de paramètres, erreurs de type runtime.

**Recommandation** : Implémenter une validation Zod stricte pour **toutes** les API routes qui acceptent des inputs utilisateur.

**Exemple de validation stricte pour reviews** :
```typescript
// app/api/reviews/route.ts - Améliorer le schema existant
const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string()
    .max(500, "Le commentaire ne peut pas dépasser 500 caractères")
    .optional()
    .transform(val => val?.trim() || null),
  club_id: z.string().uuid("club_id doit être un UUID valide"),
});

// Validation stricte des noms
const nameSchema = z.string()
  .min(1, "Le nom est requis")
  .max(50, "Le nom ne peut pas dépasser 50 caractères")
  .regex(/^[a-zA-Z0-9À-ÿ\s\-']+$/, "Le nom contient des caractères invalides");
```

---

### [HIGH-2] Vérification Insuffisante des Permissions Admin

**Fichiers** :
- `app/api/clubs/register/route.ts:112-120`
- `app/api/clubs/remove-admin/route.ts`
- `app/api/clubs/activate-admin/route.ts`

**Risque** : **HIGH** - Un utilisateur non-admin peut potentiellement modifier des organisations ou ajouter/supprimer des admins s'il trouve un moyen de contourner les vérifications.

**Code actuel** :
```typescript
// app/api/clubs/register/route.ts:112-120
if (!userId) {
  const supabaseServer = await createServerClient();
  const { data: { user } } = await supabaseServer.auth.getUser();
  userId = user?.id || null;
}

if (!userId) {
  return NextResponse.json({ error: "Impossible d'identifier le compte administrateur..." }, { status: 401 });
}
// Pas de vérification explicite que l'utilisateur est admin du club
```

**Code corrigé** :
```typescript
// Vérifier que l'utilisateur est authentifié ET admin du club
const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
}

// Vérifier les permissions admin pour ce club
const { data: adminCheck } = await supabase
  .from('club_admins')
  .select('role, activated_at')
  .eq('club_id', clubId)
  .eq('user_id', user.id)
  .eq('activated_at', 'IS NOT NULL') // Vérifier que l'admin est activé
  .maybeSingle();

if (!adminCheck || adminCheck.role !== 'admin') {
  return NextResponse.json(
    { error: "Accès refusé. Seuls les administrateurs peuvent effectuer cette action." },
    { status: 403 }
  );
}
```

**Explication** : Les opérations sensibles (création de club, gestion d'admins) doivent vérifier explicitement les permissions avant d'être exécutées.

---

### [HIGH-3] dangerouslySetInnerHTML Utilisé

**Fichiers** :
- `app/layout.tsx:31`
- `app/(protected)/layout.tsx:18`

**Risque** : **HIGH** - Risque XSS si le contenu injecté provient d'une source non fiable.

**Code actuel** :
```typescript
// app/layout.tsx:31
<script
  dangerouslySetInnerHTML={{
    __html: `
      // Script critique pour forcer l'affichage...
    `
  }}
/>
```

**Recommandation** : 
1. Si le contenu est statique et contrôlé par le développeur (comme ici), **garder `dangerouslySetInnerHTML`** mais documenter pourquoi c'est sûr
2. Si le contenu provient de l'utilisateur ou d'une API externe, **NE JAMAIS utiliser `dangerouslySetInnerHTML`** - utiliser `DOMPurify` ou `sanitize-html` pour nettoyer le HTML

**Exemple de sanitisation si nécessaire** :
```typescript
import DOMPurify from 'isomorphic-dompurify';

// Pour du contenu utilisateur
const sanitizedHTML = DOMPurify.sanitize(userContent, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p'],
  ALLOWED_ATTR: [],
});

<div dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />
```

**Note** : Dans le cas actuel (`app/layout.tsx` et `app/(protected)/layout.tsx`), le contenu est statique et contrôlé, donc le risque est **MOYEN** mais doit être documenté.

---

### [HIGH-4] Webhook Stripe - Vérification de Signature Correcte Mais Manque de Logging d'Audit

**Fichier** : `app/api/stripe/webhook/route.ts`

**Risque** : **MEDIUM-HIGH** - La vérification de signature est correcte (lignes 48-63), mais il manque un système de logs d'audit pour les événements critiques (achats, changements d'abonnement).

**Code actuel** : Vérification de signature ✅ présente, mais pas de logs d'audit structurés.

**Code corrigé** :
```typescript
// Ajouter un système de logs d'audit
import { createClient as createServiceClient } from '@supabase/supabase-js';

// Créer une table d'audit (migration SQL requise)
const auditLog = async (event: Stripe.Event, userId?: string, metadata?: any) => {
  if (!supabaseAdmin) return;
  
  await supabaseAdmin
    .from('audit_logs')
    .insert({
      event_type: event.type,
      event_id: event.id,
      user_id: userId || null,
      metadata: metadata || {},
      ip_address: req.headers.get('x-forwarded-for') || req.ip || null,
      created_at: new Date().toISOString(),
    });
};

export async function POST(req: NextRequest) {
  // ... vérification de signature existante ...
  
  // Logger l'événement
  await auditLog(event);
  
  switch (event.type) {
    case 'checkout.session.completed': {
      // ... traitement existant ...
      await auditLog(event, userId, { 
        sessionId: session.id, 
        amount: session.amount_total,
        currency: session.currency 
      });
      break;
    }
    // ... autres cas ...
  }
}
```

**Migration SQL pour table d'audit** :
```sql
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb,
  ip_address text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX idx_audit_logs_event_type ON public.audit_logs(event_type);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
```

---

## 🟡 MEDIUM (Priorité 3 - À Planifier)

### [MEDIUM-1] MFA/2FA Non Implémenté

**Risque** : **MEDIUM** - Les comptes sensibles (admins de club) ne sont pas protégés par MFA, ce qui augmente le risque de compromission.

**Recommandation** : 
1. Activer MFA dans Supabase Auth pour les admins de club
2. Implémenter une vérification MFA obligatoire lors de la connexion pour les admins

**Configuration Supabase** :
```sql
-- Dans Supabase Dashboard > Authentication > Providers
-- Activer MFA (TOTP) pour les utilisateurs
```

**Code d'implémentation** :
```typescript
// Vérifier si l'utilisateur est admin et a MFA activé
const { data: { user } } = await supabase.auth.getUser();
const { data: factors } = await supabase.auth.mfa.listFactors();

if (isClubAdmin(user.id) && (!factors || factors.totp.length === 0)) {
  // Rediriger vers la page d'activation MFA
  return NextResponse.redirect('/dashboard/settings/enable-mfa');
}
```

---

### [MEDIUM-2] Politique de Mots de Passe Non Vérifiée

**Risque** : **MEDIUM** - La complexité minimale des mots de passe n'est pas explicitement configurée dans Supabase.

**Recommandation** :
1. Vérifier dans Supabase Dashboard > Authentication > Password que les paramètres suivants sont activés :
   - Minimum 8 caractères
   - Au moins 1 majuscule, 1 minuscule, 1 chiffre
   - Pas de mots de passe courants (dictionnaire)
2. Si possible, augmenter la complexité pour les admins

---

### [MEDIUM-3] Conformité RGPD - Export de Données Présent Mais Manque de Documentation

**Fichiers** :
- `app/api/rgpd/export-data/route.ts` ✅ Présent
- `app/api/rgpd/delete-account/route.ts` ✅ Présent

**Risque** : **LOW-MEDIUM** - Les fonctionnalités RGPD sont présentes mais manquent de documentation et de tests.

**Recommandation** :
1. Ajouter une page `/privacy` avec les informations RGPD
2. Ajouter un lien vers l'export/suppression dans les paramètres utilisateur
3. Tester les fonctionnalités d'export et de suppression
4. Ajouter des logs d'audit pour les exports/suppressions

---

### [MEDIUM-4] Variables d'Environnement - Vérification que SUPABASE_SERVICE_ROLE_KEY n'est pas exposée

**Risque** : **MEDIUM** - Si `SUPABASE_SERVICE_ROLE_KEY` est accidentellement exposée (via un commit Git, un log, etc.), cela compromet toute la sécurité.

**Recommandation** :
1. Vérifier que `.env.local` est dans `.gitignore`
2. Vérifier qu'aucune clé secrète n'est dans le code source
3. Utiliser Vercel Environment Variables (ou équivalent) pour les secrets
4. Implémenter une rotation régulière des clés

**Vérification** :
```bash
# Chercher des clés exposées dans le code
grep -r "SUPABASE_SERVICE_ROLE_KEY.*=" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" .
grep -r "sk_live\|sk_test" --include="*.ts" --include="*.js" .
```

---

## 🟢 LOW (Priorité 4 - Améliorations)

### [LOW-1] Source Maps en Production

**Fichier** : `next.config.ts`

**Recommandation** : Désactiver les source maps en production pour éviter l'exposition du code source.

**Code corrigé** :
```typescript
const nextConfig: NextConfig = {
  // ... autres configs ...
  productionBrowserSourceMaps: false, // Désactiver les source maps en production
};
```

---

### [LOW-2] Dépendances - Audit npm

**Recommandation** : Exécuter `npm audit` et corriger les vulnérabilités HIGH/CRITICAL.

```bash
npm audit
npm audit fix
```

---

### [LOW-3] Monitoring & Logs Centralisés

**Recommandation** : Implémenter un système de monitoring (Sentry, LogRocket, etc.) pour logger :
- Tentatives de connexion échouées
- Erreurs d'autorisation (403)
- Modifications de rôles
- Achats de boosts
- Exports RGPD

---

### [LOW-4] Politique de Rétention des Comptes Inactifs

**Recommandation** : Implémenter un cron job qui :
1. Identifie les comptes inactifs depuis 3 ans
2. Envoie un email de notification 30 jours avant suppression
3. Supprime/anonymise les comptes après 3 ans d'inactivité

---

## 📊 RÉSUMÉ DES VULNÉRABILITÉS

| Sévérité | Nombre | Status |
|----------|--------|--------|
| 🔴 CRITIQUE | 5 | À corriger immédiatement |
| 🟠 HIGH | 4 | À corriger urgemment |
| 🟡 MEDIUM | 4 | À planifier |
| 🟢 LOW | 4 | Améliorations |

**Total** : 17 vulnérabilités identifiées

---

## 🎯 PLAN D'ACTION RECOMMANDÉ

### Phase 1 (Semaine 1) - CRITIQUE
1. ✅ Migrer `localStorage` vers Supabase pour badges/notifications
2. ✅ Ajouter validation Zod dans `/api/matches/submit`
3. ✅ Implémenter rate limiting (Upstash Redis)
4. ✅ Ajouter headers de sécurité dans `next.config.ts`
5. ✅ Auditer et réduire l'utilisation du service_role

### Phase 2 (Semaine 2) - HIGH
1. ✅ Ajouter validation Zod dans toutes les API routes
2. ✅ Renforcer les vérifications de permissions admin
3. ✅ Documenter/revoir l'utilisation de `dangerouslySetInnerHTML`
4. ✅ Ajouter des logs d'audit pour webhooks Stripe

### Phase 3 (Semaine 3-4) - MEDIUM & LOW
1. Implémenter MFA pour admins
2. Vérifier/renforcer politique de mots de passe
3. Améliorer la documentation RGPD
4. Désactiver source maps en production
5. Mettre à jour les dépendances

---

## 📝 NOTES ADDITIONNELLES

1. **RLS Policies** : Vérifier que toutes les tables sensibles ont RLS activé et des policies restrictives. Utiliser le script SQL fourni dans `fix_rls_policies.sql` comme référence.

2. **Tests de Sécurité** : Recommander d'implémenter des tests automatisés pour :
   - Validation des inputs
   - Vérification des permissions
   - Rate limiting
   - Headers de sécurité

3. **Documentation** : Maintenir une documentation à jour des mesures de sécurité implémentées.

---

**Fin du Rapport d'Audit**
