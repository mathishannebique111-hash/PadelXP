import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getBadges, type PlayerStats } from "@/lib/badges";
import BadgesUnlockNotifier from "./BadgesUnlockNotifier";
import LevelUpNotifier from "./LevelUpNotifier";
import TierBadge from "./TierBadge";

// Créer un client admin pour bypass RLS dans les requêtes critiques
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export default async function PlayerSummary({ profileId }: { profileId: string }) {
  const supabase = createClient();
  
  // Récupérer le club_id ET les points de challenges du joueur (utiliser admin pour bypass RLS)
  const { data: playerProfile } = await supabaseAdmin
    .from("profiles")
    .select("club_id, points")
    .eq("id", profileId)
    .maybeSingle();
  
  const playerClubId = playerProfile?.club_id || null;
  const challengePoints = playerProfile?.points || 0;
  
  console.log(`[PlayerSummary] Player ${profileId.substring(0, 8)} - Challenge points from DB:`, challengePoints);
  console.log(`[PlayerSummary] Player profile data:`, playerProfile);
  
  // Calcule les stats globales
  // Utiliser une approche en deux étapes pour éviter les problèmes RLS
  const { data: mp, error: mpError } = await supabase
    .from("match_participants")
    .select("match_id, team")
    .eq("user_id", profileId)
    .eq("player_type", "user");
  
  if (mpError) {
    console.error("[PlayerSummary] Error fetching participants:", mpError);
  }

  let wins = 0;
  let losses = 0;
  let setsWon = 0;
  let setsLost = 0;
  let matches = 0;
  
  if (mp && mp.length) {
    const matchIds = mp.map((m: any) => m.match_id);
    console.log("[PlayerSummary] Fetching matches for player:", profileId, "Match IDs:", matchIds.length);
    
    // Si on a un club_id, filtrer les matchs pour ne garder que ceux du même club
    let validMatchIds = matchIds;
    if (playerClubId) {
      // Récupérer tous les participants de ces matchs
      const { data: allParticipants } = await supabase
        .from("match_participants")
        .select("match_id, user_id, player_type")
        .in("match_id", matchIds)
        .eq("player_type", "user");
      
      // Récupérer les profils pour vérifier les club_id - utiliser admin pour bypass RLS
      const participantUserIds = [...new Set((allParticipants || []).map((p: any) => p.user_id).filter(Boolean))];
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, club_id")
        .in("id", participantUserIds)
        .eq("club_id", playerClubId);
      
      const validUserIds = new Set((profiles || []).map((p: any) => p.id));
      
      // Filtrer les matchs : ne garder que ceux où tous les participants users appartiennent au même club
      validMatchIds = matchIds.filter(matchId => {
        const participants = (allParticipants || []).filter((p: any) => p.match_id === matchId);
        return participants.every((p: any) => 
          p.player_type === "guest" || validUserIds.has(p.user_id)
        );
      });
    }
    
    const { data: ms, error: msError } = await supabase
      .from("matches")
      .select("id, winner_team_id, team1_id, team2_id, score_team1, score_team2")
      .in("id", validMatchIds);
    
    if (msError) {
      console.error("[PlayerSummary] Error fetching matches:", msError);
    }
    
    const byId: Record<string, { winner_team: number; score_team1: number; score_team2: number }> = {};
    (ms || []).forEach((m: any) => {
      if (!m.winner_team_id || !m.team1_id || !m.team2_id) {
        console.warn("[PlayerSummary] Skipping match without winner_team_id:", m.id);
        return;
      }
      
      const winner_team = m.winner_team_id === m.team1_id ? 1 : 2;
      byId[m.id] = { 
        winner_team, 
        score_team1: m.score_team1 || 0, 
        score_team2: m.score_team2 || 0 
      };
    });
    
    // Filtrer mp pour ne garder que les matchs valides
    const filteredMp = playerClubId 
      ? mp.filter((p: any) => validMatchIds.includes(p.match_id))
      : mp;
    
    filteredMp.forEach((p: any) => {
      const match = byId[p.match_id];
      if (!match) return;
      
      matches += 1;
      
      const won = match.winner_team === p.team;
      if (won) wins += 1;
      else losses += 1;
      
      if (p.team === 1) {
        setsWon += match.score_team1 || 0;
        setsLost += match.score_team2 || 0;
      } else {
        setsWon += match.score_team2 || 0;
        setsLost += match.score_team1 || 0;
      }
    });
    
    console.log("[PlayerSummary] Player stats calculated:", { matches, wins, losses, setsWon, setsLost });
  }
  // Calcul du bonus XP pour le premier avis ( +10 XP une seule fois )
  let reviewsBonus = 0;
  {
    const { count: myReviewsCount } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profileId);
    if ((myReviewsCount || 0) > 0) {
      reviewsBonus = 10;
    }
  }

  // Points: 10 par victoire, 3 par défaite + bonus premier avis + points de challenges
  const matchPoints = wins * 10 + losses * 3 + reviewsBonus;
  const points = matchPoints + challengePoints;

  function tierForPoints(p: number) {
    if (p >= 500) return { label: "Champion", className: "bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white" };
    if (p >= 300) return { label: "Diamant", className: "bg-gradient-to-r from-cyan-500 to-blue-500 text-white" };
    if (p >= 200) return { label: "Or", className: "bg-gradient-to-r from-amber-400 to-yellow-500 text-white" };
    if (p >= 100) return { label: "Argent", className: "bg-gradient-to-r from-zinc-300 to-zinc-400 text-zinc-800" };
    return { label: "Bronze", className: "bg-gradient-to-r from-orange-400 to-orange-600 text-white" };
  }
  const tier = tierForPoints(points);

  // Calculer la série de victoires consécutives
  let streak = 0;
  if (mp && mp.length) {
    const matchIds = mp.map((m: any) => m.match_id);
    
    const { data: ms, error: msStreakError } = await supabase
      .from("matches")
      .select("id, winner_team_id, team1_id, team2_id, created_at")
      .in("id", matchIds)
      .order("created_at", { ascending: false });
    
    if (msStreakError) {
      console.error("[PlayerSummary] Error fetching matches for streak:", msStreakError);
    }
    
    if (ms && ms.length > 0) {
      const byId: Record<string, number> = {};
      ms.forEach((m: any) => {
        // Ignorer les matchs sans winner_team_id
        if (!m.winner_team_id || !m.team1_id || !m.team2_id) return;
        
        // Déterminer winner_team (1 ou 2) à partir de winner_team_id
        const winner_team = m.winner_team_id === m.team1_id ? 1 : 2;
        byId[m.id] = winner_team;
      });
      
      let currentStreak = 0;
      for (const p of mp.sort((a: any, b: any) => {
        const aMatch = ms.find((m: any) => m.id === a.match_id);
        const bMatch = ms.find((m: any) => m.id === b.match_id);
        return (bMatch?.created_at || "").localeCompare(aMatch?.created_at || "");
      })) {
        // Ignorer les matchs sans données valides
        if (!byId[p.match_id]) continue;
        
        const won = byId[p.match_id] === p.team;
        if (won) {
          currentStreak++;
          if (currentStreak > streak) streak = currentStreak;
        } else {
          currentStreak = 0;
        }
      }
    }
  }
  
  console.log("[PlayerSummary] Streak calculated:", streak);

  // Calcul des badges dynamiques basés sur les stats
  const stats: PlayerStats = { wins, losses, matches, points, streak };
  const computedBadges = getBadges(stats);

  return (
    <div className="rounded-2xl border p-6 text-white shadow-[0_30px_70px_rgba(4,16,46,0.5)]" style={{
      background: "linear-gradient(135deg, rgba(8,30,78,0.88) 0%, rgba(4,16,46,0.92) 100%)",
      borderColor: "rgba(72,128,210,0.55)"
    }}>
      <div>
        {/* Notifier client pour les changements de niveau */}
        <LevelUpNotifier tier={tier.label} />
        {/* Notifier client pour célébrer les nouveaux badges */}
        <BadgesUnlockNotifier obtained={computedBadges} />
        {/* Badge niveau en haut et visible */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/90">Vos statistiques</h3>
          <TierBadge tier={tier.label as "Bronze" | "Argent" | "Or" | "Diamant" | "Champion"} size="md" />
        </div>
        
        {/* Grid 2x3 compact pour les stats */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
            <div className="text-xs uppercase tracking-[0.25em] text-gray-600 mb-1">Points totaux</div>
            <div className="text-2xl font-bold text-gray-900 tabular-nums">{points}</div>
            {challengePoints > 0 && (
              <div className="mt-1 text-[10px] text-amber-600 font-medium">
                +{challengePoints} challenges 🏆
              </div>
            )}
          </div>
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
            <div className="text-xs uppercase tracking-[0.25em] text-gray-600 mb-1">Matchs</div>
            <div className="text-2xl font-bold text-gray-900 tabular-nums">{matches}</div>
          </div>
          <div className="rounded-lg border border-emerald-300/50 bg-emerald-100 px-3 py-2">
            <div className="text-xs uppercase tracking-[0.25em] text-gray-600 mb-1">Victoires</div>
            <div className="text-2xl font-bold text-gray-900 tabular-nums">{wins}</div>
          </div>
          <div className="rounded-lg border border-rose-300/50 bg-rose-200 px-3 py-2">
            <div className="text-xs uppercase tracking-[0.25em] text-gray-600 mb-1">Défaites</div>
            <div className="text-2xl font-bold text-gray-900 tabular-nums">{losses}</div>
          </div>
          <div className="rounded-lg border border-emerald-300/50 bg-emerald-100 px-3 py-2">
            <div className="text-xs uppercase tracking-[0.25em] text-gray-600 mb-1">Sets gagnés</div>
            <div className="text-2xl font-bold text-gray-900 tabular-nums">{setsWon}</div>
          </div>
          <div className="rounded-lg border border-rose-300/50 bg-rose-200 px-3 py-2">
            <div className="text-xs uppercase tracking-[0.25em] text-gray-600 mb-1">Sets perdus</div>
            <div className="text-2xl font-bold text-gray-900 tabular-nums">{setsLost}</div>
          </div>
        </div>
        
        {/* Badges en bas */}
        {computedBadges.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="mb-2 text-xs uppercase tracking-[0.25em] text-white">Badges</div>
            <div className="flex flex-wrap gap-2">
              {computedBadges.map((b, idx) => (
                <span
                  key={idx}
                  title={b.title}
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-gray-900 bg-white relative overflow-hidden"
                  style={{
                    "--shimmer": "rgba(255, 255, 255, 0.5)",
                    "--shimmer-duration": "3s",
                  } as React.CSSProperties}
                >
                  <span className="shimmer-layer" />
                  <span className="relative z-10">
                    {b.icon} {b.title}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
