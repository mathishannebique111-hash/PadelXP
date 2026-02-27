import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import ReferralNotifier from "@/components/ReferralNotifier";
import ReferralSection from "@/components/ReferralSection";
import TierBadge from "@/components/TierBadge";
import RankBadge from "@/components/RankBadge";
import Link from "next/link";
import PageTitle from "@/components/PageTitle";
import { getUserClubInfo, getClubPublicExtras } from "@/lib/utils/club-utils";
import { getClubLogoPublicUrl } from "@/lib/utils/club-logo-utils";
import Image from "next/image";
import { logger } from '@/lib/logger';
import PlayerProfileTabs from "@/components/PlayerProfileTabs";
import PadelTabContent from "@/components/PadelTabContent";
import BadgesContent from "@/components/BadgesContent";
import HideSplashScreen from "@/components/HideSplashScreen";
import PadelLoader from "@/components/ui/PadelLoader";
import nextDynamic from "next/dynamic";
import ChallengeHighlightBar from "@/components/challenges/ChallengeHighlightBar";

const PremiumStats = nextDynamic(() => import("@/components/club/PremiumStats"), {
  loading: () => <div className="p-8 text-slate-500 text-center"><PadelLoader /></div>
});

const JoinClubSection = nextDynamic(() => import("@/components/club/JoinClubSection"), {
  loading: () => <PadelLoader />
});

const ClubProfileClient = nextDynamic(() => import("@/components/club/ClubProfileClient"), {
  loading: () => <PadelLoader />
});

const PlayerSummary = nextDynamic(() => import("@/components/PlayerSummary"), {
  loading: () => <div className="w-full max-w-md p-4 flex justify-center"><PadelLoader /></div>
});


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
  const activeTab: 'profil' | 'stats' | 'badges' | 'club' = (resolvedSearchParams?.tab === 'stats' || resolvedSearchParams?.tab === 'badges' || resolvedSearchParams?.tab === 'club')
    ? (resolvedSearchParams.tab as 'stats' | 'badges' | 'club')
    : 'profil';

  // 1. Démarrer toutes les requêtes indépendantes en parallèle
  const [userResult, sessionResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession()
  ]);

  const { data: { user }, error: userError } = userResult;
  const session = sessionResult.data.session;

  // Si session mais pas user, log le warning
  const hasSessionButNoUser = session && !user && userError;
  if (hasSessionButNoUser) {
    logger.warn("[HomePage] Session exists but getUser() failed", { errorCode: userError?.code });
  }

  // Préparer les données
  let profile: any = null; // Legacy 'any' for profile as it has many fields
  let clubName: string | null = null;
  let clubLogoUrl: string | null = null;
  let pendingPartnershipRequestsCount = 0;
  let pendingPartnershipRequestSender: { first_name: string; last_name: string } | null = null;

  if (user) {
    // 2. Paralléliser récupération Profil + Club et Partenariats
    const [profileResult, partnershipsResult] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("*, clubs(*)")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from('player_partnerships')
        .select('player_id, status')
        .eq('partner_id', user.id)
        .eq('status', 'pending')
    ]);

    profile = profileResult.data;

    if (!profile) {
      const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Joueur";
      const { data: insertedData } = await supabase.from("profiles").insert({ id: user.id, display_name: displayName }).select().single();
      profile = insertedData || { id: user.id, display_name: displayName };
    }

    if (profile?.is_admin) redirect("/admin/messages");
    if (profile && !profile.has_completed_onboarding) redirect("/player/onboarding");

    if (profile?.club_id && profile.clubs) {
      const club = profile.clubs;
      clubName = club.name;
      clubLogoUrl = getClubLogoPublicUrl(club.logo_url);
    }

    if (partnershipsResult.data && partnershipsResult.data.length > 0) {
      pendingPartnershipRequestsCount = partnershipsResult.data.length;
      const firstRequest = partnershipsResult.data[0];
      const { data: senderHelper } = await supabase.from('profiles').select('first_name, last_name').eq('id', firstRequest.player_id).single();
      if (senderHelper) {
        pendingPartnershipRequestSender = {
          first_name: senderHelper.first_name || '',
          last_name: senderHelper.last_name || ''
        };
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

  // 4. Fetch full club object for ClubProfileClient if needed
  let fullClubData: any = null;
  if (profile?.club_id) {
    const [clubRecordResult, extras] = await Promise.all([
      supabaseAdmin
        .from("clubs")
        .select("*")
        .eq("id", profile.club_id)
        .maybeSingle(),
      getClubPublicExtras(profile.club_id)
    ]);

    const clubRecord = clubRecordResult.data;
    if (clubRecord) {
      const addressLineParts: string[] = [];
      const addressValue = clubRecord.address ?? extras?.address ?? null;
      const postalValue = clubRecord.postal_code ?? extras?.postal_code ?? null;
      const cityValue = clubRecord.city ?? extras?.city ?? null;

      if (addressValue) addressLineParts.push(addressValue);
      if (postalValue) addressLineParts.push(postalValue);
      if (cityValue) addressLineParts.push(cityValue);

      fullClubData = {
        ...clubRecord,
        description: extras?.description ?? null,
        address_line: addressLineParts.length ? addressLineParts.join(" · ") : null,
        phone: clubRecord.phone ?? extras?.phone ?? null,
        website: clubRecord.website ?? extras?.website ?? null,
        number_of_courts: clubRecord.number_of_courts ?? extras?.number_of_courts ?? null,
        court_type: clubRecord.court_type ?? extras?.court_type ?? null,
        opening_hours: extras?.opening_hours ?? null,
      };
    }
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

      <div className="relative z-10 mx-auto w-full max-w-7xl px-1.5 sm:px-4 md:px-6 lg:px-8 pb-4 sm:pb-6 md:pb-8">

        {/* Alerts Block */}
        {/* hasNoClub warning removed */}
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
                title={`Bienvenue ${profile.first_name && profile.last_name ? `${profile.first_name} ${profile.last_name}` : profile.display_name} !`}
                subtitle={
                  clubName
                    ? `Club : ${clubName}${profile.username ? ` • ${profile.username}` : ''}`
                    : profile.username || undefined
                }
              />
            </div>

            <Suspense fallback={<div className="h-20" />}>
              <ChallengeHighlightBar />
            </Suspense>

            <PlayerProfileTabs
              activeTab={activeTab}
              initialPendingRequestsCount={pendingPartnershipRequestsCount}
              profilContent={
                <Suspense fallback={<div className="py-8 flex justify-center"><PadelLoader /></div>}>
                  <PadelTabContent
                    profile={profile}
                    initialPendingRequest={pendingPartnershipRequestSender}
                  />
                </Suspense>
              }
              statsContent={
                <div className="space-y-6">
                  <div className="flex flex-col items-center space-y-3 sm:space-y-4 md:space-y-6">
                    <div className="w-full max-w-md">
                      <Suspense fallback={<div className="h-40 bg-white/5 rounded-2xl animate-pulse" />}>
                        <PlayerSummary profileId={profile.id} />
                      </Suspense>
                    </div>
                  </div>
                  <Suspense fallback={<div className="h-80 bg-white/5 rounded-3xl animate-pulse" />}>
                    <PremiumStats />
                  </Suspense>
                </div>
              }
              badgesContent={
                <Suspense fallback={<div className="py-8 flex justify-center"><PadelLoader /></div>}>
                  <BadgesContent />
                </Suspense>
              }
              clubContent={
                profile.club_id && fullClubData ? (
                  <Suspense fallback={<div className="py-8 flex justify-center"><PadelLoader /></div>}>
                    <ClubProfileClient
                      clubId={fullClubData.id}
                      name={fullClubData.name}
                      logoUrl={getClubLogoPublicUrl(fullClubData.logo_url)}
                      description={fullClubData.description}
                      addressLine={fullClubData.address_line}
                      phone={fullClubData.phone}
                      website={fullClubData.website}
                      numberOfCourts={fullClubData.number_of_courts}
                      courtType={fullClubData.court_type}
                      openingHours={fullClubData.opening_hours}
                    />
                  </Suspense>
                ) : (
                  <Suspense fallback={<div className="py-8 flex justify-center"><PadelLoader /></div>}>
                    <JoinClubSection />
                  </Suspense>
                )
              }
            />
          </>
        )}

        {/* Fallback Loader for Initial Render */}
        {(!profile || !user) && !hasNoAuth && (
          <div className="fixed inset-0 flex items-center justify-center bg-[#172554] z-50">
            <PadelLoader text="Initialisation..." />
          </div>
        )}
      </div>
    </div>
  );
}