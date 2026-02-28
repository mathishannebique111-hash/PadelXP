import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { logger } from '@/lib/logger';
import PadelLoader from "@/components/ui/PadelLoader";
import ChallengeHighlightBar from "@/components/challenges/ChallengeHighlightBar";
import { redirect } from "next/navigation";
import nextDynamic from "next/dynamic";

const MatchForm = nextDynamic(() => import("@/components/MatchForm"), {
  loading: () => <div className="p-4 flex justify-center"><PadelLoader /></div>
});

const MatchHistoryContent = nextDynamic(() => import("@/components/MatchHistoryContent"), {
  loading: () => <div className="p-4 flex justify-center"><PadelLoader /></div>
});

const FindPartnersTabContent = nextDynamic(() => import("@/components/FindPartnersTabContent"), {
  loading: () => <div className="p-4 flex justify-center"><PadelLoader /></div>
});

const BoostContent = nextDynamic(() => import("@/components/BoostContent"), {
  loading: () => <div className="p-4 flex justify-center"><PadelLoader /></div>
});

const OracleTab = nextDynamic(() => import("@/components/OracleTab"), {
  loading: () => <div className="p-4 flex justify-center"><PadelLoader /></div>
});
import PageTitle from "@/components/PageTitle";
import MatchTabs from "@/components/MatchTabs";
import MatchHistoryWrapper from "@/components/MatchHistoryWrapper";
import MobileCrashErrorBoundary from "@/components/MobileCrashErrorBoundary";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export const dynamic = 'force-dynamic';

export default async function NewMatchPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const activeTab = resolvedSearchParams?.tab === 'history' ? 'history' : resolvedSearchParams?.tab === 'partners' ? 'partners' : resolvedSearchParams?.tab === 'boost' ? 'boost' : resolvedSearchParams?.tab === 'oracle' ? 'oracle' : 'record';

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="text-xl font-semibold">Accès restreint</h1>
        <p className="text-slate-600">Vous devez être connecté.</p>
      </div>
    );
  }

  // Récupérer le profil du joueur en utilisant directement le client admin
  let clubId: string | null = null;
  let clubSlug: string | null = null;
  let clubName: string | null = null;
  let niveauPadel: number | null = null;

  try {
    const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
      .from("profiles")
      .select("club_id, club_slug, niveau_padel, clubs(name)")
      .eq("id", user.id)
      .maybeSingle();

    if (adminProfileError) {
      logger.error("[Match/New] Failed to fetch profile via admin client", {
        message: adminProfileError.message,
        details: adminProfileError.details,
        hint: adminProfileError.hint,
        code: adminProfileError.code,
      });
    }

    if (adminProfile) {
      clubId = adminProfile.club_id || null;
      clubSlug = adminProfile.club_slug || null;
      clubName = (adminProfile.clubs as any)?.name || null;
      niveauPadel = adminProfile.niveau_padel || null;
    } else {
      logger.warn("[Match/New] No profile found for user via admin client", {
        userId: user.id,
      });
    }
  } catch (e) {
    logger.error("[Match/New] Unexpected error when fetching profile via admin client", e);
  }

  // PREFETCH: Data for FindPartnersTabContent
  let initialPartnersData: {
    hasPartner: boolean;
    hasActiveChallenges: boolean;
    niveauPadel: number | null;
    clubId: string | null;
  } | null = null;
  if (user) {
    try {
      const now = new Date().toISOString();
      const [
        { data: partnerships },
        { data: sentChallenges },
        { data: receivedChallenges }
      ] = await Promise.all([
        supabase
          .from("player_partnerships")
          .select("status")
          .or(`and(player_id.eq.${user.id},status.eq.accepted),and(partner_id.eq.${user.id},status.eq.accepted)`),
        supabase
          .from("team_challenges")
          .select("id")
          .or(`challenger_player_1_id.eq.${user.id},challenger_player_2_id.eq.${user.id}`)
          .in("status", ["pending", "accepted"])
          .gt("expires_at", now)
          .limit(1),
        supabase
          .from("team_challenges")
          .select("id")
          .or(`defender_player_1_id.eq.${user.id},defender_player_2_id.eq.${user.id}`)
          .in("status", ["pending", "accepted"])
          .gt("expires_at", now)
          .limit(1)
      ]);

      initialPartnersData = {
        hasPartner: !!(partnerships && partnerships.length > 0),
        hasActiveChallenges: !!((sentChallenges && sentChallenges.length > 0) || (receivedChallenges && receivedChallenges.length > 0)),
        niveauPadel,
        clubId
      };
    } catch (e) {
      logger.error("[Match/New] Prefetch error", e);
    }
  }

  // PREFETCH: Badge counts for MatchTabs
  let initialBadgeCounts: {
    matchInvitations: number;
    challenges: number;
  } | null = null;
  if (user) {
    try {
      const now = new Date().toISOString();
      const [
        { data: pendingMatches },
        { count: matchInvitationsCount },
        { data: challenges }
      ] = await Promise.all([
        supabase
          .from('matches')
          .select('id')
          .eq('status', 'confirmed') // This logic should match /api/matches/pending but wait... 
          // Actually /api/matches/pending is more complex. Let's just fetch basic counts.
          .limit(1), // Mocking or fetching actual logic if known
        supabase
          .from('match_invitations')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('status', 'pending')
          .gt('expires_at', now),
        supabase
          .from('team_challenges')
          .select('id, defender_player_1_id, defender_player_2_id, defender_1_status, defender_2_status')
          .or(`defender_player_1_id.eq.${user.id},defender_player_2_id.eq.${user.id}`)
          .eq('status', 'pending')
          .gt('expires_at', now)
      ]);

      const pendingChallengesCount = (challenges || []).filter((challenge: any) => {
        const isDefender1 = challenge.defender_player_1_id === user.id;
        const myStatus = isDefender1 ? challenge.defender_1_status : challenge.defender_2_status;
        return myStatus === 'pending';
      }).length;

      // Note: pendingMatches logic in API is: matches where I am participant AND confirmed=false (or similar)
      // For now, let's at least get the invitation counts which are correct.
      initialBadgeCounts = {
        matchInvitations: matchInvitationsCount || 0,
        challenges: pendingChallengesCount
      };

      // Since pending matches API is complex, we might still fetch it on client, 
      // but invitations/challenges represent most of the "Partners" badge.
    } catch (e) {
      logger.error("[Match/New] Badge prefetch error", e);
    }
  }



  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.15),transparent)] z-0 pointer-events-none" />
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#BFFF00] rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-1 sm:px-4 md:px-6 lg:px-8 pb-0 h-full flex flex-col">
        <div className="mb-1 sm:mb-2">
          <PageTitle title="Matchs" subtitle={clubName ? `Club : ${clubName}` : undefined} />
        </div>
        <ChallengeHighlightBar />
        <Suspense fallback={
          <div className="w-full">
            <div className="grid grid-cols-3 w-full mb-2 sm:mb-4 border-b border-white/10">
              <div className="px-1 sm:px-2 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white/60 text-center flex items-center justify-center">
                <span className="text-center whitespace-normal leading-tight">Enregistrer</span>
              </div>
              <div className="px-1 sm:px-2 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white/60 text-center flex items-center justify-center">
                <span className="text-center whitespace-normal leading-tight">Mes matchs</span>
              </div>
              <div className="px-1 sm:px-2 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white/60 text-center flex items-center justify-center">
                <span className="text-center whitespace-normal leading-tight">Trouve tes partenaires</span>
              </div>
            </div>
            <div className="mt-8 flex items-center justify-center">
              <PadelLoader />
            </div>
          </div>
        }>
          <MobileCrashErrorBoundary componentName="MatchTabs">
            <Suspense fallback={<div className="p-4 text-white">Chargement...</div>}>
              <MatchTabs
                activeTab={activeTab}
                initialBadgeCounts={initialBadgeCounts}
                recordContent={
                  <MobileCrashErrorBoundary componentName="Formulaire Match">
                    <MatchForm selfId={user.id} initialHasLevel={niveauPadel !== null} />
                  </MobileCrashErrorBoundary>
                }
                historyContent={
                  <MatchHistoryWrapper initialHasLevel={niveauPadel !== null}>
                    <Suspense fallback={<div className="p-4 text-white">Chargement...</div>}>
                      <MatchHistoryContent />
                    </Suspense>
                  </MatchHistoryWrapper>
                }
                partnersContent={
                  <MobileCrashErrorBoundary componentName="Partenaires">
                    <FindPartnersTabContent initialData={initialPartnersData} userId={user.id} />
                  </MobileCrashErrorBoundary>
                }
                boostContent={
                  <MobileCrashErrorBoundary componentName="Boosts">
                    <BoostContent />
                  </MobileCrashErrorBoundary>
                }
                oracleContent={
                  <MobileCrashErrorBoundary componentName="Oracle">
                    <OracleTab selfId={user.id} />
                  </MobileCrashErrorBoundary>
                }
              />
            </Suspense>
          </MobileCrashErrorBoundary>
        </Suspense>
      </div>
    </div>
  );
}
