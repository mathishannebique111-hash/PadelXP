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
import PremiumStats from "@/components/club/PremiumStats";


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

  // 1. Démarrer toutes les requêtes indépendantes en parallèle
  const { data: { session } } = await supabase.auth.getSession();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  // Si session mais pas user, log le warning
  const hasSessionButNoUser = session && !user && userError;
  if (hasSessionButNoUser) {
    logger.warn("[HomePage] Session exists but getUser() failed (temporary error?):", {
      errorCode: userError?.code,
      errorMessage: userError?.message,
    });
  }

  // Préparer les données
  let profile: any = null;
  let clubName: string | null = null;
  let clubLogoUrl: string | null = null;
  let pendingPartnershipRequestsCount = 0;
  let pendingPartnershipRequestSender: { first_name: string; last_name: string } | null = null;

  if (user) {
    // 2. Paralléliser récupération Profil + Club (si possible) et Partenariats
    // On ne peut pas facilement tout joindre si les FK ne sont pas STRICTES,
    // mais on peut lancer les promesses en //

    // A. Récupération Profil
    const profilePromise = (async () => {
      let fetchedProfile = null;
      // Essai standard
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      fetchedProfile = data;

      // Fallback Admin si échec
      if (!fetchedProfile || !fetchedProfile.club_id) {
        try {
          const { data: adminProfile } = await supabaseAdmin
            .from("profiles")
            .select("id, display_name, first_name, last_name, email, club_id, club_slug, username")
            .eq("id", user.id)
            .maybeSingle();
          if (adminProfile) {
            fetchedProfile = fetchedProfile ? { ...fetchedProfile, ...adminProfile } : adminProfile;
          }
        } catch (e) {
          logger.error("[Home] Unexpected error fetching admin profile", e);
        }
      }
      return fetchedProfile;
    })();

    // B. Récupération Partenariats (Pending Requests)
    // On cherche les demandes OÙ partner_id = moi ET status = 'pending'
    const partnershipsPromise = supabase
      .from('player_partnerships')
      .select('player_id, status') // on a besoin de l'ID du sender (player_id)
      .eq('partner_id', user.id)
      .eq('status', 'pending');

    // Attendre les deux
    const [fetchedProfile, partnershipsResult] = await Promise.all([profilePromise, partnershipsPromise]);
    profile = fetchedProfile;

    // Gestion Création Profil si absent
    if (!profile && user) {
      const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Joueur";
      const { data: insertedData } = await supabase
        .from("profiles")
        .insert({ id: user.id, display_name: displayName })
        .select()
        .single();
      if (insertedData) profile = insertedData;
      else profile = { id: user.id, display_name: displayName };
    }

    // Gestion Admin redirect
    if (profile?.is_admin) redirect("/admin/messages");
    if (profile && !profile.has_completed_onboarding) redirect("/player/onboarding");

    // Traitement des partenariats
    if (partnershipsResult.data) {
      pendingPartnershipRequestsCount = partnershipsResult.data.length;

      // S'il y a des demandes, on veut savoir QUI (pour l'afficher dans l'onglet)
      // On prend le premier
      const firstRequest = partnershipsResult.data[0];
      if (firstRequest) {
        const { data: senderHelper } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', firstRequest.player_id)
          .single();
        if (senderHelper) {
          pendingPartnershipRequestSender = {
            first_name: senderHelper.first_name || '',
            last_name: senderHelper.last_name || ''
          };
        }
      }
    }

    // 3. Récupération Info Club (si profile existe)
    if (profile?.club_id) {
      // Optimisation : Tenter de récupérer le club directement
      // Note: On pourrait aussi paralleliser ça avec les partenariats si on avait le club_id avant,
      // mais on a besoin du profil pour avoir le club_id.
      // Cependant, c'est déjà beaucoup mieux que le client-side waterfall.

      let fetchedClub: { name: any; logo_url: any; } | null = null;

      // Essai Admin (plus fiable pour les données club)
      const { data: clubData } = await supabaseAdmin
        .from("clubs")
        .select("id, name, logo_url")
        .eq("id", profile.club_id)
        .maybeSingle();

      if (clubData) fetchedClub = clubData;
      else {
        // Fallback standard
        const { data: stdClub } = await supabase
          .from("clubs")
          .select("id, name, logo_url")
          .eq("id", profile.club_id)
          .maybeSingle();
        fetchedClub = stdClub;
      }

      if (fetchedClub) {
        clubName = fetchedClub.name;
        clubLogoUrl = getClubLogoPublicUrl(fetchedClub.logo_url);
      }
    }
  }

  // Fallback final Club Info
  if ((!clubName || !clubLogoUrl) && !profile?.club_id) {
    // Usage très rare ou legacy
    const clubInfo = await getUserClubInfo();
    clubName = clubName ?? clubInfo.clubName ?? null;
    clubLogoUrl = clubLogoUrl ?? clubInfo.clubLogoUrl ?? null;
  }

  // Fallback Profile Display
  if (!profile && !user && !hasSessionButNoUser) {
    // Cas où vraiment rien n'est chargé, on laisse le loader ou on redirige
    // Mais on veut afficher le layout.
    profile = { id: 'loading', display_name: 'Chargement...' };
  }

  const hasNoAuth = !user && !session;
  const hasNoClub = profile && profile.id !== 'loading' && !profile.club_id;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <HideSplashScreen />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.15),transparent)] z-0 pointer-events-none" />
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#BFFF00] rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 pb-4 sm:pb-6 md:pb-8">

        {/* Alerts Block */}
        {hasNoClub && (
          <div className="mb-4 sm:mb-6 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 p-4 text-sm text-yellow-200">
            <p className="font-semibold mb-1">⚠️ Club non défini</p>
            <p>Vous devez être rattaché à un club pour accéder au classement. Contactez votre club pour obtenir un code d'invitation.</p>
          </div>
        )}
        {hasNoAuth && (
          <div className="mb-4 sm:mb-6 rounded-2xl bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-200">
            <p className="font-semibold mb-1">⚠️ Session requise</p>
            <p>Veuillez vous connecter pour accéder à votre espace joueur.</p>
            <a className="text-blue-400 underline mt-2 inline-block" href="/login">Se connecter</a>
          </div>
        )}
        {hasSessionButNoUser && (
          <div className="mb-4 sm:mb-6 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 p-4 text-sm text-yellow-200 flex flex-col items-center justify-center min-h-[150px]">
            <PadelLoader />
          </div>
        )}

        {/* Content Block */}
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

            <PlayerProfileTabs
              activeTab={activeTab}
              initialPendingRequestsCount={pendingPartnershipRequestsCount}
              profilContent={
                <PadelTabContent
                  profile={profile}
                  initialPendingRequest={pendingPartnershipRequestSender}
                />
              }
              statsContent={
                <div className="space-y-6">
                  <div className="flex flex-col items-center space-y-3 sm:space-y-4 md:space-y-6">
                    <div className="w-full max-w-md">
                      <PlayerSummary profileId={profile.id} />
                    </div>
                    {/* ... other stats components ... */}
                  </div>
                  <PremiumStats />
                </div>
              }
              badgesContent={<BadgesContent />}
            />
          </>
        )}

        {/* Fallback Loader */}
        {(!profile || !user) && !hasNoAuth && !hasSessionButNoUser && (
          <div className="mb-4 sm:mb-6 flex justify-center py-8">
            <PadelLoader />
          </div>
        )}
      </div>
    </div>
  );
}