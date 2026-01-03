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
      
      validMatchIds = matchIds.filter(matchId => {
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
      <div className="mb-8 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 p-8 border-2 border-blue-400 shadow-xl">
        <div className="mb-4 text-center">
          <div className="mb-3 text-3xl font-bold text-white">
            <span className="text-yellow-300 tabular-nums">{totalBadgesCount}</span>
            <span className="text-white/80 text-2xl ml-2 font-semibold">Badge{totalBadgesCount > 1 ? "s" : ""} au total</span>
          </div>
          <div className="flex justify-center gap-8 text-sm text-white/70 font-normal">
            <div>
              <span className="font-bold text-yellow-300 tabular-nums">{obtainedCount}</span>
              <span className="ml-1">badge{obtainedCount > 1 ? "s" : ""} standard{obtainedCount > 1 ? "s" : ""}</span>
            </div>
            {challengeBadgesCount > 0 && (
              <div>
                <span className="font-bold text-yellow-300 tabular-nums">{challengeBadgesCount}</span>
                <span className="ml-1">badge{challengeBadgesCount > 1 ? "s" : ""} de challenge{challengeBadgesCount > 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
        </div>
        {obtainedCount < ALL_BADGES.length && (
          <div className="text-center">
            <Link href="/match/new" className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-6 py-3 border-2 border-white/30 hover:bg-white/25 hover:translate-y-[-1px] transition-all cursor-pointer">
              <BadgeIconDisplay icon="🎾" size={20} className="flex-shrink-0" />
              <span className="text-sm font-semibold text-white">
                Jouez des matchs pour débloquer de nouveaux badges !
              </span>
            </Link>
          </div>
        )}
      </div>

      {/* Badges de challenges */}
      {challengeBadges && challengeBadges.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
            <Image src="/images/Trophée page badges.png" alt="Trophée" width={24} height={24} className="flex-shrink-0" unoptimized />
            <span>Badges de Challenges</span>
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {challengeBadges.map((badge) => (
              <div
                key={badge.id}
                className="rounded-xl border border-yellow-500 bg-gradient-to-br from-yellow-50 to-amber-50 shadow-lg px-3 pt-5 pb-3 transition-all hover:scale-105 hover:shadow-2xl flex flex-col h-[180px] items-center text-center"
              >
                <div className="mb-3 flex flex-col items-center gap-3 flex-1">
                  <span className="text-3xl">
                    {badge.badge_emoji}
                  </span>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold leading-tight text-gray-900">
                      {badge.badge_name}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-gray-600 font-normal">
                      Obtenu via un challenge
                    </p>
                  </div>
                </div>
                <div className="mt-auto w-full rounded-lg bg-gradient-to-r from-yellow-100 to-amber-100 px-3 py-2 text-xs font-semibold text-yellow-800 tabular-nums">
                  ✓ Débloqué le {new Date(badge.earned_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grille des badges standards */}
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <BadgeIconDisplay icon="🎯" size={24} className="flex-shrink-0" />
          <span>Badges Standards</span>
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {badgesWithStatus.map((badge, idx) => (
          <div
            key={idx}
            className={`rounded-xl border px-3 pt-5 pb-3 transition-all flex flex-col h-[180px] items-center text-center ${
              badge.obtained
                ? "border-blue-500 bg-white shadow-md hover:scale-105 hover:shadow-xl"
                : "border-gray-200 bg-gray-50 opacity-75"
            }`}
          >
            <div className="flex-shrink-0 mb-3 h-[48px] flex items-center justify-center">
              <BadgeIconDisplay
                icon={badge.icon}
                title={badge.title}
                className={`transition-all ${
                  badge.obtained ? "" : "grayscale opacity-50"
                }`}
                size={48}
              />
            </div>
            
            <div className="flex-shrink-0 flex flex-col items-center justify-center min-h-0 max-h-[70px] mb-2 px-1">
              <h3 className={`text-sm font-semibold leading-tight mb-1 text-center ${badge.obtained ? "text-gray-900" : "text-gray-500"}`}>
                  {badge.title}
                </h3>
              <p className="text-xs leading-relaxed text-gray-600 text-center line-clamp-2">{badge.description}</p>
            </div>
            
            <div className="flex-shrink-0 w-full h-[32px] flex items-center justify-center mt-auto">
              {badge.obtained ? (
                <div className="w-full rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 tabular-nums">
                  ✓ Débloqué
                </div>
              ) : (
                <div className="w-full h-[32px]" />
              )}
            </div>
          </div>
        ))}
      </div>
    </BadgesPageClient>
  );
}

