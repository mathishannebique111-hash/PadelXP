import { createClient as createServiceClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { calculatePlayerLeaderboard } from "@/lib/utils/player-leaderboard-utils";
import { getClubLogoPublicUrl } from "@/lib/utils/club-logo-utils";
import PublicLeaderboard from "./PublicLeaderboard";
import AutoRefresh from "./AutoRefresh";
import SeasonCountdown from "./SeasonCountdown";
import Image from "next/image";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  SUPABASE_URL && SERVICE_ROLE_KEY
    ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

export default async function ClubClassementPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!supabaseAdmin) return notFound();

  // Fetch club by slug
  const { data: club } = await supabaseAdmin
    .from("clubs")
    .select("id, name, logo_url")
    .eq("slug", slug)
    .maybeSingle();

  if (!club) return notFound();

  const clubId = club.id as string;
  const clubName = (club.name as string) || slug.toUpperCase();
  const clubLogoUrl = getClubLogoPublicUrl(club.logo_url as string | null);

  // Fetch active season for this club
  const { data: activeSeason } = await supabaseAdmin
    .from("seasons")
    .select("id, name, end_date")
    .eq("club_id", clubId)
    .eq("status", "active")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Use the exact same leaderboard calculation as the dashboard
  const leaderboardRaw = await calculatePlayerLeaderboard(clubId);
  const leaderboard = leaderboardRaw.map((player, index) => ({
    ...player,
    rank: index + 1,
  }));

  const totalPlayers = leaderboard.length;
  const totalMatches = leaderboard.reduce((sum, p) => sum + p.matches, 0);

  // Fetch first/last name maps for display
  const profilesFirstNameMap: Record<string, string> = {};
  const profilesLastNameMap: Record<string, string> = {};

  if (leaderboard.length > 0) {
    const userIds = leaderboard.filter((p) => !p.isGuest).map((p) => p.user_id);
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", userIds);

      if (profiles) {
        profiles.forEach((p: any) => {
          if (p.first_name) profilesFirstNameMap[p.id] = p.first_name;
          if (p.last_name) profilesLastNameMap[p.id] = p.last_name;
        });
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#071554] text-white px-4 sm:px-6 py-8 sm:py-12">
      <AutoRefresh intervalMs={30_000} />
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Logos + Club Header */}
        <div className="flex flex-col items-center text-center gap-4">
          <div className="flex items-center justify-center gap-4 sm:gap-5">
            {slug === "padelsquare4340" ? (
              <Image
                src="/images/logo-padel-square.webp"
                alt={clubName}
                width={72}
                height={72}
                className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-2xl object-cover shadow-lg"
                unoptimized
              />
            ) : clubLogoUrl ? (
              <Image
                src={clubLogoUrl}
                alt={clubName}
                width={72}
                height={72}
                className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-xl object-contain bg-white/5 border border-white/10 p-1"
                unoptimized
              />
            ) : null}
            <span className="text-white/20 text-2xl font-thin">&times;</span>
            <Image
              src="/images/Logo sans fond.png"
              alt="PadelXP"
              width={72}
              height={72}
              className="w-16 h-16 sm:w-[72px] sm:h-[72px] object-contain"
              unoptimized
            />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {clubName}
            </h1>
            <p className="text-sm text-white/50 mt-0.5">
              {totalPlayers} joueur{totalPlayers !== 1 ? "s" : ""} &middot;{" "}
              {totalMatches} match{totalMatches !== 1 ? "s" : ""}
            </p>
          </div>
          {activeSeason?.end_date && (
            <SeasonCountdown
              endDate={activeSeason.end_date as string}
              seasonName={activeSeason.name as string}
            />
          )}
        </div>

        {/* Leaderboard with podium — same visual as the app */}
        <PublicLeaderboard
          key={Date.now()}
          leaderboard={leaderboard}
          profilesFirstNameMap={profilesFirstNameMap}
          profilesLastNameMap={profilesLastNameMap}
        />
      </div>
    </div>
  );
}
