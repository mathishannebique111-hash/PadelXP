import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import PageTitle from "@/components/PageTitle";
import ClubProfileClient from "@/components/club/ClubProfileClient";
import ClubTabs from "@/components/club/ClubTabs";
import LeaderboardContent from "@/components/LeaderboardContent";
import ChallengesContent from "@/components/ChallengesContent";
import TournamentsContent from "@/components/club/TournamentsContent"; // Import ajouté
import { getUserClubInfo, getClubPublicExtras } from "@/lib/utils/club-utils";
import { getClubLogoPublicUrl } from "@/lib/utils/club-logo-utils";
import { calculatePlayerLeaderboard } from "@/lib/utils/player-leaderboard-utils";
import { logger } from '@/lib/logger';

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
  const { data: { user } } = await supabase.auth.getUser();
  const activeTab = resolvedSearchParams?.tab === 'classement' ? 'classement' : resolvedSearchParams?.tab === 'challenges' ? 'challenges' : resolvedSearchParams?.tab === 'tournaments' ? 'tournaments' : 'club';

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

  // Récupérer les informations du club
  const { clubId: initialClubId, clubSlug: initialClubSlug, clubName: initialClubName, clubLogoUrl: initialClubLogoUrl } = await getUserClubInfo();

  let clubId = initialClubId;
  let clubSlug = initialClubSlug;
  let finalClubName = initialClubName;
  let finalClubLogoUrl = initialClubLogoUrl;

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

  // Récupérer les données détaillées du club
  let clubData: {
    name: string;
    logoUrl: string | null;
    description: string | null;
    addressLine: string | null;
    phone: string | null;
    website: string | null;
    numberOfCourts: number | null;
    courtType: string | null;
    openingHours: any;
  } | null = null;

  if (clubId || clubSlug) {
    try {
      const resolvedClubId = clubId || (clubSlug ? (await supabase.from("clubs").select("id").eq("slug", clubSlug).maybeSingle()).data?.id : null);

      if (resolvedClubId && supabaseAdmin) {
        const { data: clubRecord } = await supabaseAdmin
          .from("clubs")
          .select("*")
          .eq("id", resolvedClubId)
          .maybeSingle();

        if (clubRecord) {
          finalClubName = clubRecord.name || finalClubName;
          const rawLogoUrl = clubRecord.logo_url;
          if (rawLogoUrl) {
            finalClubLogoUrl = getClubLogoPublicUrl(rawLogoUrl);
          }
        }
      }

      const extras = clubId ? await getClubPublicExtras(clubId) : null;

      if (!finalClubLogoUrl && resolvedClubId && supabaseAdmin) {
        const { data: clubAdmins } = await supabaseAdmin
          .from("club_admins")
          .select("user_id")
          .eq("club_id", resolvedClubId)
          .limit(3);

        if (clubAdmins) {
          for (const admin of clubAdmins) {
            const { data: adminUser } = await supabaseAdmin.auth.admin.getUserById(admin.user_id);
            if (adminUser?.user?.user_metadata?.club_logo_url) {
              finalClubLogoUrl = getClubLogoPublicUrl(adminUser.user.user_metadata.club_logo_url);
              break;
            }
          }
        }
      }

      if (finalClubName && clubId) {
        const clubRecord = (await supabaseAdmin?.from("clubs").select("address, postal_code, city, phone, website, number_of_courts, court_type").eq("id", clubId).maybeSingle())?.data;
        const addressLineParts: string[] = [];

        const addressValue = clubRecord?.address ?? extras?.address ?? null;
        const postalValue = clubRecord?.postal_code ?? extras?.postal_code ?? null;
        const cityValue = clubRecord?.city ?? extras?.city ?? null;

        if (addressValue) addressLineParts.push(addressValue);
        if (postalValue) addressLineParts.push(postalValue);
        if (cityValue) addressLineParts.push(cityValue);

        clubData = {
          name: finalClubName,
          logoUrl: finalClubLogoUrl,
          description: extras?.description ?? null,
          addressLine: addressLineParts.length ? addressLineParts.join(" · ") : null,
          phone: clubRecord?.phone ?? extras?.phone ?? null,
          website: clubRecord?.website ?? extras?.website ?? null,
          numberOfCourts: clubRecord?.number_of_courts ?? extras?.number_of_courts ?? null,
          courtType: clubRecord?.court_type ?? extras?.court_type ?? null,
          openingHours: extras?.opening_hours ?? null,
        };
      }
    } catch (error) {
      logger.error("[Club] Erreur lors de la récupération des données:", error);
    }
  }

  // Récupérer le leaderboard pour l'onglet classement
  const leaderboardRaw = clubId ? await calculatePlayerLeaderboard(clubId) : [];
  const leaderboard = leaderboardRaw.map((player, index) => ({
    ...player,
    rank: index + 1,
  }));

  // Récupérer les profils pour les noms
  const profilesFirstNameMap = new Map<string, string>();
  const profilesLastNameMap = new Map<string, string>();

  if (leaderboard.length > 0 && clubId) {
    const userIds = leaderboard.filter(p => !p.isGuest).map(p => p.user_id);
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", userIds)
        .eq("club_id", clubId);

      if (profiles) {
        profiles.forEach(p => {
          if (p.first_name) profilesFirstNameMap.set(p.id, p.first_name);
          if (p.last_name) profilesLastNameMap.set(p.id, p.last_name);
        });
      }
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background inherited from layout */}

      <div className="relative z-10 mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-4 md:pt-8 pb-4 sm:pb-6 md:pb-8">
        <PageTitle title="Mon club" subtitle={finalClubName || "Informations sur votre club"} />

        {!clubId && (
          <div className="mt-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6 text-sm text-yellow-200">
            <p className="font-semibold mb-1">⚠️ Club non défini</p>
            <p>Vous devez être rattaché à un club pour accéder à cette page.</p>
          </div>
        )}

        {clubId && (
          <div className="mt-6">
            <Suspense fallback={
              <div className="w-full">
                <div className="grid grid-cols-4 w-full mb-4 sm:mb-6 border-b border-white/10">
                  <div className="px-1 sm:px-2 py-2 sm:py-3 text-[10px] sm:text-sm font-semibold text-white/60 text-center flex items-center justify-center">
                    <span className="text-center whitespace-normal leading-tight">Mon club</span>
                  </div>
                  <div className="px-1 sm:px-2 py-2 sm:py-3 text-[10px] sm:text-sm font-semibold text-white/60 text-center flex items-center justify-center">
                    <span className="text-center whitespace-normal leading-tight">Classement global</span>
                  </div>
                  <div className="px-1 sm:px-2 py-2 sm:py-3 text-[10px] sm:text-sm font-semibold text-white/60 text-center flex items-center justify-center">
                    <span className="text-center whitespace-normal leading-tight">Challenges</span>
                  </div>
                  <div className="px-1 sm:px-2 py-2 sm:py-3 text-[10px] sm:text-sm font-semibold text-white/60 text-center flex items-center justify-center">
                    <span className="text-center whitespace-normal leading-tight">Tournois</span>
                  </div>
                </div>
                <div className="mt-4 sm:mt-6 flex items-center justify-center">
                  <div className="text-white/60">Chargement...</div>
                </div>
              </div>
            }>
              <ClubTabs
                activeTab={activeTab}
                clubContent={
                  clubData ? (
                    <ClubProfileClient
                      clubId={clubId}
                      name={clubData.name}
                      logoUrl={clubData.logoUrl}
                      description={clubData.description}
                      addressLine={clubData.addressLine}
                      phone={clubData.phone}
                      website={clubData.website}
                      numberOfCourts={clubData.numberOfCourts}
                      courtType={clubData.courtType}
                      openingHours={clubData.openingHours}
                    />
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
                      <p>Erreur lors du chargement des informations du club.</p>
                    </div>
                  )
                }
                leaderboardContent={
                  <LeaderboardContent
                    initialLeaderboard={leaderboard}
                    initialProfilesFirstNameMap={profilesFirstNameMap}
                    initialProfilesLastNameMap={profilesLastNameMap}
                    currentUserId={user?.id}
                  />
                }
                challengesContent={<ChallengesContent />}
                tournamentsContent={<TournamentsContent />}
              />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}
