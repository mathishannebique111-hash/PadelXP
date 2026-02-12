import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import Link from "next/link";
import PageTitle from "@/components/PageTitle";
import { ALL_BADGES, getBadges, type PlayerStats } from "@/lib/badges";
import BadgesView from "@/components/badges/BadgesView";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

// Créer un client admin pour bypass RLS dans les requêtes critiques
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

  // trier les participations par date du match desc
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

export default async function BadgesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="text-xl font-semibold text-white">Accès restreint</h1>
        <Link href="/login" className="text-blue-400 underline">Se connecter</Link>
      </div>
    );
  }

  // Récupérer le club_id et les points de challenges de l'utilisateur
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("club_id, points, is_premium")
    .eq("id", user.id)
    .maybeSingle();

  let userClubId = userProfile?.club_id || null;

  // S'assurer que challengePoints est un nombre (peut être string, null, undefined dans la DB)
  const challengePoints = typeof userProfile?.points === 'number'
    ? userProfile.points
    : (typeof userProfile?.points === 'string' ? parseInt(userProfile.points, 10) || 0 : 0);

  const isPremiumUser = !!(userProfile as any)?.is_premium;

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

      // Mettre à jour les points de challenges depuis adminProfile si disponible
      if (adminProfile?.points !== undefined) {
        finalChallengePoints = typeof adminProfile.points === 'number'
          ? adminProfile.points
          : (typeof adminProfile.points === 'string' ? parseInt(adminProfile.points, 10) || 0 : 0);
      }
    } catch (e) {
      logger.error("[Badges] Unexpected error when fetching profile via admin client", e);
    }
  }

  // if (!userClubId) check removed to allow club-less access

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

    // Si on a un club_id, filtrer les matchs pour ne garder que ceux du même club
    let validMatchIds = matchIds;
    if (userClubId) {
      // Récupérer tous les participants de ces matchs
      const { data: allParticipants } = await supabase
        .from("match_participants")
        .select("match_id, user_id, player_type")
        .in("match_id", matchIds)
        .eq("player_type", "user");

      // Récupérer les profils pour vérifier les club_id - utiliser admin pour bypass RLS
      const participantUserIds = [...new Set((allParticipants || []).map((p: any) => p.user_id).filter(Boolean))];
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, club_id")
        .in("id", participantUserIds)
        .eq("club_id", userClubId);

      const validUserIds = new Set((profiles || []).map((p: any) => p.id));

      // Filtrer les matchs : ne garder que ceux où tous les participants users appartiennent au même club
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

    // Filtrer mp pour ne garder que les matchs valides
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

  // Obtenir les badges débloqués (basés sur les stats)
  const stats: PlayerStats = { wins, losses, matches, points, streak };
  const obtainedBadges = getBadges(stats);
  // Utiliser icon + title comme clé unique car plusieurs badges peuvent avoir la même icône
  const obtainedBadgeKeys = new Set(obtainedBadges.map(b => `${b.icon}|${b.title}`));

  // Badges liés aux avis: Contributeur (premier avis du joueur)
  // Un joueur peut avoir plusieurs avis; utiliser un COUNT fiable plutôt que maybeSingle()
  const { count: myReviewsCount } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const extraObtained = new Set<string>();
  if ((myReviewsCount || 0) > 0) extraObtained.add("💬|Contributeur"); // Contributeur: au moins 1 avis

  // Créer la liste avec le statut de chaque badge
  let badgesWithStatus = ALL_BADGES.map((badge) => {
    // Le badge "Premium" est automatiquement débloqué pour les utilisateurs premium
    if (badge.title === "Premium" && isPremiumUser) {
      return { ...badge, obtained: true };
    }
    return {
      ...badge,
      obtained: obtainedBadgeKeys.has(`${badge.icon}|${badge.title}`) || extraObtained.has(`${badge.icon}|${badge.title}`),
    };
  });
  // Mettre le badge Contributeur en premier pour qu'il apparaisse sur la première ligne
  badgesWithStatus = badgesWithStatus.sort((a, b) => {
    const weight = (bd: typeof a) => {
      if (bd.icon === "🏆") return 0; // Première victoire en premier
      if (bd.icon === "💬") return 1; // Contributeur en second
      return 2;
    };
    return weight(a) - weight(b);
  });

  const obtainedCount = badgesWithStatus.filter((b) => b.obtained).length;

  // Récupérer les badges de challenges personnalisés
  const { data: challengeBadges } = await supabaseAdmin
    .from("challenge_badges")
    .select("id, badge_name, badge_emoji, earned_at")
    .eq("user_id", user.id)
    .order("earned_at", { ascending: false });

  const challengeBadgesCount = challengeBadges?.length || 0;
  const totalBadgesCount = obtainedCount + challengeBadgesCount;

  const premiumCount = badgesWithStatus.filter((b) => b.isPremium && b.obtained).length;
  const standardObtainedCount = badgesWithStatus.filter((b) => b.obtained && !b.isPremium).length;

  const counts = {
    total: totalBadgesCount,
    obtained: standardObtainedCount,
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

