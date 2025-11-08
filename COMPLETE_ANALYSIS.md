# 🔍 Analyse complète : Références à `players_hash`

## 📋 1. TOUTES les références à `players_hash` dans le projet

### ✅ Fichiers de CODE (app/, components/, lib/) :
**AUCUNE référence trouvée** ❌

Le code TypeScript/JavaScript n'utilise **PAS** `players_hash`.

### 📄 Fichiers de DOCUMENTATION et SQL :

1. **`fix_matches_schema.sql`** (lignes 2, 7, 10, 21, 24, 33)
   - Script SQL pour créer/supprimer la colonne
   - **Non exécuté automatiquement**

2. **`SCHEMA_ANALYSIS.md`** (lignes 5, 17, 30, 45, 55, 100)
   - Documentation d'analyse
   - **Pas de code exécutable**

3. **`ANALYSE_PLAYERS_HASH.md`** (lignes 5, 42, 78, 85, 103, 115, 122, 128, 133, 138)
   - Documentation d'analyse
   - **Pas de code exécutable**

4. **`CONFIRMATION_SYSTEM.md`** (ligne 17)
   - Documentation mentionnant `players_hash`
   - **Pas de code exécutable**

5. **`ENV_SETUP.md`** (ligne 39)
   - Documentation mentionnant `players_hash`
   - **Pas de code exécutable**

6. **`create_match_confirmations_system.sql`** (lignes 113, 116, 122)
   - Script SQL pour créer la colonne
   - **Peut avoir été exécuté partiellement**

## 📋 2. Fichier COMPLET : `app/api/matches/submit/route.ts`

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const GUEST_USER_ID = "00000000-0000-0000-0000-000000000000";

export async function POST(req: Request) {
  try {
    console.log("📥 Match submission API called");
    let body;
    try {
      body = await req.json();
      console.log("📋 Request body:", { players: body.players?.length, winner: body.winner, sets: body.sets?.length });
    } catch (parseError) {
      console.error("❌ Error parsing request body:", parseError);
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }
    
    const { players, winner, sets, tieBreak } = body as {
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
  };
  
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // Gérer les erreurs de cookies silencieusement
            console.error("Error setting cookies:", error);
          }
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  console.log("👤 User auth:", user ? "authenticated" : "not authenticated", authError);
  
  if (!user) {
    console.error("❌ Unauthorized access");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Valider que nous avons exactement 4 joueurs
  console.log("🔍 Validating players:", players?.length, players);
  if (!players || players.length !== 4) {
    console.error("❌ Invalid players count:", players?.length, "Expected 4");
    return NextResponse.json({ error: `4 joueurs requis, reçu: ${players?.length || 0}` }, { status: 400 });
  }

  // Vérifier que tous les joueurs users sont uniques
  const userPlayers = players
    .filter((p) => p.player_type === "user")
    .map((p) => p.user_id);
  console.log("👥 User players:", userPlayers);
  if (userPlayers.length !== new Set(userPlayers).size) {
    console.error("❌ Duplicate user players detected");
    return NextResponse.json({ error: "Les joueurs doivent être uniques" }, { status: 400 });
  }

  // Vérifier que tous les joueurs guests sont uniques
  const guestPlayers = players
    .filter((p) => p.player_type === "guest" && p.guest_player_id)
    .map((p) => p.guest_player_id);
  console.log("👤 Guest players:", guestPlayers);
  if (guestPlayers.length !== new Set(guestPlayers).size) {
    console.error("❌ Duplicate guest players detected");
    return NextResponse.json({ error: "Les joueurs invités doivent être uniques" }, { status: 400 });
  }

  // Valider les sets
  console.log("🎾 Validating sets:", sets?.length, sets);
  if (!sets || sets.length < 2) {
    console.error("❌ Invalid sets count:", sets?.length, "Expected at least 2");
    return NextResponse.json({ error: `Au moins 2 sets requis, reçu: ${sets?.length || 0}` }, { status: 400 });
  }

  // Formater le score pour l'affichage (ex: "6-4, 6-3" ou "6-4, 6-3, 7-5")
  const scoreString = sets.map(s => `${s.team1Score}-${s.team2Score}`).join(", ") + 
    (tieBreak && tieBreak.team1Score && tieBreak.team2Score ? ` (TB: ${tieBreak.team1Score}-${tieBreak.team2Score})` : "");

  // Créer le match directement (sans système de confirmation)
  console.log("💾 Creating match with:", { winner_team: Number(winner), score: scoreString });
  const { data: match, error: e1 } = await supabase
    .from("matches")
    .insert({ 
      winner_team: Number(winner), 
      score: scoreString
      // ✅ PAS de players_hash ici
    })
    .select("id")
    .single();
  
  if (e1) {
    console.error("❌ Error creating match:", e1);
    return NextResponse.json({ error: e1.message }, { status: 400 });
  }
  
  console.log("✅ Match created:", match?.id);

  // Créer les participants avec le nouveau format
  const participants = players.map((player, index) => ({
    match_id: match.id,
    user_id: player.user_id,
    player_type: player.player_type,
    guest_player_id: player.guest_player_id,
    team: index < 2 ? 1 : 2, // Les 2 premiers sont l'équipe 1, les 2 suivants l'équipe 2
  }));
  
  console.log("👥 Creating participants:", participants.length);

  const { error: e2 } = await supabase.from("match_participants").insert(participants);
  if (e2) {
    console.error("❌ Error creating participants:", e2);
    return NextResponse.json({ error: e2.message }, { status: 400 });
  }

  console.log("✅ Match submission completed successfully");
  return NextResponse.json({ 
    success: true, 
    message: "Match enregistré avec succès.",
    matchId: match.id 
  });
  } catch (error) {
    console.error("❌ Unexpected error in match submission:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

## 📋 3. Types/Interfaces de Match

### ❌ Aucune interface TypeScript pour `Match` trouvée

### Types trouvés :

1. **`lib/types_db.ts`** : 
   - Contient seulement `players` table, pas `matches`

2. **`lib/types.ts`** :
   - `LeaderboardEntry`
   - `UserProfile`
   - `Badge`
   - **Pas de type `Match`**

3. **`components/MatchForm.tsx`** :
   - Schema Zod pour validation (lignes 9-20)
   - **Aucune référence à `players_hash`**

## 🔍 DIAGNOSTIC

### Le code TypeScript est PROPRE ✅

Le code n'utilise **PAS** `players_hash`. L'erreur vient probablement de :

1. **Un trigger PostgreSQL** qui essaie d'accéder à `players_hash`
2. **Une fonction SQL** qui calcule ou vérifie `players_hash`
3. **Un cache Supabase** qui pense que `players_hash` devrait exister
4. **Une vue matérialisée** qui inclut `players_hash`

## ✅ SOLUTION

### Option 1 : Vérifier les triggers SQL (RECOMMANDÉ)

Exécutez dans Supabase SQL Editor :

```sql
-- Vérifier les triggers sur matches
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'matches';

-- Vérifier les fonctions qui référencent players_hash
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_definition LIKE '%players_hash%'
  AND routine_schema = 'public';
```

### Option 2 : Créer la colonne (SOLUTION IMMÉDIATE)

```sql
-- Créer players_hash si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'matches' 
    AND column_name = 'players_hash'
  ) THEN
    ALTER TABLE public.matches 
    ADD COLUMN players_hash TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_matches_players_hash ON public.matches(players_hash);
```

### Option 3 : Supprimer les triggers (si trouvés)

Si un trigger essaie d'utiliser `players_hash`, il faut soit :
- Le modifier pour ne plus utiliser `players_hash`
- Ou créer la colonne (Option 2)

## 🎯 CONCLUSION

**Le code TypeScript est correct** - il n'utilise pas `players_hash`.

**Le problème vient de Supabase (trigger/fonction SQL)**.

**Action immédiate :** Exécutez le script SQL de l'Option 2 pour créer la colonne.

