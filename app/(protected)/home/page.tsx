import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import PlayerSummary from "@/components/PlayerSummary";
import LogoutButton from "@/components/LogoutButton";
import Top3Notification from "@/components/Top3Notification";
import TierBadge from "@/components/TierBadge";
import RankBadge from "@/components/RankBadge";
import Link from "next/link";
import PageTitle from "@/components/PageTitle";
import { getUserClubInfo } from "@/lib/utils/club-utils";
import { filterMatchesByDailyLimit } from "@/lib/utils/match-limit-utils";
import { MAX_MATCHES_PER_DAY } from "@/lib/match-constants";
import { getClubLogoPublicUrl } from "@/lib/utils/club-logo-utils";
import { calculatePointsForMultiplePlayers } from "@/lib/utils/boost-points-utils";
import Image from "next/image";

export const dynamic = "force-dynamic";

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

export default async function HomePage() {
  const supabase = await createClient();
  
  // Vérifier d'abord la session pour éviter les déconnexions inattendues
  // Si une session existe mais getUser() échoue temporairement, on ne déconnecte pas
  const { data: { session } } = await supabase.auth.getSession();
  
  // Essayer d'obtenir l'utilisateur avec gestion d'erreur gracieuse
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  // Si ni session ni utilisateur, rediriger vers login (le middleware devrait déjà l'avoir fait)
  if (!user && !session) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="text-xl font-semibold">Session requise</h1>
        <a className="text-blue-600 underline" href="/login">Se connecter</a>
      </div>
    );
  }
  
  // Si une session existe mais getUser() échoue temporairement, afficher un message d'erreur temporaire
  if (session && !user && userError) {
    console.warn("[HomePage] Session exists but getUser() failed (temporary error?):", {
      errorCode: userError?.code,
      errorMessage: userError?.message,
    });
    // Afficher une page avec un message d'erreur temporaire plutôt que de rediriger
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="text-xl font-semibold">Erreur temporaire</h1>
        <p className="text-gray-600">Veuillez rafraîchir la page.</p>
        <a className="text-blue-600 underline" href="/home">Rafraîchir</a>
      </div>
    );
  }
  
  // Si pas d'utilisateur à ce stade, il y a un problème
  if (!user) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="text-xl font-semibold">Session requise</h1>
        <a className="text-blue-600 underline" href="/login">Se connecter</a>
      </div>
    );
  }

  // Ensuite récupérer le profil
  let profile: any = null;
  {
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    profile = data ?? null;
  }

  if (!profile || !profile.club_id) {
    try {
      const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name, first_name, last_name, email, club_id, club_slug")
        .eq("id", user.id)
        .maybeSingle();
      if (adminProfileError) {
        console.error("[Home] Failed to fetch profile via admin client", {
          message: adminProfileError.message,
          details: adminProfileError.details,
          hint: adminProfileError.hint,
          code: adminProfileError.code,
        });
      }
      if (adminProfile) {
        profile = { ...profile, ...adminProfile };
      }
    } catch (e) {
      console.error("[Home] Unexpected error when fetching profile via admin client", e);
    }
  }

  // Si le profil n'existe pas, essayer de le créer directement
  if (!profile && user) {
    const displayName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Joueur";
    
    // Essayer d'insérer le profil (sera bloqué par RLS si policy manquante)
    const { data: insertedData, error: insertError } = await supabase
      .from("profiles")
      .insert({ id: user.id, display_name: displayName })
      .select()
      .single();
    
    if (insertError) {
      // Si l'erreur indique que le profil existe déjà (duplicate key), on le relit
      if (insertError.code === "23505" || insertError.message?.includes("duplicate")) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
        profile = data ?? null;
      } else {
        // Autre erreur (probablement RLS bloquant l'INSERT) → fallback local
        profile = { id: user.id, display_name: displayName } as any;
      }
    } else if (insertedData) {
      profile = insertedData as any;
    }
  }

  // Sécurité: si malgré tout le profil est absent, on construit un profil minimal pour débloquer l'UI
  if (!profile) {
    const fallbackName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Joueur";
    profile = { id: user.id, display_name: fallbackName } as any;
  }

  // Récupérer le club_id de l'utilisateur pour filtrer les données
  const userClubId = profile?.club_id || null;
  
  console.log("[Home] Récupération du logo du club - userClubId:", userClubId, "profile club_id:", profile?.club_id);

  // Récupérer directement depuis la table clubs avec la même logique que la page club
  // (app/club/[slug]/page.tsx) pour garantir que le logo est toujours récupéré
  let clubName: string | null = null;
  let clubLogoUrl: string | null = null;
  
  if (userClubId) {
    console.log("[Home] Tentative de récupération du logo avec club_id:", userClubId);
    
    // Essayer d'abord avec admin client (même logique que la page club)
    if (supabaseAdmin) {
      console.log("[Home] Utilisation du client admin pour récupérer le logo");
      const { data: clubData, error: clubError } = await supabaseAdmin
        .from("clubs")
        .select("id, name, logo_url")
        .eq("id", userClubId)
        .maybeSingle();
      
      if (clubError) {
        console.error("[Home] Erreur lors de la récupération du logo (admin):", clubError);
      }
      
      if (clubData) {
        clubName = (clubData.name as string | null) ?? null;
        // Récupérer le logo_url brut (comme dans la page club)
        const rawLogoUrl = clubData.logo_url as string | null;
        console.log("[Home] Logo brut récupéré depuis clubs (admin):", { 
          clubId: userClubId, 
          rawLogoUrl, 
          clubName 
        });
        
        // Convertir le logo_url brut en URL publique
        clubLogoUrl = getClubLogoPublicUrl(rawLogoUrl);
        console.log("[Home] Logo converti en URL publique (admin):", clubLogoUrl);
      } else {
        console.log("[Home] Aucune donnée retournée par la requête admin pour club_id:", userClubId);
      }
    }
    
    // Fallback avec client standard si admin n'a pas fonctionné
    if (!clubName || !clubLogoUrl) {
      console.log("[Home] Tentative de récupération avec client standard (fallback)");
      const { data: clubData, error: clubError } = await supabase
        .from("clubs")
        .select("id, name, logo_url")
        .eq("id", userClubId)
        .maybeSingle();
      
      if (clubError) {
        console.error("[Home] Erreur lors de la récupération du logo (standard):", clubError);
      }
      
      if (clubData) {
        clubName = clubName ?? (clubData.name as string | null) ?? null;
        const rawLogoUrl = clubData.logo_url as string | null;
        console.log("[Home] Logo brut récupéré depuis clubs (standard):", { 
          clubId: userClubId, 
          rawLogoUrl, 
          clubName 
        });
        clubLogoUrl = clubLogoUrl ?? getClubLogoPublicUrl(rawLogoUrl);
        console.log("[Home] Logo converti en URL publique (standard):", clubLogoUrl);
      } else {
        console.log("[Home] Aucune donnée retournée par la requête standard pour club_id:", userClubId);
      }
    }
  } else {
    console.log("[Home] Pas de userClubId, impossible de récupérer le logo");
  }
  
  // Fallback avec getUserClubInfo si on n'a toujours pas de logo
  if (!clubName || !clubLogoUrl) {
    console.log("[Home] Fallback vers getUserClubInfo car logo non récupéré");
    const clubInfo = await getUserClubInfo();
    clubName = clubName ?? clubInfo.clubName ?? null;
    clubLogoUrl = clubLogoUrl ?? clubInfo.clubLogoUrl ?? null;
    console.log("[Home] Fallback avec getUserClubInfo:", { 
      clubName: clubInfo.clubName, 
      clubLogoUrl: clubInfo.clubLogoUrl,
      finalClubName: clubName,
      finalClubLogoUrl: clubLogoUrl
    });
  }
  
  console.log("[Home] Résultat final de la récupération du logo:", {
    clubName,
    clubLogoUrl,
    userClubId
  });

  if (!userClubId) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-blue-950 via-black to-black">
        {/* Background avec overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/30 via-black/80 to-black z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.15),transparent)] z-0" />
        
        {/* Pattern animé */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-3xl px-4 pt-20 sm:pt-10 pb-10 text-white">
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-3xl font-bold text-white">Bienvenue !</h1>
            </div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-sm text-white/70 font-normal">
            <p>Vous devez être rattaché à un club pour accéder à votre espace joueur. Vérifiez que vous avez saisi le bon code d'invitation ou contactez votre club.</p>
          </div>
        </div>
      </div>
    );
  }

  // Agrégation des stats avec users ET guests (depuis matches / match_participants)
  // Utiliser une approche en deux étapes pour éviter les problèmes RLS avec les jointures
  console.log("[Home] Fetching ALL match participants...");
  
  // Étape 1: Récupérer tous les participants sans jointure
  // IMPORTANT: Filtrer pour ne compter que les matchs où player_type = 'user'
  // (comme la vue leaderboard et PlayerSummary)
  const { data: participantsData, error: participantsError } = await supabase
    .from("match_participants")
    .select("user_id, player_type, guest_player_id, team, match_id")
    .eq("player_type", "user");
  
  if (participantsError) {
    console.error("❌ Error fetching match participants:", {
      message: participantsError.message,
      details: participantsError.details,
      hint: participantsError.hint,
      code: participantsError.code,
    });
  }
  
  console.log("[Home] Total participants fetched:", participantsData?.length || 0);
  
  // Étape 2: Récupérer tous les matchs uniques
  const allParticipants = participantsData || [];
  const uniqueMatchIds = [...new Set(allParticipants.map((p: any) => p.match_id))];
  console.log("[Home] Unique matches found:", uniqueMatchIds.length);
  
  // Récupérer les données des matchs
  const matchesMap = new Map<string, { winner_team_id: string; team1_id: string; team2_id: string; created_at: string; played_at: string }>();
  
  if (uniqueMatchIds.length > 0) {
    const { data: matchesData, error: matchesError } = await supabase
      .from("matches")
      .select("id, winner_team_id, team1_id, team2_id, created_at, played_at")
      .in("id", uniqueMatchIds);
    
    if (matchesError) {
      console.error("❌ Error fetching matches:", {
        message: matchesError.message,
        details: matchesError.details,
        hint: matchesError.hint,
        code: matchesError.code,
      });
    } else if (matchesData) {
      matchesData.forEach((m: any) => {
        matchesMap.set(m.id, {
          winner_team_id: m.winner_team_id,
          team1_id: m.team1_id,
          team2_id: m.team2_id,
          created_at: m.created_at,
          played_at: m.played_at || m.created_at, // Fallback sur created_at si played_at n'existe pas
        });
      });
      console.log("[Home] Matches loaded:", matchesData.length);
    }
  }
  
  // Filtrer les matchs selon la limite quotidienne de 2 matchs par jour pour chaque joueur
  const validMatchIdsForPoints = filterMatchesByDailyLimit(
    allParticipants.filter(p => p.player_type === "user" && p.user_id).map(p => ({ 
      match_id: p.match_id, 
      user_id: p.user_id 
    })),
    Array.from(matchesMap.entries()).map(([id, match]) => ({ 
      id, 
      played_at: match.played_at || match.created_at 
    })),
    MAX_MATCHES_PER_DAY
  );
  
  console.log("[Home] Valid matches for points (after daily limit):", validMatchIdsForPoints.size);
  
  // Récupérer les profils
  const userIds = [...new Set(allParticipants.filter(p => p.player_type === "user" && p.user_id).map(p => p.user_id))];
  const guestIds = [...new Set(allParticipants.filter(p => p.player_type === "guest" && p.guest_player_id).map(p => p.guest_player_id))];
  
  const profilesMap = new Map<string, string>();
  const profilesFirstNameMap = new Map<string, string>();
  const profilesLastNameMap = new Map<string, string>();
  
  if (userIds.length > 0) {
    // Utiliser le client admin pour bypass RLS et récupérer tous les profils nécessaires
    let profilesQuery = supabaseAdmin
      .from("profiles")
      .select("id, display_name, first_name, last_name, club_id")
      .in("id", userIds);
    
    // Filtrer par club_id si disponible
    if (userClubId) {
      profilesQuery = profilesQuery.eq("club_id", userClubId);
    }
    
    const { data: profiles, error: profilesError } = await profilesQuery;
    
    if (profilesError) {
      // Extraire les propriétés de l'erreur de manière sécurisée
      const errorDetails: Record<string, any> = {};
      if (profilesError.message) errorDetails.message = profilesError.message;
      if (profilesError.details) errorDetails.details = profilesError.details;
      if (profilesError.hint) errorDetails.hint = profilesError.hint;
      if (profilesError.code) errorDetails.code = profilesError.code;
      
      // Si aucune propriété standard n'est trouvée, logger des informations de debug
      if (Object.keys(errorDetails).length === 0) {
        const allKeys = Object.keys(profilesError);
        const errorType = typeof profilesError;
        const errorString = String(profilesError);
        console.error("[Home] Error fetching profiles (empty error object):", {
          type: errorType,
          keys: allKeys,
          stringRepresentation: errorString !== "[object Object]" ? errorString : undefined,
          rawError: profilesError
        });
      } else {
        console.error("[Home] Error fetching profiles:", errorDetails);
      }
    } else if (profiles) {
      profiles.forEach(p => {
        profilesMap.set(p.id, p.display_name);
        if (p.first_name) {
          profilesFirstNameMap.set(p.id, p.first_name);
        } else if (p.display_name) {
          const nameParts = p.display_name.trim().split(/\s+/);
          profilesFirstNameMap.set(p.id, nameParts[0] || "");
        }
        if (p.last_name) {
          profilesLastNameMap.set(p.id, p.last_name);
        } else if (p.display_name) {
          const nameParts = p.display_name.trim().split(/\s+/);
          profilesLastNameMap.set(p.id, nameParts.slice(1).join(" ") || "");
        }
      });
      console.log("[Home] Profiles loaded:", profiles.length);
    }
  }
  
  // Créer un Set des userIds valides (du même club)
  const validUserIds = new Set(profilesMap.keys());
  
  console.log("[Home] Valid user IDs (same club):", validUserIds.size);
  console.log("[Home] Total participants before filtering:", allParticipants.length);
  
  // Filtrer les participants pour ne garder que ceux du même club
  const filteredParticipants = userClubId 
    ? allParticipants.filter((p: any) => {
        if (p.player_type === "user" && p.user_id) {
          const isValid = validUserIds.has(p.user_id);
          if (!isValid) {
            console.log(`[Home] Filtering out participant ${p.user_id} - not in same club`);
          }
          return isValid;
        }
        return p.player_type === "guest"; // Garder les guests
      })
    : allParticipants;
  
  console.log("[Home] Participants after club filtering:", filteredParticipants.length);
  
  // Filtrer les matchs : ne garder que ceux où TOUS les participants users appartiennent au même club
  // (comme dans l'historique des matchs)
  const participantsByMatch = filteredParticipants.reduce((acc: Record<string, any[]>, p: any) => {
    if (!acc[p.match_id]) {
      acc[p.match_id] = [];
    }
    acc[p.match_id].push(p);
    return acc;
  }, {});
  
  const validMatchIds = new Set<string>();
  Object.entries(participantsByMatch).forEach(([matchId, participants]: [string, any[]]) => {
    // Vérifier que tous les participants users appartiennent au même club
    const userParticipants = participants.filter((p: any) => p.player_type === "user" && p.user_id);
    const allUsersInSameClub = userParticipants.every((p: any) => validUserIds.has(p.user_id));
    
    if (allUsersInSameClub) {
      validMatchIds.add(matchId);
    } else {
      console.log(`[Home] Filtering out match ${matchId} - not all users in same club`);
    }
  });
  
  console.log("[Home] Valid matches (all users in same club):", validMatchIds.size);
  console.log("[Home] Total matches before filtering:", Object.keys(participantsByMatch).length);
  console.log("[Home] Valid match IDs after club filtering:", Array.from(validMatchIds));
  
  // Filtrer les participants pour ne garder que ceux des matchs valides (même club) ET qui respectent la limite quotidienne
  const finalFilteredParticipants = filteredParticipants.filter((p: any) => {
    const isValidForClub = validMatchIds.has(p.match_id);
    // Pour les users, vérifier aussi la limite quotidienne. Les guests ne sont pas limités.
    if (p.player_type === "user" && p.user_id) {
      const isValidForDailyLimit = validMatchIdsForPoints.has(p.match_id);
      const shouldInclude = isValidForClub && isValidForDailyLimit;
      
      if (!shouldInclude && user?.id === p.user_id) {
        console.log(`[Home] Excluding match ${p.match_id} for current user ${p.user_id.substring(0, 8)}: club=${isValidForClub}, dailyLimit=${isValidForDailyLimit}`);
      }
      
      return shouldInclude;
    }
    // Pour les guests, on ne vérifie que le club
    return isValidForClub;
  });
  
  console.log("[Home] Participants after match filtering (club + daily limit):", finalFilteredParticipants.length);
  
  // Log des matchs filtrés pour l'utilisateur connecté
  if (user?.id) {
    const currentUserMatches = finalFilteredParticipants
      .filter((p: any) => p.user_id === user.id)
      .map((p: any) => p.match_id);
    console.log(`[Home] Current user ${user.id.substring(0, 8)} filtered matches:`, currentUserMatches.length, currentUserMatches);
  }
  
  // Enrichir les participants filtrés avec les données des matchs
  const agg = finalFilteredParticipants.map((p: any) => ({
    ...p,
    matches: matchesMap.get(p.match_id) || null,
  }));

  const byPlayer: Record<string, { 
    name: string; 
    wins: number; 
    losses: number; 
    matches: number; 
    isGuest: boolean;
    playerId: string;
  }> = {};
  
  // Calculer les stats sans les noms d'abord
  // Inclure TOUS les matchs avec un winner_team_id valide
  let validMatches = 0;
  let skippedMatches = 0;
  
  // Créer des Maps pour tracker les matchs gagnés par joueur (nécessaire pour le calcul de boosts)
  const winMatchesByPlayer = new Map<string, Set<string>>();

  agg.forEach((row: any) => {
    // Vérifier que le match existe et a un winner_team_id (match terminé)
    if (!row.matches) {
      skippedMatches++;
      console.warn("[Home] Skipping participant without match data:", row.match_id);
      return;
    }
    
    if (!row.matches.winner_team_id || !row.matches.team1_id || !row.matches.team2_id) {
      skippedMatches++;
      console.warn("[Home] Skipping match without winner_team_id:", row.match_id);
      return;
    }
    
    validMatches++;
    
    // Déterminer winner_team (1 ou 2) à partir de winner_team_id
    const winner_team = row.matches.winner_team_id === row.matches.team1_id ? 1 : 2;
    const win = winner_team === row.team;
    const isGuest = row.player_type === "guest";
    
    // Identifier unique du joueur : user_id pour users, guest_player_id pour guests
    let playerId: string;
    
    if (isGuest && row.guest_player_id) {
      playerId = 'guest_' + row.guest_player_id;
    } else if (row.user_id) {
      playerId = row.user_id;
    } else {
      // Ignorer les participants sans identifiant valide
      skippedMatches++;
      console.warn("[Home] Skipping participant without valid ID:", row);
      return;
    }
    
    if (!byPlayer[playerId]) {
      byPlayer[playerId] = { 
        name: "", // Sera rempli plus tard
        wins: 0, 
        losses: 0, 
        matches: 0,
        isGuest,
        playerId
      };
      // Initialiser le Set pour les matchs gagnés
      if (!isGuest) {
        winMatchesByPlayer.set(playerId, new Set());
      }
    }
    byPlayer[playerId].matches += 1;
    if (win) {
      byPlayer[playerId].wins += 1;
      // Ajouter le match à la liste des matchs gagnés (seulement pour les users, pas les guests)
      if (!isGuest && row.match_id) {
        const winMatches = winMatchesByPlayer.get(playerId);
        if (winMatches) {
          winMatches.add(row.match_id);
        }
      }
    } else {
      byPlayer[playerId].losses += 1;
    }
  });
  
  console.log("[Home] Valid matches processed:", validMatches);
  console.log("[Home] Skipped matches:", skippedMatches);
  console.log("[Home] Players aggregated:", Object.keys(byPlayer).length);
  
  // Récupérer les IDs des joueurs pour les guests (les profils users sont déjà chargés)
  // Note: guestIds est déjà déclaré plus haut (ligne 147), on le réutilise ici
  const userIdsForGuests = [...new Set(Object.keys(byPlayer).filter(id => !id.startsWith("guest_") && byPlayer[id].isGuest === false && id))];
  // Utiliser les guestIds déjà déclarés plus haut, mais aussi récupérer ceux de byPlayer pour être sûr
  const guestIdsFromByPlayer = [...new Set(Object.keys(byPlayer).filter(id => id.startsWith("guest_")).map(id => id.replace("guest_", "")))];
  // Combiner les deux sources de guestIds
  const allGuestIds = [...new Set([...guestIds, ...guestIdsFromByPlayer])];

  console.log("[Home] Fetching names - User IDs:", userIdsForGuests.length, "Guest IDs:", allGuestIds.length);
  
  // Récupérer les guest players
  const guestsMap = new Map<string, { first_name: string; last_name: string }>();
  if (allGuestIds.length > 0) {
    const { data: guests, error: guestsError } = await supabase
      .from("guest_players")
      .select("id, first_name, last_name")
      .in("id", allGuestIds);
    
    if (guestsError) {
      console.error("❌ Error fetching guest players:", {
        message: guestsError.message,
        details: guestsError.details,
        hint: guestsError.hint,
        code: guestsError.code
      });
    } else if (guests) {
      guests.forEach(g => guestsMap.set(g.id, { first_name: g.first_name, last_name: g.last_name }));
      console.log("[Home] Guest players loaded:", guests.length);
    }
  }
  
  // Assigner les noms aux joueurs
  Object.keys(byPlayer).forEach(playerId => {
    if (byPlayer[playerId].isGuest) {
      const guestId = playerId.replace("guest_", "");
      const guest = guestsMap.get(guestId);
      byPlayer[playerId].name = guest ? (guest.first_name + " " + guest.last_name).trim() : "Joueur invité";
    } else {
      // Utiliser first_name et last_name depuis Supabase si disponibles
      const firstName = profilesFirstNameMap.get(playerId);
      const lastName = profilesLastNameMap.get(playerId);
      if (firstName) {
        byPlayer[playerId].name = (firstName + (lastName ? " " + lastName : "")).trim();
      } else {
        // Fallback sur display_name si first_name n'est pas disponible
      const displayName = profilesMap.get(playerId);
      byPlayer[playerId].name = displayName || "Joueur";
      }
    }
  });
  
  console.log("[Home] Names assigned to players");
  
  // Log des statistiques par joueur pour debug (après assignation des noms)
  Object.entries(byPlayer).forEach(([playerId, stats]) => {
    if (stats.matches > 0) {
      console.log('[Home] Player ' + playerId + ' (' + stats.name + '): ' + stats.matches + ' matches, ' + stats.wins + ' wins, ' + stats.losses + ' losses');
    }
  });
  
  // Vérifier les doublons de user_id avant la construction du leaderboard
  const userIdsInByPlayer = Object.keys(byPlayer).filter(id => !id.startsWith("guest_"));
  const uniqueUserIds = new Set(userIdsInByPlayer);
  if (userIdsInByPlayer.length !== uniqueUserIds.size) {
    console.warn("[Home] ⚠️ Doublons de user_id détectés dans byPlayer!");
    const duplicates = userIdsInByPlayer.filter((id, index) => userIdsInByPlayer.indexOf(id) !== index);
    console.warn("[Home] User IDs en doublon:", [...new Set(duplicates)]);
  }

  // Bonus premier avis: +10 points pour les users ayant au moins un avis
  const bonusMap = new Map<string, number>();
  {
    const userIdsForBonus = Object.keys(byPlayer).filter(id => !id.startsWith("guest_") && byPlayer[id].isGuest === false);
    if (userIdsForBonus.length > 0) {
      const { data: reviewers } = await supabase
        .from("reviews")
        .select("user_id")
        .in("user_id", userIdsForBonus);
      const hasReview = new Set((reviewers || []).map((r: any) => r.user_id));
      userIdsForBonus.forEach(uid => {
        if (hasReview.has(uid)) bonusMap.set(uid, 10);
      });
    }
  }

  // Récupérer les points de challenges pour tous les joueurs
  const challengePointsMap = new Map<string, number>();
  {
    const userIdsForChallenges = Object.keys(byPlayer).filter(id => !id.startsWith("guest_") && byPlayer[id].isGuest === false);
    if (userIdsForChallenges.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, points")
        .in("id", userIdsForChallenges);
      
      (profiles || []).forEach((p: any) => {
        // Convertir les points en nombre (peut être string, null, undefined dans la DB)
        const challengePoints = typeof p.points === 'number' 
          ? p.points 
          : (typeof p.points === 'string' ? parseInt(p.points, 10) || 0 : 0);
        
        // Ajouter les points même s'ils sont à 0 pour garantir l'addition correcte
        challengePointsMap.set(p.id, challengePoints);
        if (challengePoints > 0) {
          console.log(`[Home] Player ${p.id.substring(0, 8)} has ${challengePoints} challenge points`);
        }
      });
    }
  }

  // Récupérer tous les joueurs pour l'affichage intelligent des noms
  const { getPlayerDisplayName } = await import("@/lib/utils/player-utils");
  const allPlayers = Object.values(byPlayer).map(p => ({
    first_name: p.name.split(new RegExp("\\s+")).slice(0,1)[0] || "",
    last_name: p.name.split(new RegExp("\\s+")).slice(1).join(" ") || "",
  }));

  // Préparer les données pour le calcul de points avec boosts
  const playersForBoostCalculation = Object.entries(byPlayer)
    .filter(([playerId, s]) => {
      // Exclure les guests et ne garder que les users du même club
      if (playerId.startsWith("guest_")) return false;
      if (userClubId) {
        return validUserIds.has(playerId);
      }
      return true;
    })
    .map(([playerId, s]) => {
      const winMatches = winMatchesByPlayer.get(playerId) || new Set<string>();
      const bonus = bonusMap.get(playerId) || 0;
      const challengePoints = challengePointsMap.get(playerId) || 0;
      
      console.log(`[Home] Player ${playerId.substring(0, 8)} boost calculation:`, {
        wins: s.wins,
        losses: s.losses,
        winMatchesCount: winMatches.size,
        winMatches: Array.from(winMatches),
        bonus,
        challengePoints
      });
      
      return {
        userId: playerId,
        wins: s.wins,
        losses: s.losses,
        winMatches,
        bonus,
        challengePoints,
      };
    });

  // Calculer les points avec boosts en une seule requête optimisée
  const pointsWithBoosts = await calculatePointsForMultiplePlayers(playersForBoostCalculation);
  
  console.log("[Home] Points with boosts calculated:", Array.from(pointsWithBoosts.entries()).map(([id, pts]) => ({
    id: id.substring(0, 8),
    points: pts
  })));
  
  // Construire le leaderboard (uniquement les joueurs du même club)
  const leaderboard = Object.entries(byPlayer)
    .filter(([playerId, s]) => {
      // Exclure complètement les joueurs non connectés à un club (guests)
      if (playerId.startsWith("guest_")) return false;
      // Si on a un club_id, ne garder que les joueurs du même club
      if (userClubId) {
        return validUserIds.has(playerId);
      }
      return true;
    })
    .map(([playerId, s]) => {
      // Utiliser l'affichage intelligent des noms
      const displayName = getPlayerDisplayName(
        { first_name: s.name.split(new RegExp("\\s+")).slice(0,1)[0] || "", last_name: s.name.split(new RegExp("\\s+")).slice(1).join(" ") || "" },
        allPlayers
      );
      
      // Récupérer les points avec boosts calculés
      const pointsFromBoosts = pointsWithBoosts.get(playerId);
      let totalPoints: number;
      if (pointsFromBoosts !== undefined) {
        totalPoints = typeof pointsFromBoosts === 'number' ? pointsFromBoosts : (typeof pointsFromBoosts === 'string' ? parseInt(String(pointsFromBoosts), 10) || 0 : 0);
      } else {
        // Fallback : calcul manuel
        const winsNum = typeof s.wins === 'number' ? s.wins : (typeof s.wins === 'string' ? parseInt(String(s.wins), 10) || 0 : 0);
        const lossesNum = typeof s.losses === 'number' ? s.losses : (typeof s.losses === 'string' ? parseInt(String(s.losses), 10) || 0 : 0);
        const bonusNum = typeof (bonusMap.get(playerId) || 0) === 'number' ? (bonusMap.get(playerId) || 0) : (typeof (bonusMap.get(playerId) || 0) === 'string' ? parseInt(String(bonusMap.get(playerId) || 0), 10) || 0 : 0);
        const challengePointsNum = typeof (challengePointsMap.get(playerId) || 0) === 'number' ? (challengePointsMap.get(playerId) || 0) : (typeof (challengePointsMap.get(playerId) || 0) === 'string' ? parseInt(String(challengePointsMap.get(playerId) || 0), 10) || 0 : 0);
        totalPoints = winsNum * 10 + lossesNum * 3 + bonusNum + challengePointsNum;
      }
      
      return {
        rank: 0,
        user_id: playerId,
        player_name: displayName,
        points: totalPoints,
        wins: s.wins,
        losses: s.losses,
        matches: s.matches,
        badges: [],
        isGuest: s.isGuest,
      };
    })
    .sort((a, b) => b.points - a.points)
    .map((r, idx) => ({ ...r, rank: idx + 1 }));

  // Détecter les doublons de noms dans le leaderboard
  const nameCounts = new Map<string, number>();
  leaderboard.forEach(p => {
    const normalizedName = p.player_name.toLowerCase().trim();
    nameCounts.set(normalizedName, (nameCounts.get(normalizedName) || 0) + 1);
  });
  
  const duplicates = Array.from(nameCounts.entries())
    .filter(([name, count]) => count > 1)
    .map(([name]) => name);
  
  if (duplicates.length > 0) {
    console.warn("[Home] ⚠️ Doublons détectés dans le leaderboard:", duplicates);
    duplicates.forEach(dupName => {
      const playersWithSameName = leaderboard.filter(p => p.player_name.toLowerCase().trim() === dupName);
      console.warn(`[Home] Joueurs avec le nom "${dupName}":`, playersWithSameName.map(p => ({
        user_id: p.user_id,
        player_name: p.player_name,
        points: p.points,
        matches: p.matches
      })));
    });
  }

  // Résumé final du classement
  const totalMatchesInLeaderboard = leaderboard.reduce((sum, p) => sum + p.matches, 0);
  const totalWinsInLeaderboard = leaderboard.reduce((sum, p) => sum + p.wins, 0);
  const totalLossesInLeaderboard = leaderboard.reduce((sum, p) => sum + p.losses, 0);
  
  // Ne pas afficher les points/stats si moins de 2 vrais joueurs dans la base de données
  const { count: totalProfilesCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });
  
  const hasMultipleRealPlayersInDB = (totalProfilesCount || 0) >= 2;
  const realPlayers = leaderboard.filter(p => !p.isGuest);
  const hasMultipleRealPlayersInLeaderboard = realPlayers.length >= 2;
  const shouldShowPoints = hasMultipleRealPlayersInDB && hasMultipleRealPlayersInLeaderboard && totalMatchesInLeaderboard > 0;
  
  console.log("[Home] ===== LEADERBOARD SUMMARY =====");
  console.log("[Home] Total profiles in database:", totalProfilesCount);
  console.log("[Home] Total players in leaderboard:", leaderboard.length);
  console.log("[Home] Real players (non-guests) in leaderboard:", realPlayers.length);
  console.log("[Home] Total matches counted:", totalMatchesInLeaderboard);
  console.log("[Home] Total wins:", totalWinsInLeaderboard);
  console.log("[Home] Total losses:", totalLossesInLeaderboard);
  console.log("[Home] Valid matches processed:", validMatches);
  console.log("[Home] Skipped matches:", skippedMatches);
  console.log("[Home] Has multiple real players in DB:", hasMultipleRealPlayersInDB);
  console.log("[Home] Has multiple real players in leaderboard:", hasMultipleRealPlayersInLeaderboard);
  console.log("[Home] Should show points:", shouldShowPoints);
  console.log("[Home] ================================");

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-blue-950 via-black to-black">
      {/* Background avec overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/30 via-black/80 to-black z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.15),transparent)] z-0" />
      
      {/* Pattern animé - halos de la landing page */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#BFFF00] rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-8 pt-20 sm:pt-4 sm:py-4 md:py-6 md:py-8 pb-4 sm:pb-6 md:pb-8">
        <Top3Notification currentUserId={profile.id} />
        <div className="mb-4 sm:mb-6">
          <PageTitle title={`Bienvenue ${profile.display_name} !`} subtitle={clubName ? `Club : ${clubName}` : undefined} />
        </div>
      
      <div className="grid gap-4 sm:gap-6 md:gap-8 lg:grid-cols-12">
        <div className="lg:col-span-4 space-y-4 sm:space-y-6">
          <PlayerSummary profileId={profile.id} />
          <a href="/match/new" className="inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white transition-all hover:scale-105" style={{ background: "linear-gradient(135deg,#0052CC,#003D99)", boxShadow: "0 0 25px rgba(0,82,204,0.7)" }}>Enregistrer un match</a>
        </div>
        <div className="lg:col-span-8 lg:mt-0 mt-4 sm:mt-0 space-y-4 sm:space-y-6">
          {leaderboard.length >= 3 && (
            <div className="mb-6 sm:mb-8">
              <div className="mb-3 sm:mb-4 flex items-center justify-center gap-2 sm:gap-3">
                <span className="h-px w-5 sm:w-8 md:w-10 bg-gray-300" />
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold text-white shadow-sm">
                    Top joueurs du moment
                  </span>
                <span className="h-px w-5 sm:w-8 md:w-10 bg-gray-300" />
              </div>
              <div className="hidden md:flex items-end justify-center gap-4 md:gap-6 w-full mt-6 md:mt-8">
                <div className="flex-1 max-w-[240px]">
                  <div 
                    className="podium-silver border-4 border-slate-400/80 rounded-2xl p-8 hover:border-slate-300/90 transition-all shadow-lg transform hover:scale-[1.02] relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(to bottom, #ffffff, #d8d8d8, #b8b8b8)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(192, 192, 192, 0.35), inset 0 2px 4px rgba(255,255,255,0.5)'
                    }}
                  >
                    <div className="absolute top-2 right-2 z-20 opacity-90 drop-shadow-md">
                      <Image src="/images/Médaille top2.png" alt="Médaille 2ème place" width={48} height={48} className="w-10 h-10 md:w-12 md:h-12" unoptimized />
                    </div>
                    <div className="text-center relative z-10 pt-5">
                      <h3 className="text-xl font-semibold mb-8 text-gray-900 tracking-tight">
                        {leaderboard[1].player_name}
                      </h3>
                      <div className="flex items-center justify-center mt-4">
                        <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 bg-white/95 backdrop-blur border-2 border-zinc-500 ring-2 ring-zinc-300 shadow-lg shadow-zinc-300/70">
                          <span className="text-2xl font-bold text-gray-900 tabular-nums">{leaderboard[1].points.toLocaleString()}</span>
                          <span className="text-xs font-normal text-gray-800 uppercase tracking-wider">points</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 max-w-[280px]">
                  <div 
                    className="podium-gold border-4 border-yellow-500/80 rounded-2xl p-9 hover:border-yellow-400/90 transition-all shadow-xl transform hover:scale-[1.02] relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(to bottom, #ffffff, #ffe8a1, #ffdd44)',
                      boxShadow: '0 6px 25px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 140px rgba(255, 215, 0, 0.4), inset 0 2px 6px rgba(255,255,255,0.6)'
                    }}
                  >
                    <div className="absolute top-2 right-2 z-20 opacity-95 drop-shadow-lg">
                      <Image src="/images/Médaille top1.png" alt="Médaille 1ère place" width={48} height={48} className="w-10 h-10 md:w-12 md:h-12" unoptimized />
                    </div>
                    <div className="absolute top-1 left-1 z-20">
                      <span className="inline-flex items-center rounded-full bg-yellow-100 text-yellow-800 px-2 py-0.5 text-xs font-semibold shadow-sm border border-yellow-300">Meilleur joueur</span>
                    </div>
                    <div className="text-center relative z-10 pt-6">
                      <h3 className="text-xl font-semibold mb-8 text-gray-900 tracking-tight drop-shadow-sm">
                        {leaderboard[0].player_name}
                      </h3>
                      <div className="flex items-center justify-center mt-4">
                        <div className="inline-flex items-center gap-3 rounded-full px-6 py-2.5 bg-white/95 backdrop-blur border-2 border-yellow-500 ring-2 ring-yellow-300 shadow-xl shadow-yellow-300/70">
                          <span className="text-2xl font-bold text-gray-900 tabular-nums">{leaderboard[0].points.toLocaleString()}</span>
                          <span className="text-xs font-normal text-gray-900 uppercase tracking-wider">points</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 max-w-[240px]">
                  <div 
                    className="podium-bronze border-4 border-orange-600/80 rounded-2xl p-8 hover:border-orange-500/90 transition-all shadow-lg transform hover:scale-[1.02] relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(to bottom, #ffffff, #ffd8b3, #ffc085)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(205, 127, 50, 0.35), inset 0 2px 4px rgba(255,255,255,0.5)'
                    }}
                  >
                    <div className="absolute top-2 right-2 z-20 opacity-90 drop-shadow-md">
                      <Image src="/images/Médaille top3.png" alt="Médaille 3ème place" width={48} height={48} className="w-10 h-10 md:w-12 md:h-12" unoptimized />
                    </div>
                    <div className="text-center relative z-10 pt-5">
                      <h3 className="text-xl font-semibold mb-8 text-gray-900 tracking-tight">
                        {(() => { var parts = (leaderboard[2].player_name || '').split(' '); var f = parts[0] || ''; var l = parts.slice(1).join(' '); return (<span><span className="text-xl">{f}</span>{l ? ' ' + l : ''}</span>); })()}
                      </h3>
                      <div className="flex items-center justify-center mt-4">
                        <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 bg-white/95 backdrop-blur border-2 border-orange-500 ring-2 ring-orange-300 shadow-lg shadow-orange-300/70">
                          <span className="text-2xl font-bold text-gray-900 tabular-nums">{leaderboard[2].points.toLocaleString()}</span>
                          <span className="text-xs font-normal text-gray-800 uppercase tracking-wider">points</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="md:hidden space-y-3 sm:space-y-4 mt-4 sm:mt-6">
                {leaderboard.slice(0, 3).map(function(player, index) {
                  var icons = [
                    { src: '/images/Médaille top1.png', alt: '1ère place' },
                    { src: '/images/Médaille top2.png', alt: '2ème place' },
                    { src: '/images/Médaille top3.png', alt: '3ème place' }
                  ];
                  var borderColors = [
                    'border-yellow-500/80',
                    'border-slate-400/80',
                    'border-orange-600/80'
                  ];
                  var borderWidth = 'border-4';
                  var shineClass = index === 0 ? 'podium-gold' : index === 1 ? 'podium-silver' : 'podium-bronze';
                  var bgGradients = [
                    { background: 'linear-gradient(to bottom, #ffffff, #ffe8a1, #ffdd44)', boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(255, 215, 0, 0.35), inset 0 2px 4px rgba(255,255,255,0.6)' },
                    { background: 'linear-gradient(to bottom, #ffffff, #d8d8d8, #b8b8b8)', boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(192, 192, 192, 0.32), inset 0 2px 4px rgba(255,255,255,0.5)' },
                    { background: 'linear-gradient(to bottom, #ffffff, #ffd8b3, #ffc085)', boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(205, 127, 50, 0.32), inset 0 2px 4px rgba(255,255,255,0.5)' }
                  ];
                  return (
                    <div key={player.user_id} className={(shineClass + ' ' + borderWidth + ' ' + borderColors[index] + ' rounded-2xl p-5 shadow-2xl relative overflow-hidden')} style={bgGradients[index]}>
                      <div className="absolute top-2 right-2 z-20 opacity-90 drop-shadow-md">
                        <Image src={icons[index].src} alt={icons[index].alt} width={48} height={48} className="w-10 h-10 md:w-12 md:h-12" unoptimized />
                      </div>
                      <div className="relative z-10 pt-4">
                        <h3 className={"font-semibold mb-6 text-center text-gray-900 " + (index === 0 ? 'text-xl' : index === 1 ? 'text-xl' : 'text-xl')}>
                          {index === 2 ? (function(){ var parts=(player.player_name||'').split(' '); var f=parts[0]||''; var l=parts.slice(1).join(' '); return (<span><span className="text-xl">{f}</span>{l ? ' ' + l : ''}</span>); })() : player.player_name}
                        </h3>
                        <div className="flex items-center justify-center mt-2">
                          <div className={"inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-white/95 backdrop-blur border-2 shadow-lg " + (index === 0 ? 'border-yellow-500 ring-2 ring-yellow-300' : index === 1 ? 'border-zinc-500 ring-2 ring-zinc-300' : 'border-orange-500 ring-2 ring-orange-300')}>
                            <span className="text-2xl font-bold text-gray-900 tabular-nums">{player.points.toLocaleString()}</span>
                            <span className="text-xs font-normal text-gray-900 uppercase tracking-wider">points</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {leaderboard.length > 0 ? (
            <div className="overflow-hidden">
              <div className="px-3 sm:px-4 md:px-5 pt-3 sm:pt-4 md:pt-5">
                <div className="mb-3 sm:mb-4 flex items-center justify-center gap-2 sm:gap-3">
                  <span className="h-px w-5 sm:w-8 md:w-10 bg-gray-300" />
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold text-white shadow-sm">
                    Classement global
                  </span>
                  <span className="h-px w-5 sm:w-8 md:w-10 bg-gray-300" />
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl sm:rounded-2xl border-2 sm:border-4 border-white/70 bg-white/5 backdrop-blur-sm shadow-xl scrollbar-hide">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 bg-gray-100">Rang</th>
                      <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0">Joueur</th>
                      <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 hidden sm:table-cell">Niveau</th>
                      <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0">Points</th>
                      <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 hidden md:table-cell">Winrate</th>
                      <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider border-l border-gray-200 first:border-l-0" style={{ color: "#10B981", backgroundColor: "#F0FDF4" }}>V</th>
                      <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider border-l border-gray-200 first:border-l-0" style={{ color: "#EF4444", backgroundColor: "#FEF2F2" }}>D</th>
                      <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 hidden sm:table-cell">MJ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {leaderboard.map(function(player, idx) {
                      var isCurrentUser = player.user_id === profile.id;
                      var winRate = player.matches > 0 ? Math.round((player.wins / player.matches) * 100) : 0;
                      // Même logique que PlayerSummary.tierForPoints
                      var tierLabel = (player.points >= 500) ? 'Champion' : (player.points >= 300) ? 'Diamant' : (player.points >= 200) ? 'Or' : (player.points >= 100) ? 'Argent' : 'Bronze';
                      var tierClassName = (player.points >= 500) ? 'bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white' :
                                         (player.points >= 300) ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white' :
                                         (player.points >= 200) ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white' :
                                         (player.points >= 100) ? 'bg-gradient-to-r from-zinc-300 to-zinc-400 text-zinc-800' :
                                                                 'bg-gradient-to-r from-orange-400 to-orange-600 text-white';
                      // Utiliser first_name depuis Supabase si disponible
                      var firstName = profilesFirstNameMap.get(player.user_id) || '';
                      var lastName = profilesLastNameMap.get(player.user_id) || '';
                      // Si first_name n'est pas disponible, diviser depuis player_name
                      if (!firstName && player.player_name) {
                      var nameParts = (player.player_name || '').trim().split(' ');
                        firstName = nameParts[0] || '';
                        lastName = nameParts.slice(1).join(' ');
                      }
                      var rowClass = isCurrentUser ? 'bg-blue-100 border-b border-gray-300' : (idx === 0 ? 'bg-gray-50' : '');
                      return (
                        <tr key={player.user_id} className={rowClass}>
                          <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900 text-center border-l border-gray-200 first:border-l-0">
                            <RankBadge rank={player.rank} size="md" />
                          </td>
                          <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 text-center border-l border-gray-200 first:border-l-0">
                            <span className="truncate block max-w-[120px] sm:max-w-none"><strong>{firstName || 'Joueur'}</strong>{lastName ? ' ' + lastName : ''}{isCurrentUser ? <span className="hidden sm:inline"> (vous)</span> : ''}</span>
                          </td>
                          <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center border-l border-gray-200 first:border-l-0 hidden sm:table-cell">
                            <TierBadge tier={tierLabel as "Bronze" | "Argent" | "Or" | "Diamant" | "Champion"} size="sm" />
                          </td>
                          <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center tabular-nums text-gray-900 border-l border-gray-200 first:border-l-0 font-semibold">{player.points}</td>
                          <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center tabular-nums border-l border-gray-200 first:border-l-0 font-semibold hidden md:table-cell" style={{ color: winRate > 60 ? '#10B981' : winRate >= 40 ? '#0066FF' : '#EF4444' }}>{winRate}%</td>
                          <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center tabular-nums border-l border-gray-200 first:border-l-0 font-semibold" style={{ color: "#10B981", backgroundColor: "#F0FDF4" }}>{player.wins}</td>
                          <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center tabular-nums border-l border-gray-200 first:border-l-0 font-semibold" style={{ color: "#EF4444", backgroundColor: "#FEF2F2" }}>{player.losses}</td>
                          <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center tabular-nums text-gray-700 border-l border-gray-200 first:border-l-0 font-semibold hidden sm:table-cell">{player.matches}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500 text-sm">Aucun joueur dans le classement</div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
