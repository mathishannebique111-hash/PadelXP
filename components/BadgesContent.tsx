import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import Link from "next/link";
import Image from "next/image";
import { ALL_BADGES, getBadges, type PlayerStats } from "@/lib/badges";
import BadgesUnlockNotifier from "@/components/BadgesUnlockNotifier";
import BadgeIconDisplay from "@/components/BadgeIconDisplay";
import BadgesPageClient from '@/components/BadgesPageClient'
import { logger } from '@/lib/logger';

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

// Calculer la série de victoires consécutives
async function calculateStreak(supabase: any, userId: string): Promise<number> {
  const { data: mp } = await supabase
    .from("match_participants")
    .select("match_id, team")
    .eq("user_id", userId)
    .eq("player_type", "user");

  if (!mp || mp.length === 0) return 0;

  const matchIds = mp.map((m: any) => m.match_id);
  if (matchIds.length === 0) return 0;

  const { data: ms } = await supabase
    .from("matches")
    .select("id, winner_team_id, team1_id, team2_id, created_at")
    .in("id", matchIds)
    .order("created_at", { ascending: false });

  if (!ms || ms.length === 0) return 0;

  const winnerByMatch: Record<string, number> = {};
  ms.forEach((m: any) => {
    if (!m.winner_team_id || !m.team1_id || !m.team2_id) return;
    winnerByMatch[m.id] = m.winner_team_id === m.team1_id ? 1 : 2;
  });

  const mpSorted = [...mp].sort((a: any, b: any) => {
    const aDate = ms.find((m: any) => m.id === a.match_id)?.created_at || "";
    const bDate = ms.find((m: any) => m.id === b.match_id)?.created_at || "";
    return bDate.localeCompare(aDate);
  });

  let streak = 0;
  let bestStreak = 0;
  for (const p of mpSorted) {
    const winnerTeam = winnerByMatch[p.match_id];
    if (!winnerTeam) continue;
    if (winnerTeam === p.team) {
      streak += 1;
      if (streak > bestStreak) bestStreak = streak;
    } else {
      streak = 0;
    }
  }
  return bestStreak;
}

export default async function BadgesContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 font-normal">
        <p>Vous devez être connecté pour accéder à vos badges.</p>
        <Link href="/login" className="text-blue-400 underline mt-2 inline-block">Se connecter</Link>
      </div>
    );
  }

  const { data: userProfile } = await supabase
    .from("profiles")
    .select("club_id, points")
    .eq("id", user.id)
    .maybeSingle();

  let userClubId = userProfile?.club_id || null;

  const challengePoints = typeof userProfile?.points === 'number'
    ? userProfile.points
    : (typeof userProfile?.points === 'string' ? parseInt(userProfile.points, 10) || 0 : 0);

  let finalChallengePoints = challengePoints;

  if (!userClubId) {
    try {
      const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
        .from("profiles")
        .select("club_id, points")
        .eq("id", user.id)
        .maybeSingle();
      if (adminProfileError) {
        logger.error("[Badges] Failed to fetch profile via admin client", {
          message: adminProfileError.message,
          details: adminProfileError.details,
          hint: adminProfileError.hint,
          code: adminProfileError.code,
        });
      }
      if (adminProfile?.club_id) {
        userClubId = adminProfile.club_id;
      }

      if (adminProfile?.points !== undefined) {
        finalChallengePoints = typeof adminProfile.points === 'number'
          ? adminProfile.points
          : (typeof adminProfile.points === 'string' ? parseInt(adminProfile.points, 10) || 0 : 0);
      }
    } catch (e) {
      logger.error("[Badges] Unexpected error when fetching profile via admin client", e);
    }
  }

  if (!userClubId) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-sm text-white/70 font-normal">
        <p>Vous devez être rattaché à un club pour accéder à vos badges. Utilisez le code d'invitation communiqué par votre club.</p>
      </div>
    );
  }

  // Calculer les stats du joueur
  const { data: mp } = await supabase
    .from("match_participants")
    .select("match_id, team")
    .eq("user_id", user.id)
    .eq("player_type", "user");

  let wins = 0;
  let losses = 0;
  let matches = 0;

  if (mp && mp.length) {
    const matchIds = mp.map((m: any) => m.match_id);

    let validMatchIds = matchIds;
    if (userClubId) {
      const { data: allParticipants } = await supabase
        .from("match_participants")
        .select("match_id, user_id, player_type")
        .in("match_id", matchIds)
        .eq("player_type", "user");

      const participantUserIds = [...new Set((allParticipants || []).map((p: any) => p.user_id).filter(Boolean))];
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, club_id")
        .in("id", participantUserIds)
        .eq("club_id", userClubId);

      const validUserIds = new Set((profiles || []).map((p: any) => p.id));

      validMatchIds = matchIds.filter((matchId: string) => {
        const participants = (allParticipants || []).filter((p: any) => p.match_id === matchId);
        return participants.every((p: any) =>
          p.player_type === "guest" || validUserIds.has(p.user_id)
        );
      });
    }

    const { data: ms } = await supabase
      .from("matches")
      .select("id, winner_team_id, team1_id, team2_id")
      .in("id", validMatchIds);

    const byId: Record<string, number> = {};
    (ms || []).forEach((m: any) => {
      if (!m.winner_team_id || !m.team1_id || !m.team2_id) return;
      const winner_team = m.winner_team_id === m.team1_id ? 1 : 2;
      byId[m.id] = winner_team;
    });

    const filteredMp = userClubId
      ? mp.filter((p: any) => validMatchIds.includes(p.match_id))
      : mp;

    filteredMp.forEach((p: any) => {
      if (byId[p.match_id] === p.team) wins += 1;
      else if (byId[p.match_id]) losses += 1;
    });
    matches = filteredMp.filter((p: any) => !!byId[p.match_id]).length;
  }

  const points = wins * 10 + losses * 3;
  const streak = await calculateStreak(supabase, user.id);

  const stats: PlayerStats = { wins, losses, matches, points, streak };
  const obtainedBadges = getBadges(stats);
  const obtainedBadgeKeys = new Set(obtainedBadges.map(b => `${b.icon}|${b.title}`));

  const { count: myReviewsCount } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const extraObtained = new Set<string>();
  if ((myReviewsCount || 0) > 0) extraObtained.add("💬|Contributeur");

  let badgesWithStatus = ALL_BADGES.map((badge) => ({
    ...badge,
    obtained: obtainedBadgeKeys.has(`${badge.icon}|${badge.title}`) || extraObtained.has(`${badge.icon}|${badge.title}`),
  }));

  badgesWithStatus = badgesWithStatus.sort((a, b) => {
    const weight = (bd: typeof a) => {
      if (bd.icon === "🏆") return 0;
      if (bd.icon === "💬") return 1;
      return 2;
    };
    return weight(a) - weight(b);
  });

  const obtainedCount = badgesWithStatus.filter((b) => b.obtained).length;

  const { data: challengeBadges } = await supabaseAdmin
    .from("challenge_badges")
    .select("id, badge_name, badge_emoji, earned_at")
    .eq("user_id", user.id)
    .order("earned_at", { ascending: false });

  const challengeBadgesCount = challengeBadges?.length || 0;
  const totalBadgesCount = obtainedCount + challengeBadgesCount;

  return (
    <BadgesPageClient obtainedBadges={obtainedBadges}>
      {/* Pop-up de célébration pour les nouveaux badges */}
      <BadgesUnlockNotifier obtained={obtainedBadges} />

      {/* Statistiques */}
      <div className="mb-8 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 sm:px-6 sm:py-4 backdrop-blur-sm max-w-xs mx-auto">
        <div className="flex items-center justify-between gap-2">
          {/* Gauche: Total Badges - Plus étroit */}
          <div className="text-center w-20 sm:w-24">
            <div className="text-3xl sm:text-4xl font-bold text-white tabular-nums">{totalBadgesCount}</div>
            <div className="text-[10px] sm:text-xs font-semibold text-white/80">Badges</div>
          </div>
          {/* Séparation verticale */}
          <div className="w-px h-10 bg-white/30"></div>
          {/* Droite: Standards et Challenges - Plus large */}
          <div className="flex-1 flex justify-center gap-6 sm:gap-8 min-w-0">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-white tabular-nums">{obtainedCount}</div>
              <div className="text-[10px] sm:text-xs font-medium text-white/80 whitespace-nowrap">standards</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-white tabular-nums">{challengeBadgesCount}</div>
              <div className="text-[10px] sm:text-xs font-medium text-white/80 whitespace-nowrap">challenges</div>
            </div>
          </div>
        </div>
      </div>

      {/* Badges de challenges */}
      {challengeBadges && challengeBadges.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">
            <span>Badges de Challenges</span>
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
            {challengeBadges.map((badge) => (
              <div
                key={badge.id}
                className="rounded-xl bg-gradient-to-br from-yellow-50 to-amber-50 shadow-lg px-2 pt-3 pb-2 sm:px-3 sm:pt-5 sm:pb-3 transition-all hover:scale-105 hover:shadow-2xl flex flex-col h-[140px] sm:h-[180px] items-center text-center"
              >
                <div className="mb-2 sm:mb-3 flex flex-col items-center gap-2 sm:gap-3 flex-1">
                  <div className="h-[32px] sm:h-[40px] flex items-center justify-center mb-1">
                    <BadgeIconDisplay
                      icon={badge.badge_emoji}
                      title={badge.badge_name}
                      size={32}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xs sm:text-sm font-semibold leading-tight text-gray-900">
                      {badge.badge_name}
                    </h3>
                    <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs leading-relaxed text-gray-600 font-normal">
                      Obtenu via un challenge
                    </p>
                  </div>
                </div>
                <div className="mt-auto w-full rounded-lg bg-gradient-to-r from-yellow-100 to-amber-100 px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-semibold text-yellow-800 tabular-nums">
                  ✓ Débloqué le {new Date(badge.earned_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grille des badges standards */}
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-white mb-4">
          <span>Badges Standards</span>
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
        {badgesWithStatus.map((badge, idx) => (
          <div
            key={idx}
            className={`rounded-xl px-2 pt-3 pb-2 sm:px-3 sm:pt-5 sm:pb-3 transition-all flex flex-col h-[140px] sm:h-[180px] items-center text-center ${badge.obtained
              ? "bg-white shadow-md hover:scale-105 hover:shadow-xl"
              : "bg-gray-50 opacity-75"
              }`}
          >
            <div className="flex-shrink-0 mb-2 sm:mb-3 h-[36px] sm:h-[48px] flex items-center justify-center">
              <BadgeIconDisplay
                icon={badge.icon}
                title={badge.title}
                className={`transition-all ${badge.obtained ? "" : "grayscale opacity-50"
                  }`}
                size={36}
              />
            </div>

            <div className="flex-shrink-0 flex flex-col items-center justify-center min-h-0 max-h-[60px] sm:max-h-[70px] mb-1 sm:mb-2 px-1">
              <h3 className={`text-xs sm:text-sm font-semibold leading-tight mb-0.5 sm:mb-1 text-center ${badge.obtained ? "text-gray-900" : "text-gray-500"}`}>
                {badge.title}
              </h3>
              <p className="text-[10px] sm:text-xs leading-relaxed text-gray-600 text-center line-clamp-2">{badge.description}</p>
            </div>

            <div className="flex-shrink-0 w-full h-[24px] sm:h-[32px] flex items-center justify-center mt-auto">
              {badge.obtained ? (
                <div className="w-full rounded-lg bg-[#172554] px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-semibold text-white tabular-nums">
                  ✓ Débloqué
                </div>
              ) : (
                <div className="w-full h-[24px] sm:h-[32px]" />
              )}
            </div>
          </div>
        ))}
      </div>
    </BadgesPageClient>
  );
}

