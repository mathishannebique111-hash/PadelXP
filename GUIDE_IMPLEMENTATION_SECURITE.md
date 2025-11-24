# 🔧 GUIDE D'IMPLÉMENTATION DES CORRECTIONS DE SÉCURITÉ

Ce guide fournit des instructions étape par étape pour implémenter les corrections de sécurité identifiées dans l'audit.

---

## 📋 CHECKLIST D'IMPLÉMENTATION

### Phase 1 - Corrections Critiques (À faire IMMÉDIATEMENT)

- [ ] **CRITIQUE-1** : Migrer badges/notifications de localStorage vers Supabase
- [ ] **CRITIQUE-2** : Réduire l'utilisation de SERVICE_ROLE_KEY
- [ ] **CRITIQUE-3** : Ajouter validation Zod complète
- [ ] **CRITIQUE-4** : Ajouter headers de sécurité
- [ ] **CRITIQUE-5** : Implémenter rate limiting

---

## 🚀 ÉTAPES D'IMPLÉMENTATION

### Étape 1 : Headers de sécurité (CRITIQUE-4)

**Temps estimé** : 15 minutes

1. Ouvrir `next.config.ts`
2. Ajouter la fonction `headers()` comme décrit dans le rapport d'audit
3. Tester : Vérifier les headers avec `curl -I https://votre-domaine.com`

**Fichier modifié** : `next.config.ts`

---

### Étape 2 : Rate Limiting (CRITIQUE-5)

**Temps estimé** : 1-2 heures

#### 2.1 Installer les dépendances

```bash
npm install @upstash/ratelimit @upstash/redis
```

#### 2.2 Créer un compte Upstash

1. Aller sur https://upstash.com
2. Créer un compte (gratuit pour commencer)
3. Créer une nouvelle base Redis
4. Copier les credentials :
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

#### 2.3 Ajouter les variables d'environnement

Ajouter dans `.env.local` et Vercel :

```env
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

#### 2.4 Utiliser le rate limiting

Le fichier `lib/rate-limit.ts` est déjà créé. Utiliser dans vos routes API :

```typescript
// Exemple dans app/api/matches/submit/route.ts
import { matchSubmissionRateLimit, getClientIP, checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  // ... auth check ...
  
  // Rate limiting
  const ip = getClientIP(req);
  const identifier = `${ip}:${user.id}`;
  const rateLimitResult = await checkRateLimit(matchSubmissionRateLimit, identifier);
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Veuillez patienter quelques minutes.' },
      { status: 429 }
    );
  }
  
  // Continuer le traitement...
}
```

**Fichiers à modifier** :
- `app/api/matches/submit/route.ts`
- `components/auth/EmailLoginForm.tsx` (pour login)
- `app/api/reviews/route.ts` (pour reviews)

---

### Étape 3 : Migration badges/notifications (CRITIQUE-1)

**Temps estimé** : 2-3 heures

#### 3.1 Exécuter la migration SQL

1. Aller dans Supabase Dashboard > SQL Editor
2. Copier-coller le contenu de `lib/supabase/migrations/create_user_achievements_table.sql`
3. Exécuter la migration

#### 3.2 Créer une API route pour gérer les achievements

```typescript
// app/api/achievements/check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasUserSeenAchievement } from '@/lib/utils/achievements-utils';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { type, key } = await req.json();
  const seen = await hasUserSeenAchievement(user.id, type, key);
  
  return NextResponse.json({ seen });
}
```

#### 3.3 Modifier BadgesUnlockNotifier.tsx

```typescript
// Remplacer localStorage par des appels API
const checkSeenBadges = async (badgeKeys: string[]) => {
  const response = await fetch('/api/achievements/check-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      achievements: badgeKeys.map(key => ({ type: 'badge', key })),
    }),
  });
  
  const { seen } = await response.json();
  return seen;
};
```

**Fichiers à modifier** :
- `components/BadgesUnlockNotifier.tsx`
- `components/LevelUpNotifier.tsx`
- `components/ReferralNotifier.tsx`

---

### Étape 4 : Validation Zod complète (CRITIQUE-3)

**Temps estimé** : 3-4 heures

#### 4.1 Créer des schémas Zod pour chaque endpoint

Créer un dossier `lib/schemas/` avec :

```typescript
// lib/schemas/match-schema.ts
import { z } from 'zod';

export const MatchSubmitSchema = z.object({
  players: z.array(z.object({
    player_type: z.enum(['user', 'guest']),
    user_id: z.string().uuid().optional(),
    guest_player_id: z.string().uuid().nullable().optional(),
  })).length(4),
  winner: z.enum(['1', '2']),
  sets: z.array(z.object({
    setNumber: z.number().int().min(1).max(3),
    team1Score: z.string().regex(/^\d+$/),
    team2Score: z.string().regex(/^\d+$/),
  })).min(1).max(3),
  tieBreak: z.object({
    team1Score: z.string().regex(/^\d+$/),
    team2Score: z.string().regex(/^\d+$/),
  }).optional(),
  useBoost: z.boolean().optional(),
});
```

#### 4.2 Appliquer les schémas dans les routes API

```typescript
// app/api/matches/submit/route.ts
import { MatchSubmitSchema } from '@/lib/schemas/match-schema';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = MatchSubmitSchema.parse(body);
    // Utiliser validated au lieu de body
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    throw error;
  }
}
```

**Endpoints à sécuriser** :
- `app/api/matches/submit/route.ts`
- `app/api/player/attach/route.ts`
- `app/api/reviews/route.ts` (déjà partiellement fait)
- Tous les autres endpoints POST/PUT

---

### Étape 5 : Réduction SERVICE_ROLE_KEY (CRITIQUE-2)

**Temps estimé** : 1-2 jours (audit complet nécessaire)

#### 5.1 Audit des usages

Créer un script pour lister tous les usages :

```bash
grep -r "SERVICE_ROLE_KEY\|supabaseAdmin\|createServiceClient" --include="*.ts" --include="*.tsx" . | wc -l
```

#### 5.2 Catégoriser les usages

**Usages légitimes** (à conserver) :
- Webhooks Stripe (validés)
- Calculs de leaderboard (agrégations)
- Migrations/backfills

**Usages à remplacer** :
- Lecture de profils (utiliser client authentifié avec RLS)
- Vérifications d'autorisation (utiliser RLS)
- Opérations utilisateur normales

#### 5.3 Remplacer progressivement

Pour chaque usage non légitime :

1. Identifier la requête
2. Vérifier que RLS est activé sur la table
3. Remplacer par un client authentifié
4. Tester que ça fonctionne toujours
5. Supprimer l'usage de service_role

**Exemple** :

```typescript
// ❌ AVANT
const { data } = await supabaseAdmin
  .from('profiles')
  .select('*')
  .eq('id', userId);

// ✅ APRÈS
const supabase = await createClient();
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId); // RLS vérifie automatiquement
```

---

## 🔍 VÉRIFICATIONS POST-IMPLÉMENTATION

### Checklist de test

- [ ] Les headers de sécurité sont présents (vérifier avec `curl -I`)
- [ ] Le rate limiting bloque après 5 tentatives de login
- [ ] Les badges sont stockés en base (vérifier table `user_achievements`)
- [ ] La validation Zod rejette les données invalides
- [ ] Les endpoints API utilisent le client authentifié (pas service_role sauf cas légitimes)

### Tests de sécurité

```bash
# Test rate limiting
for i in {1..10}; do
  curl -X POST https://votre-domaine.com/api/matches/submit \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{}'
done
# Doit retourner 429 après 5 requêtes

# Test validation Zod
curl -X POST https://votre-domaine.com/api/matches/submit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}'
# Doit retourner 400 avec détails de validation

# Test headers
curl -I https://votre-domaine.com | grep -i "x-frame-options\|x-content-type-options\|strict-transport-security"
# Doit retourner les headers de sécurité
```

---

## 📚 RESSOURCES

- [Rapport d'audit complet](./AUDIT_SECURITE_PADELXP.md)
- [Documentation Upstash Rate Limiting](https://docs.upstash.com/redis/features/ratelimit)
- [Documentation Zod](https://zod.dev/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)

---

**Dernière mise à jour** : 2025-01-27

