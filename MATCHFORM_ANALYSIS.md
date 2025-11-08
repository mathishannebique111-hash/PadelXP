# 🔍 Analyse complète : MatchForm.tsx onSubmit (lignes 300-370)

## 📋 1. Code complet de la fonction onSubmit (lignes 300-370)

```typescript
// Lignes 294-311 : Validation des sets
const setsErrors: Record<string, string> = {};
sets.forEach((set, index) => {
  if (!set.team1Score.trim()) {
    setsErrors[`set${set.setNumber}_team1`] = `Score équipe 1 requis pour le set ${set.setNumber}`;
  }
  if (!set.team2Score.trim()) {
    setsErrors[`set${set.setNumber}_team2`] = `Score équipe 2 requis pour le set ${set.setNumber}`;
  }
});

if (Object.keys(setsErrors).length > 0) {
  console.error("❌ Sets validation errors:", setsErrors);
  setErrors(setsErrors);
  setLoading(false);
  return;
}

console.log("✅ Sets validated successfully");

// Lignes 315-322 : Vérification des scores valides
const validSets = sets.filter(set => set.team1Score.trim() && set.team2Score.trim());
if (validSets.length !== sets.length) {
  console.error("❌ Some sets have empty scores");
  setErrors({ partnerName: "Veuillez remplir tous les scores des sets" });
  setLoading(false);
  return;
}

// Lignes 324-348 : Préparation et envoi des données
const payload = {
  players,
  winner,
  sets,
  tieBreak: hasTieBreak && tieBreak.team1Score && tieBreak.team2Score ? tieBreak : undefined,
};

console.log("📤 Données envoyées à l'API:", JSON.stringify(payload, null, 2));
console.log("📤 Structure détaillée:", {
  playersCount: players.length,
  players: players.map(p => ({
    player_type: p.player_type,
    user_id: p.user_id,
    guest_player_id: p.guest_player_id,
  })),
  winner,
  setsCount: sets.length,
  sets: sets.map(s => ({
    setNumber: s.setNumber,
    team1Score: s.team1Score,
    team2Score: s.team2Score,
  })),
  tieBreak: payload.tieBreak,
});

const res = await fetch("/api/matches/submit", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: 'include',
  body: JSON.stringify(payload),
});

// Lignes 357-370 : Gestion de la réponse
console.log("📥 Response status:", res.status, res.statusText);

if (res.ok) {
  const data = await res.json();
  console.log("✅ Match submitted successfully:", data);
  setShowSuccess(true);
  setLoading(false);
  
  setTimeout(() => {
    console.log("🔄 Redirecting to match history...");
    window.location.href = "/matches/history";
  }, 2000);
} else {
  let errorMessage = "Erreur lors de l'enregistrement";
  try {
    const errorData = await res.json();
    console.log("🔍 Error data complet:", JSON.stringify(errorData, null, 2));
    console.error("❌ Match submission failed:", res.status, errorData);
    errorMessage = errorData?.error || errorData?.message || `Erreur ${res.status}: ${res.statusText}`;
  } catch (parseError) {
    console.error("❌ Failed to parse error response:", parseError);
    errorMessage = `Erreur ${res.status}: ${res.statusText || "Erreur serveur"}`;
  }
  setErrors({ partnerName: errorMessage });
  setLoading(false);
}
```

## 📋 2. Structure de données envoyée au fetch

### Données envoyées depuis MatchForm.tsx :

```json
{
  "players": [
    {
      "player_type": "user",
      "user_id": "uuid-du-joueur-1",
      "guest_player_id": null
    },
    {
      "player_type": "user" | "guest",
      "user_id": "uuid-du-joueur-2" | "random-uuid-pour-guest",
      "guest_player_id": null | "uuid-guest"
    },
    {
      "player_type": "user" | "guest",
      "user_id": "uuid-du-joueur-3" | "random-uuid-pour-guest",
      "guest_player_id": null | "uuid-guest"
    },
    {
      "player_type": "user" | "guest",
      "user_id": "uuid-du-joueur-4" | "random-uuid-pour-guest",
      "guest_player_id": null | "uuid-guest"
    }
  ],
  "winner": "1" | "2",
  "sets": [
    {
      "setNumber": 1,
      "team1Score": "6",
      "team2Score": "4"
    },
    {
      "setNumber": 2,
      "team1Score": "6",
      "team2Score": "3"
    }
  ],
  "tieBreak": {
    "team1Score": "7",
    "team2Score": "5"
  } | undefined
}
```

## 📋 3. Structure actuelle utilisée dans l'API (app/api/matches/submit/route.ts)

### Données insérées dans la table `matches` :

```typescript
{
  winner_team: Number(winner),  // 1 ou 2 (integer)
  score: "6-4, 6-3"            // String formaté
}
```

### Structure actuelle de la table `matches` (basée sur le code) :

- `id` (UUID, PRIMARY KEY, auto-généré)
- `winner_team` (INTEGER, 1 ou 2)
- `score` (TEXT ou VARCHAR, format: "6-4, 6-3")
- `created_at` (TIMESTAMPTZ, auto-généré)

### Structure alternative mentionnée (à vérifier dans Supabase) :

Si la table `matches` attend réellement :
- `team1_id` (UUID, NOT NULL)
- `team2_id` (UUID, NOT NULL)
- `winner_team_id` (UUID, nullable)
- `score_team1` (INTEGER)
- `score_team2` (INTEGER)
- `played_at` (TIMESTAMP)

## 🔍 DIAGNOSTIC

**Le code actuel utilise :**
- `winner_team: Number(winner)` → attend INTEGER (1 ou 2)
- `score: scoreString` → attend TEXT

**Si Supabase attend la structure alternative :**
- Il faudrait créer des équipes (teams) d'abord
- Ou utiliser `match_participants` pour identifier les équipes

## ✅ SOLUTION PROPOSÉE

Les logs ajoutés vont maintenant afficher :
1. **Frontend** : Les données exactes envoyées à l'API
2. **Backend** : Les données exactes insérées dans Supabase
3. **Erreur complète** : Le message d'erreur détaillé de Supabase

**Prochaines étapes :**
1. Tester l'enregistrement d'un match
2. Vérifier les logs dans la console du navigateur
3. Vérifier les logs du serveur (terminal)
4. Analyser le message d'erreur complet de Supabase

**Si l'erreur persiste :**
- Le message d'erreur de Supabase indiquera exactement quelle colonne manque ou est incorrecte
- On pourra alors adapter le code en fonction du schéma réel

