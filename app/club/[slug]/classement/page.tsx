import { createClient as createServiceClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { calculatePlayerLeaderboard } from "@/lib/utils/player-leaderboard-utils";
import { getClubLogoPublicUrl } from "@/lib/utils/club-logo-utils";
import PublicLeaderboard from "./PublicLeaderboard";
import AutoRefresh from "./AutoRefresh";
import SeasonCountdown from "./SeasonCountdown";
import QRCodeBlock from "./QRCodeBlock";
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
    .select("name, end_date")
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
    <div className="min-h-screen bg-[#071554] text-white px-3 sm:px-6 py-2 sm:py-6">
      <AutoRefresh intervalMs={30_000} />
      <div className="max-w-5xl mx-auto space-y-2 sm:space-y-4">
        {/* Header: logos left, countdown center, QR code right */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {slug === "padelsquare4340" ? (
              <Image
                src="/images/logo-padel-square.webp"
                alt={clubName}
                width={56}
                height={56}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover shadow-lg"
                unoptimized
              />
            ) : clubLogoUrl ? (
              <Image
                src={clubLogoUrl}
                alt={clubName}
                width={56}
                height={56}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-contain bg-white/5 border border-white/10 p-1"
                unoptimized
              />
            ) : null}
            <span className="text-white text-lg font-light">&#x2715;</span>
            <Image
              src="/images/Logo sans fond.png"
              alt="PadelXP"
              width={96}
              height={96}
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
              unoptimized
            />
          </div>
          {activeSeason?.end_date && (
            <div className="flex-1 flex justify-center">
              <SeasonCountdown
                endDate={activeSeason.end_date as string}
                seasonName={activeSeason.name as string}
              />
            </div>
          )}
          <QRCodeBlock />
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
