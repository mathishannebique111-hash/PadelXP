import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { filterMatchesByDailyLimit } from '@/lib/utils/match-limit-utils';
import { MAX_MATCHES_PER_DAY } from '@/lib/match-constants';
import { calculatePointsForMultiplePlayers } from '@/lib/utils/boost-points-utils';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET() {
  try {
    console.log('🔍 Fetching full leaderboard');
    
    // Récupérer le club_id de l'utilisateur authentifié
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("club_id")
      .eq("id", user.id)
      .maybeSingle();
    
    const userClubId = userProfile?.club_id || null;
    // NE PLUS bloquer si pas de club_id - retourner un leaderboard vide au lieu de 403
    // Cela permet aux nouveaux joueurs d'accéder à l'interface même sans club_id
    if (!userClubId) {
      console.log('ℹ️ User without club fetching leaderboard - returning empty array');
      return NextResponse.json({ leaderboard: [] }, { status: 200 });
    }

    // Calculer le leaderboard depuis les matchs
    // Étape 1: Récupérer tous les participants users uniquement
    const { data: participantsData, error: participantsError } = await supabaseAdmin
      .from("match_participants")
      .select("user_id, player_type, guest_player_id, team, match_id")
      .eq("player_type", "user");

    if (participantsError) {
      console.error('❌ Error fetching participants:', participantsError);
      return NextResponse.json({ error: participantsError.message }, { status: 500 });
    }

    if (!participantsData || participantsData.length === 0) {
      return NextResponse.json({ leaderboard: [] });
    }

    // Étape 2: Récupérer tous les matchs uniques
    const uniqueMatchIds = [...new Set(participantsData.map((p: any) => p.match_id))];
    
    const { data: matchesData, error: matchesError } = await supabaseAdmin
      .from("matches")
      .select("id, winner_team_id, team1_id, team2_id, played_at")
      .in("id", uniqueMatchIds);

    if (matchesError) {
      console.error('❌ Error fetching matches:', matchesError);
      return NextResponse.json({ error: matchesError.message }, { status: 500 });
    }

    // Créer un map des matchs
    const matchesMap = new Map<string, { winner_team_id: string; team1_id: string; team2_id: string }>();
    (matchesData || []).forEach((m: any) => {
      if (m.winner_team_id && m.team1_id && m.team2_id) {
        matchesMap.set(m.id, {
          winner_team_id: m.winner_team_id,
          team1_id: m.team1_id,
          team2_id: m.team2_id,
        });
      }
    });

    // Étape 3: Filtrer les participants par club_id si disponible
    let filteredParticipants = participantsData;
    if (userClubId) {
      const participantUserIds = [...new Set(participantsData.map((p: any) => p.user_id).filter(Boolean))];
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, club_id")
        .in("id", participantUserIds)
        .eq("club_id", userClubId);
      
      const validUserIds = new Set((profiles || []).map((p: any) => p.id));
      
      filteredParticipants = participantsData.filter((p: any) => {
        if (p.player_type === "user" && p.user_id) {
          return validUserIds.has(p.user_id);
        }
        return false;
      });
    }

    if (filteredParticipants.length === 0) {
      return NextResponse.json({ leaderboard: []       });
    }

    // Filtrer les matchs selon la limite quotidienne de 2 matchs par jour
    const validMatchIdsForPoints = filterMatchesByDailyLimit(
      filteredParticipants.filter(p => p.user_id).map(p => ({ 
        match_id: p.match_id, 
        user_id: p.user_id 
      })),
      (matchesData || []).map((m: any) => ({ 
        id: m.id, 
        played_at: m.played_at || new Date().toISOString() 
      })),
      MAX_MATCHES_PER_DAY
    );

    // Étape 4: Calculer les stats par joueur (uniquement pour les matchs valides)
    const byPlayer: Record<string, { 
      wins: number; 
      losses: number; 
      matches: number;
    }> = {};
    
    // Collecter les matchs gagnés par joueur pour le calcul de boosts
    const winMatchesByPlayer = new Map<string, Set<string>>();

    filteredParticipants.forEach((p: any) => {
      // Ignorer les matchs qui dépassent la limite quotidienne
      if (!validMatchIdsForPoints.has(p.match_id)) {
        return;
      }
      const match = matchesMap.get(p.match_id);
      if (!match) return; // Ignorer les matchs non terminés

      const playerId = p.user_id;
      if (!playerId) return;

      if (!byPlayer[playerId]) {
        byPlayer[playerId] = { wins: 0, losses: 0, matches: 0 };
        winMatchesByPlayer.set(playerId, new Set());
      }

      byPlayer[playerId].matches += 1;
      
      // Déterminer winner_team (1 ou 2)
      const winner_team = match.winner_team_id === match.team1_id ? 1 : 2;
      const win = winner_team === p.team;
      
      if (win) {
        byPlayer[playerId].wins += 1;
        // Ajouter le match à la liste des matchs gagnés
        const winMatches = winMatchesByPlayer.get(playerId);
        if (winMatches) {
          winMatches.add(p.match_id);
        }
      } else {
        byPlayer[playerId].losses += 1;
      }
    });

    // Étape 5: Récupérer les noms des joueurs
    const playerUserIds = Object.keys(byPlayer);
    let playerProfilesQuery = supabaseAdmin
      .from("profiles")
      .select("id, display_name, first_name, last_name")
      .in("id", playerUserIds);
    
    // Filtrer par club_id si disponible
    if (userClubId) {
      playerProfilesQuery = playerProfilesQuery.eq("club_id", userClubId);
    }
    
    const { data: playerProfiles, error: profilesError } = await playerProfilesQuery;

    const profilesMap = new Map<string, string>();
    if (playerProfiles) {
      playerProfiles.forEach((p: any) => {
        const name = p.first_name && p.last_name 
          ? `${p.first_name} ${p.last_name}`.trim()
          : p.display_name || "Joueur";
        profilesMap.set(p.id, name);
      });
    }

    // Étape 5: Calculer le bonus review
    const { data: reviewers } = await supabaseAdmin
      .from("reviews")
      .select("user_id")
      .in("user_id", playerUserIds);

    const hasReview = new Set((reviewers || []).map((r: any) => r.user_id));

    // Étape 6: Calculer les points avec boosts
    const playersForBoostCalculation = playerUserIds.map((userId) => {
      const stats = byPlayer[userId];
      return {
        userId,
        wins: stats.wins,
        losses: stats.losses,
        winMatches: winMatchesByPlayer.get(userId) || new Set<string>(),
        bonus: hasReview.has(userId) ? 10 : 0,
        challengePoints: 0, // Pas de challenge points dans cette API
      };
    });

    const pointsWithBoosts = await calculatePointsForMultiplePlayers(playersForBoostCalculation);

    // Créer le leaderboard avec les points calculés
    const leaderboard = playerUserIds.map((userId) => {
      const stats = byPlayer[userId];
      const points = pointsWithBoosts.get(userId) || (stats.wins * 10 + stats.losses * 3 + (hasReview.has(userId) ? 10 : 0));
      const name = profilesMap.get(userId) || "Joueur";
      
      // Calculer le tier
      let tier = "Bronze";
      if (points >= 500) tier = "Champion";
      else if (points >= 300) tier = "Diamant";
      else if (points >= 200) tier = "Or";
      else if (points >= 100) tier = "Argent";

      return {
        user_id: userId,
        name: name,
        player_name: name,
        points: points,
        wins: stats.wins,
        losses: stats.losses,
        matches: stats.matches,
        tier: tier,
      };
    });

    // Trier par points
    const sortedLeaderboard = leaderboard
      .sort((a, b) => b.points - a.points || b.wins - a.wins || a.matches - b.matches);

    console.log('✅ Leaderboard calculated:', sortedLeaderboard.length, 'players');

    return NextResponse.json({ leaderboard: sortedLeaderboard });
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

