import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { getUserClubInfo } from "@/lib/utils/club-utils";
import { calculatePlayerLeaderboard } from "@/lib/utils/player-leaderboard-utils";
import PageTitle from "../PageTitle";
import Image from "next/image";
import LeaderboardContent from "@/components/LeaderboardContent";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

export default async function ClassementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/clubs/login?next=/dashboard/classement");
  }

  const { clubId } = await getUserClubInfo();

  if (!clubId) {
    return (
      <div className="space-y-4">
        <PageTitle title="Classement" />
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
          Aucun club n'est relié à ce compte. Ajoutez un club pour visualiser votre classement.
        </div>
      </div>
    );
  }

  // Utiliser la même fonction de calcul que la page profil du compte joueur pour obtenir les données identiques
  const leaderboardRaw = await calculatePlayerLeaderboard(clubId);
  const leaderboard = leaderboardRaw.map((player, index) => ({
    ...player,
    rank: index + 1,
  }));

  const totalPlayers = leaderboard.length;
  const totalMatches = leaderboard.reduce((sum, p) => sum + p.matches, 0);

  // Récupérer les profils pour l'affichage des noms (première partie en gras)
  const profilesFirstNameMap = new Map<string, string>();
  const profilesLastNameMap = new Map<string, string>();

  if (leaderboard.length > 0) {
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
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <PageTitle title="Classement" />
        <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
          <span
            className="group relative inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold text-white overflow-hidden ring-1 ring-white/20 border border-white/10"
            style={{ background: "linear-gradient(135deg, rgba(0,102,255,0.25) 0%, rgba(76,29,149,0.25) 100%)", boxShadow: "0 4px 14px rgba(0,0,0,0.25)" }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-800" />
            <Image
              src="/images/Membres page membres.png"
              alt="Membres"
              width={16}
              height={16}
              className="relative w-4 h-4 object-contain flex-shrink-0"
              unoptimized
            />
            <span className="relative">{totalPlayers} joueur{totalPlayers > 1 ? "s" : ""}</span>
          </span>
          <span
            className="group relative inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold text-white overflow-hidden ring-1 ring-white/20 border border-white/10"
            style={{ background: "linear-gradient(135deg, rgba(0,102,255,0.25) 0%, rgba(76,29,149,0.25) 100%)", boxShadow: "0 4px 14px rgba(0,0,0,0.25)" }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-800" />
            <Image
              src="/images/Historique des matchs joueur.png"
              alt="Historique"
              width={16}
              height={16}
              className="relative w-4 h-4 object-contain flex-shrink-0"
              unoptimized
            />
            <span className="relative">{totalMatches} match{totalMatches > 1 ? "s" : ""} comptabilisé{totalMatches > 1 ? "s" : ""}</span>
          </span>
        </div>
      </div>

      <LeaderboardContent
        initialLeaderboard={leaderboard}
        initialProfilesFirstNameMap={profilesFirstNameMap}
        initialProfilesLastNameMap={profilesLastNameMap}
      />
    </div>
  );
}



