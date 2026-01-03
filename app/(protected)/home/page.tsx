import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import PlayerSummary from "@/components/PlayerSummary";
import LogoutButton from "@/components/LogoutButton";
import Top3Notification from "@/components/Top3Notification";
import ReferralNotifier from "@/components/ReferralNotifier";
import ReferralSection from "@/components/ReferralSection";
import TierBadge from "@/components/TierBadge";
import RankBadge from "@/components/RankBadge";
import Link from "next/link";
import PageTitle from "@/components/PageTitle";
import { getUserClubInfo } from "@/lib/utils/club-utils";
import { getClubLogoPublicUrl } from "@/lib/utils/club-logo-utils";
import { calculatePlayerLeaderboard } from "@/lib/utils/player-leaderboard-utils";
import Image from "next/image";
import { logger } from '@/lib/logger';

function tierForPoints(points: number) {
  if (points >= 500) return { label: "Champion", className: "bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white", nextAt: Infinity };
  if (points >= 300) return { label: "Diamant", className: "bg-gradient-to-r from-cyan-500 to-blue-500 text-white", nextAt: 500 };
  if (points >= 200) return { label: "Or", className: "bg-gradient-to-r from-amber-400 to-yellow-500 text-white", nextAt: 300 };
  if (points >= 100) return { label: "Argent", className: "bg-gradient-to-r from-zinc-300 to-zinc-400 text-zinc-800", nextAt: 200 };
  return { label: "Bronze", className: "bg-gradient-to-r from-orange-400 to-orange-600 text-white", nextAt: 100 };
}

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
  
  // NE PLUS retourner tôt pour permettre au layout (menu hamburger + logo) de TOUJOURS s'afficher
  // Même si la session/user n'est pas encore disponible, le layout doit être visible
  // Cela garantit l'affichage lors de la première connexion d'un nouveau joueur
  
  // Si ni session ni utilisateur, afficher un message mais permettre au layout de s'afficher
  const hasNoAuth = !user && !session;
  
  // Si une session existe mais getUser() échoue temporairement, continuer le rendu
  const hasSessionButNoUser = session && !user && userError;
  
  if (hasSessionButNoUser) {
    logger.warn("[HomePage] Session exists but getUser() failed (temporary error?):", {
      errorCode: userError?.code,
      errorMessage: userError?.message,
    });
    // NE PLUS retourner tôt - continuer le rendu pour permettre au layout de s'afficher
  }
  
  // Si pas d'utilisateur, créer un profil minimal pour permettre l'affichage
  // Le layout (menu hamburger + logo) DOIT TOUJOURS s'afficher
  if (!user) {
    // Créer un profil minimal pour permettre le rendu de la page
    // Le layout sera toujours visible
  }

  // Ensuite récupérer le profil (seulement si user existe)
  let profile: any = null;
  if (user) {
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    profile = data ?? null;

  if (!profile || !profile.club_id) {
    try {
      const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name, first_name, last_name, email, club_id, club_slug")
        .eq("id", user.id)
        .maybeSingle();
      if (adminProfileError) {
        logger.error("[Home] Failed to fetch profile via admin client", {
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
      logger.error("[Home] Unexpected error when fetching profile via admin client", e);
      }
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
  // Cela garantit que le layout (menu hamburger + logo) peut toujours s'afficher
  if (!profile && user) {
    const fallbackName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Joueur";
    profile = { id: user.id, display_name: fallbackName } as any;
  }
  
  // Si toujours pas de profil (première connexion), créer un profil minimal pour permettre le rendu
  // Le layout doit TOUJOURS s'afficher, même sans données utilisateur complètes
  if (!profile) {
    profile = { id: 'loading', display_name: 'Chargement...' } as any;
  }

  // Récupérer le club_id de l'utilisateur pour filtrer les données
  const userClubId = profile?.club_id || null;
  
  logger.info("[Home] Récupération du logo du club - userClubId:", userClubId, "profile club_id:", profile?.club_id);

  // Récupérer directement depuis la table clubs avec la même logique que la page club
  // (app/club/[slug]/page.tsx) pour garantir que le logo est toujours récupéré
  let clubName: string | null = null;
  let clubLogoUrl: string | null = null;
  
  if (userClubId) {
    logger.info("[Home] Tentative de récupération du logo avec club_id:", userClubId);
    
    // Essayer d'abord avec admin client (même logique que la page club)
    if (supabaseAdmin) {
      logger.info("[Home] Utilisation du client admin pour récupérer le logo");
      const { data: clubData, error: clubError } = await supabaseAdmin
        .from("clubs")
        .select("id, name, logo_url")
        .eq("id", userClubId)
        .maybeSingle();
      
      if (clubError) {
        logger.error("[Home] Erreur lors de la récupération du logo (admin):", clubError);
      }
      
      if (clubData) {
        clubName = (clubData.name as string | null) ?? null;
        // Récupérer le logo_url brut (comme dans la page club)
        const rawLogoUrl = clubData.logo_url as string | null;
        logger.info("[Home] Logo brut récupéré depuis clubs (admin):", { 
          clubId: userClubId, 
          rawLogoUrl, 
          clubName 
        });
        
        // Convertir le logo_url brut en URL publique
        clubLogoUrl = getClubLogoPublicUrl(rawLogoUrl);
        logger.info("[Home] Logo converti en URL publique (admin):", clubLogoUrl);
      } else {
        logger.info("[Home] Aucune donnée retournée par la requête admin pour club_id:", userClubId);
      }
    }
    
    // Fallback avec client standard si admin n'a pas fonctionné
    if (!clubName || !clubLogoUrl) {
      logger.info("[Home] Tentative de récupération avec client standard (fallback)");
      const { data: clubData, error: clubError } = await supabase
        .from("clubs")
        .select("id, name, logo_url")
        .eq("id", userClubId)
        .maybeSingle();
      
      if (clubError) {
        logger.error("[Home] Erreur lors de la récupération du logo (standard):", clubError);
      }
      
      if (clubData) {
        clubName = clubName ?? (clubData.name as string | null) ?? null;
        const rawLogoUrl = clubData.logo_url as string | null;
        logger.info("[Home] Logo brut récupéré depuis clubs (standard):", { 
          clubId: userClubId, 
          rawLogoUrl, 
          clubName 
        });
        clubLogoUrl = clubLogoUrl ?? getClubLogoPublicUrl(rawLogoUrl);
        logger.info("[Home] Logo converti en URL publique (standard):", clubLogoUrl);
      } else {
        logger.info("[Home] Aucune donnée retournée par la requête standard pour club_id:", userClubId);
      }
    }
  } else {
    logger.info("[Home] Pas de userClubId, impossible de récupérer le logo");
  }
  
  // Fallback avec getUserClubInfo si on n'a toujours pas de logo
  if (!clubName || !clubLogoUrl) {
    logger.info("[Home] Fallback vers getUserClubInfo car logo non récupéré");
    const clubInfo = await getUserClubInfo();
    clubName = clubName ?? clubInfo.clubName ?? null;
    clubLogoUrl = clubLogoUrl ?? clubInfo.clubLogoUrl ?? null;
    logger.info("[Home] Fallback avec getUserClubInfo:", { 
      clubName: clubInfo.clubName, 
      clubLogoUrl: clubInfo.clubLogoUrl,
      finalClubName: clubName,
      finalClubLogoUrl: clubLogoUrl
    });
  }
  
  logger.info("[Home] Résultat final de la récupération du logo:", {
    clubName,
    clubLogoUrl,
    userClubId
  });

  // NE PLUS bloquer l'affichage si pas de club_id
  // Le layout (menu hamburger + logo) doit TOUJOURS s'afficher, même pour nouveaux joueurs
  // Afficher simplement un leaderboard vide si pas de club_id
  const hasNoClub = !userClubId;

  // Utiliser la fonction de calcul du leaderboard (même logique que la page profil)
  // Si pas de club_id, retourner un tableau vide au lieu d'appeler la fonction
  const leaderboard = hasNoClub ? [] : await calculatePlayerLeaderboard(userClubId);
  
  // Récupérer les profils pour l'affichage des noms (première partie en gras)
  const profilesFirstNameMap = new Map<string, string>();
  const profilesLastNameMap = new Map<string, string>();
  
  if (leaderboard.length > 0) {
    const userIds = leaderboard.filter(p => !p.isGuest).map(p => p.user_id);
  if (userIds.length > 0) {
    let profilesQuery = supabaseAdmin
      .from("profiles")
        .select("id, first_name, last_name")
      .in("id", userIds);
    
    if (userClubId) {
      profilesQuery = profilesQuery.eq("club_id", userClubId);
    }
    
      const { data: profiles } = await profilesQuery;
      if (profiles) {
      profiles.forEach(p => {
        if (p.first_name) {
          profilesFirstNameMap.set(p.id, p.first_name);
        }
        if (p.last_name) {
          profilesLastNameMap.set(p.id, p.last_name);
          }
        });
      }
    }
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
  
  logger.info("[Home] ===== LEADERBOARD SUMMARY =====");
  logger.info("[Home] Total profiles in database:", totalProfilesCount);
  logger.info("[Home] Total players in leaderboard:", leaderboard.length);
  logger.info("[Home] Real players (non-guests) in leaderboard:", realPlayers.length);
  logger.info("[Home] Total matches counted:", totalMatchesInLeaderboard);
  logger.info("[Home] Total wins:", totalWinsInLeaderboard);
  logger.info("[Home] Total losses:", totalLossesInLeaderboard);
  logger.info("[Home] Has multiple real players in DB:", hasMultipleRealPlayersInDB);
  logger.info("[Home] Has multiple real players in leaderboard:", hasMultipleRealPlayersInLeaderboard);
  logger.info("[Home] Should show points:", shouldShowPoints);
  logger.info("[Home] ================================");

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-blue-950 via-black to-black">
      {/* Background avec overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/30 via-black/80 to-black z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.15),transparent)] z-0" />
      
      {/* Pattern animé - halos de la landing page */}

      <div className="relative z-10 mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 pt-16 sm:pt-20 md:pt-24 lg:pt-12 pb-4 sm:pb-6 md:pb-8">
        {/* Afficher un message d'avertissement si pas de club_id, mais continuer à afficher l'interface */}
        {hasNoClub && (
          <div className="mb-4 sm:mb-6 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 p-4 text-sm text-yellow-200">
            <p className="font-semibold mb-1">⚠️ Club non défini</p>
            <p>Vous devez être rattaché à un club pour accéder au classement. Contactez votre club pour obtenir un code d'invitation.</p>
          </div>
        )}
        {/* Afficher les messages d'erreur si pas d'auth */}
        {hasNoAuth && (
          <div className="mb-4 sm:mb-6 rounded-2xl bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-200">
            <p className="font-semibold mb-1">⚠️ Session requise</p>
            <p>Veuillez vous connecter pour accéder à votre espace joueur.</p>
            <a className="text-blue-400 underline mt-2 inline-block" href="/login">Se connecter</a>
          </div>
        )}
        
        {/* Afficher un message si session existe mais user non disponible (première connexion) */}
        {hasSessionButNoUser && (
          <div className="mb-4 sm:mb-6 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 p-4 text-sm text-yellow-200">
            <p className="font-semibold mb-1">⏳ Chargement...</p>
            <p>Veuillez patienter pendant le chargement de vos données. Le menu hamburger et le logo du club sont disponibles.</p>
      </div>
        )}

        {/* Afficher le contenu seulement si profile et user existent */}
        {profile && user && (
          <>
        <Top3Notification currentUserId={profile.id} />
            <ReferralNotifier />
        <div className="mb-4 sm:mb-6">
          <PageTitle title={`Bienvenue ${profile.display_name} !`} subtitle={clubName ? `Club : ${clubName}` : undefined} />
        </div>
          </>
        )}
        
        {/* Si pas de profile/user, afficher un message de chargement mais permettre au layout de s'afficher */}
        {(!profile || !user) && !hasNoAuth && (
          <div className="mb-4 sm:mb-6">
            <PageTitle title="Chargement..." subtitle="Le menu hamburger et le logo du club sont disponibles" />
          </div>
        )}
      
        {/* Afficher le contenu principal seulement si profile et user existent */}
        {profile && user ? (
      <div className="grid gap-4 sm:gap-6 md:gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4 space-y-3 sm:space-y-4 md:space-y-6">
          <PlayerSummary profileId={profile.id} />
              <a href="/match/new" className="inline-flex w-full items-center justify-center rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base font-semibold text-white transition-all hover:scale-105" style={{ background: "linear-gradient(135deg,#0052CC,#003D99)", boxShadow: "0 0 25px rgba(0,82,204,0.7)" }}>Enregistrer un match</a>
              <ReferralSection userId={profile.id} />
        </div>
            <div className="lg:col-span-8 lg:mt-0 mt-3 sm:mt-4 md:mt-6 space-y-3 sm:space-y-4 md:space-y-6">
          {leaderboard.length >= 3 && (
            <div className="mb-6 sm:mb-8">
              <div className="mb-3 sm:mb-4 flex items-center justify-center gap-2 sm:gap-3">
                <span className="h-px w-5 sm:w-8 md:w-10 bg-gray-300" />
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold text-white shadow-sm">
                    Top joueurs du moment
                  </span>
                <span className="h-px w-5 sm:w-8 md:w-10 bg-gray-300" />
              </div>
              <div className="flex items-end justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 mt-4 sm:mt-6">
                {leaderboard.slice(0, 3).map(function(player, index) {
                      var medalEmojis = ['🥇', '🥈', '🥉'];
                  var borderColors = [
                    'border-yellow-500/80',
                    'border-slate-400/80',
                    'border-orange-600/80'
                  ];
                  var borderWidth = 'border-2 sm:border-2 md:border-2';
                  var shineClass = index === 0 ? 'podium-gold' : index === 1 ? 'podium-silver' : 'podium-bronze';
                  var bgGradients = [
                    { background: 'linear-gradient(to bottom, #ffffff, #ffe8a1, #ffdd44)', boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(255, 215, 0, 0.35), inset 0 2px 4px rgba(255,255,255,0.6)' },
                    { background: 'linear-gradient(to bottom, #ffffff, #d8d8d8, #b8b8b8)', boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(192, 192, 192, 0.32), inset 0 2px 4px rgba(255,255,255,0.5)' },
                    { background: 'linear-gradient(to bottom, #ffffff, #ffd8b3, #ffc085)', boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(205, 127, 50, 0.32), inset 0 2px 4px rgba(255,255,255,0.5)' }
                  ];
                  return (
                    <div key={player.user_id} className={(shineClass + ' ' + borderWidth + ' ' + borderColors[index] + ' rounded-xl sm:rounded-xl md:rounded-2xl p-2.5 sm:p-3 md:p-4 lg:p-5 shadow-lg relative overflow-hidden flex-1 max-w-[110px] sm:max-w-[140px] md:max-w-[180px] lg:max-w-[220px]')} style={bgGradients[index]}>
                          <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 md:top-2 md:right-2 z-30">
                            <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl">{medalEmojis[index]}</span>
                          </div>
                      <div className="relative z-10 pt-3 sm:pt-4 md:pt-5">
                            <h3 className="font-extrabold mb-2 sm:mb-3 md:mb-4 text-center text-gray-900 text-xs sm:text-sm md:text-base lg:text-lg leading-tight line-clamp-2">
                              {index === 2 ? (function(){ var parts=(player.player_name||'').split(' '); var f=parts[0]||''; var l=parts.slice(1).join(' '); return (<span><span className="text-xs sm:text-sm md:text-base lg:text-lg">{f}</span>{l ? ' ' + l : ''}</span>); })() : player.player_name}
                        </h3>
                        <div className="flex items-center justify-center">
                          <div className={"inline-flex items-center gap-1 sm:gap-1.5 md:gap-2 rounded-full px-2 sm:px-2.5 md:px-3 lg:px-4 py-1 sm:py-1.5 md:py-2 bg-white/95 backdrop-blur border shadow-md " + (index === 0 ? 'border-yellow-500 ring-1 ring-yellow-300' : index === 1 ? 'border-zinc-500 ring-1 ring-zinc-300' : 'border-orange-500 ring-1 ring-orange-300')}>
                            <span className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-900 tabular-nums">{player.points.toLocaleString()}</span>
                            <span className="text-[9px] sm:text-[10px] md:text-xs font-normal text-gray-900 uppercase tracking-wider">pts</span>
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
                  <div className="overflow-x-auto rounded-lg sm:rounded-xl md:rounded-2xl border-2 sm:border-4 border-white/70 bg-white/5 backdrop-blur-sm shadow-xl scrollbar-hide">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                          <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 bg-gray-100 whitespace-nowrap">Rang</th>
                          <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 whitespace-nowrap">Joueur</th>
                          <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 hidden sm:table-cell whitespace-nowrap">Niveau</th>
                          <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 whitespace-nowrap">Points</th>
                          <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 hidden md:table-cell whitespace-nowrap">Winrate</th>
                          <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider border-l border-gray-200 first:border-l-0 whitespace-nowrap" style={{ color: "#10B981", backgroundColor: "#F0FDF4" }}>V</th>
                          <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider border-l border-gray-200 first:border-l-0 whitespace-nowrap" style={{ color: "#EF4444", backgroundColor: "#FEF2F2" }}>D</th>
                          <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 hidden sm:table-cell whitespace-nowrap">MJ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {leaderboard.map(function(player, idx) {
                          var isCurrentUser = profile && user && player.user_id === profile.id;
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
                                <span className="truncate block max-w-[100px] sm:max-w-[150px] md:max-w-none"><strong>{firstName || 'Joueur'}</strong>{lastName ? ' ' + lastName : ''}{isCurrentUser ? <span className="hidden sm:inline"> (vous)</span> : ''}</span>
                          </td>
                          <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center border-l border-gray-200 first:border-l-0 hidden sm:table-cell">
                            <TierBadge tier={tierLabel as "Bronze" | "Argent" | "Or" | "Diamant" | "Champion"} size="sm" />
                          </td>
                          <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center tabular-nums text-gray-900 border-l border-gray-200 first:border-l-0 font-semibold">{player.points}</td>
                              <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center tabular-nums border-l border-gray-200 first:border-l-0 font-semibold hidden md:table-cell" style={{ color: winRate >= 51 ? '#10B981' : winRate === 50 ? '#0066FF' : '#EF4444' }}>{winRate}%</td>
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
        ) : null}
      </div>
    </div>
  );
}