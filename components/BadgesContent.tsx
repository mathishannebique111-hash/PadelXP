import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import Link from "next/link";
import { ALL_BADGES, getBadges, type PlayerStats } from "@/lib/badges";
import BadgesView from "@/components/badges/BadgesView";
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
    .eq("status", "confirmed")
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
    .select("club_id, points, referral_count, is_premium")
    .eq("id", user.id)
    .maybeSingle();

  let userClubId = userProfile?.club_id || null;

  const challengePoints = typeof userProfile?.points === 'number'
    ? userProfile.points
    : (typeof userProfile?.points === 'string' ? parseInt(userProfile.points, 10) || 0 : 0);

  let finalChallengePoints = challengePoints;
  let referralCount = userProfile?.referral_count || 0;

  if (!userClubId) {
    try {
      const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
        .from("profiles")
        .select("club_id, points, referral_count")
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

      if (adminProfile?.referral_count !== undefined) {
        referralCount = adminProfile.referral_count || 0;
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
      .in("id", validMatchIds)
      .eq("status", "confirmed");

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

  const stats: PlayerStats = { wins, losses, matches, points, streak, referralCount };
  const obtainedBadges = getBadges(stats);
  const obtainedBadgeKeys = new Set(obtainedBadges.map(b => `${b.icon}|${b.title}`));

  const { count: myReviewsCount } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const extraObtained = new Set<string>();
  if ((myReviewsCount || 0) > 0) extraObtained.add("💬|Contributeur");

  const isPremiumUser = !!(userProfile as any)?.is_premium;

  let badgesWithStatus = ALL_BADGES.map((badge) => {
    if (badge.title === "Premium" && isPremiumUser) {
      return { ...badge, obtained: true };
    }
    return {
      ...badge,
      obtained: obtainedBadgeKeys.has(`${badge.icon}|${badge.title}`) || extraObtained.has(`${badge.icon}|${badge.title}`),
    };
  });


  const obtainedCount = badgesWithStatus.filter((b) => b.obtained).length;

  const { data: challengeBadges } = await supabaseAdmin
    .from("challenge_badges")
    .select("id, badge_name, badge_emoji, earned_at")
    .eq("user_id", user.id)
    .order("earned_at", { ascending: false });

  const challengeBadgesCount = challengeBadges?.length || 0;
  const totalBadgesCount = obtainedCount + challengeBadgesCount;

  const totalPossibleStandardBadges = ALL_BADGES.length;
  const totalObtainedStandardBadges = badgesWithStatus.filter((b) => b.obtained).length;
  const premiumCount = badgesWithStatus.filter((b) => b.isPremium && b.obtained).length;

  const counts = {
    total: totalPossibleStandardBadges,
    obtained: totalObtainedStandardBadges,
    challenge: challengeBadgesCount,
    premium: premiumCount,
  };

  return (
    <BadgesView
      badgesWithStatus={badgesWithStatus}
      challengeBadges={challengeBadges || []}
      isPremiumUser={isPremiumUser}
      counts={counts}
    />
  );
}
