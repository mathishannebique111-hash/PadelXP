import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import PlayerSummary from "@/components/PlayerSummary";
import LogoutButton from "@/components/LogoutButton";

import ReferralNotifier from "@/components/ReferralNotifier";
import ReferralSection from "@/components/ReferralSection";
import TierBadge from "@/components/TierBadge";
import RankBadge from "@/components/RankBadge";
import Link from "next/link";
import PageTitle from "@/components/PageTitle";
import { getUserClubInfo } from "@/lib/utils/club-utils";
import { getClubLogoPublicUrl } from "@/lib/utils/club-logo-utils";
import Image from "next/image";
import { logger } from '@/lib/logger';
import PlayerProfileTabs from "@/components/PlayerProfileTabs";
import PadelTabContent from "@/components/PadelTabContent";
import BadgesContent from "@/components/BadgesContent";
import HideSplashScreen from "@/components/HideSplashScreen";
import PadelLoader from "@/components/ui/PadelLoader";

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

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;
  const activeTab: 'profil' | 'stats' | 'badges' = (resolvedSearchParams?.tab === 'stats' || resolvedSearchParams?.tab === 'badges')
    ? (resolvedSearchParams.tab as 'stats' | 'badges')
    : 'profil';

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

    // Si l'utilisateur est admin, rediriger vers l'interface admin (pas d'onboarding, pas de page home joueur)
    if (profile?.is_admin) {
      redirect("/admin/messages");
    }

    // Vérifier si l'onboarding est complété (uniquement pour les non-admins)
    if (profile && !profile.has_completed_onboarding) {
      redirect("/player/onboarding");
    }

    if (!profile || !profile.club_id) {
      try {
        const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
          .from("profiles")
          .select("id, display_name, first_name, last_name, email, club_id, club_slug, username")
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

  logger.info(`[Home] Récupération du logo du club - userClubId: ${userClubId}, profile club_id: ${profile?.club_id}`);

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
  const hasNoClub = !userClubId;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <HideSplashScreen />
      {/* Background avec overlay - Utiliser le fond du layout pour éviter tout décalage */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.15),transparent)] z-0 pointer-events-none" />

      {/* Pattern animé - halos de la landing page */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#BFFF00] rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div
        className="relative z-10 mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 pb-4 sm:pb-6 md:pb-8"
      >
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
          <div className="mb-4 sm:mb-6 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 p-4 text-sm text-yellow-200 flex flex-col items-center justify-center min-h-[150px]">
            <PadelLoader text="Chargement de vos données..." />
          </div>
        )}

        {/* Afficher le contenu seulement si profile et user existent */}
        {profile && user && (
          <>
            <ReferralNotifier />
            <div className="mb-4 sm:mb-6">
              <PageTitle
                title={`Bienvenue ${profile.display_name} !`}
                subtitle={
                  clubName
                    ? `Club : ${clubName}${profile.username ? ` • ${profile.username}` : ''}`
                    : profile.username || undefined
                }
              />
            </div>
          </>
        )}

        {/* Si pas de profile/user, afficher un message de chargement mais permettre au layout de s'afficher */}
        {(!profile || !user) && !hasNoAuth && (
          <div className="mb-4 sm:mb-6 flex justify-center py-8">
            <PadelLoader text="Chargement..." />
          </div>
        )}

        {/* Afficher le contenu principal seulement si profile et user existent */}
        {profile && user ? (
          <PlayerProfileTabs
            activeTab={activeTab}
            profilContent={profile ? <PadelTabContent profile={profile} /> : null}
            statsContent={
              <div className="flex flex-col items-center space-y-3 sm:space-y-4 md:space-y-6">
                <div className="w-full max-w-md">
                  <PlayerSummary profileId={profile.id} />
                </div>
                <a href="/match/new" className="inline-flex w-full max-w-md items-center justify-center rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base font-bold text-black transition-all hover:scale-105 bg-padel-green">Enregistrer un match</a>
                <div className="w-full max-w-md">
                  <ReferralSection userId={profile.id} />
                </div>
              </div>
            }
            badgesContent={<BadgesContent />}
          />
        ) : null}
      </div>
    </div>
  );
}