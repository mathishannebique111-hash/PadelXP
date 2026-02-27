import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import PageTitle from "@/components/PageTitle";
import ClubTabs from "@/components/club/ClubTabs";
import ChallengesContent from "@/components/ChallengesContent";
import TournamentsContent from "@/components/club/TournamentsContent";
import { getUserClubInfo } from "@/lib/utils/club-utils";
import { logger } from '@/lib/logger';
import PadelLoader from "@/components/ui/PadelLoader";
import ChallengeHighlightBar from "@/components/challenges/ChallengeHighlightBar";
import LeaderboardServer from "@/components/club/LeaderboardServer";

export const dynamic = "force-dynamic";

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

export default async function ClubPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();

  // 1. Démarrer les requêtes de base
  const authResponse = await supabase.auth.getUser();
  const user = authResponse.data.user;

  const clubInfoResult = await getUserClubInfo(user);
  let { clubId, clubSlug } = clubInfoResult;

  if (!user) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-blue-950 via-black to-black">
        <div className="relative z-10 mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 pt-16 sm:pt-20 md:pt-24 lg:pt-12 pb-4 sm:pb-6 md:pb-8">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
            <p className="font-semibold mb-1">⚠️ Session requise</p>
            <p>Veuillez vous connecter pour accéder à votre club.</p>
            <a className="text-blue-400 underline mt-2 inline-block" href="/login">Se connecter</a>
          </div>
        </div>
      </div>
    );
  }

  // 2. Si club non trouvé via les utils, vérifier le profil via Admin
  if (!clubId && supabaseAdmin) {
    const { data: adminProfile } = await supabaseAdmin
      .from("profiles")
      .select("club_id, club_slug")
      .eq("id", user.id)
      .maybeSingle();

    if (adminProfile) {
      clubId = adminProfile.club_id;
      clubSlug = adminProfile.club_slug;
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="relative z-10 mx-auto w-full max-w-7xl px-1.5 sm:px-4 md:px-6 lg:px-8 pb-4 sm:pb-6 md:pb-8">
        <div className="mb-4 sm:mb-6">
          <PageTitle title="Espace Compétition" />
        </div>

        <ChallengeHighlightBar />

        <div className="mt-4 sm:mt-6">
          <ClubTabs
            leaderboardContent={
              <Suspense fallback={<div className="mt-8 flex items-center justify-center"><PadelLoader text="Chargement classement..." /></div>}>
                <LeaderboardServer userId={user.id} clubId={clubId} />
              </Suspense>
            }
            challengesContent={<ChallengesContent userId={user.id} clubId={clubId} />}
            tournamentsContent={<TournamentsContent />}
          />
        </div>
      </div>
    </div>
  );
}
