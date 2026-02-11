import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import MatchForm from "@/components/MatchForm";
import PageTitle from "@/components/PageTitle";
import MatchTabs from "@/components/MatchTabs";
import MatchHistoryContent from "@/components/MatchHistoryContent";
import FindPartnersTabContent from "@/components/FindPartnersTabContent";
import BoostContent from "@/components/BoostContent";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from '@/lib/logger';
import PadelLoader from "@/components/ui/PadelLoader";

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
  const activeTab = resolvedSearchParams?.tab === 'history' ? 'history' : resolvedSearchParams?.tab === 'partners' ? 'partners' : resolvedSearchParams?.tab === 'boost' ? 'boost' : 'record';

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="text-xl font-semibold">Accès restreint</h1>
        <p className="text-slate-600">Vous devez être connecté.</p>
      </div>
    );
  }

  // Récupérer le club du joueur en utilisant directement le client admin
  let clubId: string | null = null;
  let clubSlug: string | null = null;
  let clubName: string | null = null;

  try {
    const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
      .from("profiles")
      .select("club_id, club_slug, clubs(name)")
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
    } else {
      logger.warn("[Match/New] No profile found for user via admin client", {
        userId: user.id,
      });
    }
  } catch (e) {
    logger.error("[Match/New] Unexpected error when fetching profile via admin client", e);
  }



  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.15),transparent)] z-0 pointer-events-none" />
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#BFFF00] rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 pb-4 sm:pb-6 md:pb-8">
        <div className="mb-2 sm:mb-4">
          <PageTitle title="Matchs" subtitle={clubName ? `Club : ${clubName}` : undefined} />
        </div>
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
          <MatchTabs
            activeTab={activeTab}
            recordContent={<MatchForm selfId={user.id} />}
            historyContent={<MatchHistoryContent />}
            partnersContent={<FindPartnersTabContent />}
            boostContent={<BoostContent />}
          />
        </Suspense>
      </div>
    </div>
  );
}
