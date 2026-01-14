import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import ChallengesList from "@/components/challenges/ChallengesList";
import PageTitle from "@/components/PageTitle";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from '@/lib/logger';

interface PlayerChallenge {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  objective: string;
  rewardType: "points" | "badge";
  rewardLabel: string;
  status: "active" | "upcoming" | "completed";
  progress: {
    current: number;
    target: number;
  };
  rewardClaimed: boolean;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

// Fonction pour extraire le nombre cible depuis l'objectif
function extractTarget(objective: string): number {
  const match = objective.match(/(\d+)/);
  if (!match) return 1;
  const value = parseInt(match[1], 10);
  if (!Number.isFinite(value) || value <= 0) return 1;
  return value;
}

export default async function PlayerChallengesPage() {
  const requestHeaders = headers();
  const cookieStore = cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const host = requestHeaders.get("host");

  if (!host) {
    redirect("/login");
  }

  // Ajouter un timestamp pour forcer le rechargement
  const timestamp = Date.now();
  const response = await fetch(`${protocol}://${host}/api/player/challenges?t=${timestamp}`, {
    headers: {
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
    },
    credentials: "include",
    cache: "no-store",
    next: { revalidate: 0 },
  }).catch((error) => {
    logger.error("[PlayerChallengesPage] fetch error", error);
    return null;
  });

  logger.info(`[PlayerChallengesPage] Fetched at ${new Date().toISOString()} - response status:`, response?.status);

  if (!response) {
    redirect("/login");
  }

  let challenges: PlayerChallenge[] = [];
  let responseStatus = response.status;
  if (responseStatus === 200) {
    try {
      const raw = await response.text();
      if (!raw || raw.trim().length === 0) {
        logger.warn("[PlayerChallengesPage] Empty response body, will try fallback");
      } else {
        const payload = JSON.parse(raw);
        challenges = Array.isArray(payload?.challenges) ? payload.challenges : [];
        logger.info(`[PlayerChallengesPage] Loaded ${challenges.length} challenges from API`);
      }
    } catch (error) {
      logger.error("[PlayerChallengesPage] parse error, will try fallback", error);
    }
  } else {
    logger.warn(`[PlayerChallengesPage] API returned status ${responseStatus}, will try fallback`);
  }

  // Récupérer les points et badges de challenges
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fallback: Si l'API n'a pas retourné de challenges, charger directement depuis Supabase Storage
  if (challenges.length === 0 && user) {
    try {
      // Résoudre le club_id du joueur
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("club_id, club_slug")
        .eq("id", user.id)
        .maybeSingle();

      let clubId: string | null = profile?.club_id || null;

      // Si pas de club_id, essayer avec club_slug
      if (!clubId && profile?.club_slug) {
        const { data: clubBySlug } = await supabaseAdmin
          .from("clubs")
          .select("id")
          .eq("slug", profile.club_slug)
          .maybeSingle();
        if (clubBySlug?.id) {
          clubId = clubBySlug.id;
        }
      }

      // Dernier recours: métadonnées auth
      if (!clubId) {
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id);
          const metadata = (authUser?.user?.user_metadata || {}) as Record<string, any>;
          clubId = metadata.club_id || null;
          if (!clubId && metadata.club_slug) {
            const { data: clubFromMeta } = await supabaseAdmin
              .from("clubs")
              .select("id")
              .eq("slug", metadata.club_slug)
              .maybeSingle();
            if (clubFromMeta?.id) {
              clubId = clubFromMeta.id;
            }
          }
        } catch (authError) {
          logger.warn("[PlayerChallengesPage] Error fetching auth metadata", authError);
        }
      }

      // Charger les challenges depuis le bucket
      if (clubId) {
        const BUCKET_NAME = "club-challenges";
        const { data: challengeFile, error: storageError } = await supabaseAdmin
          .storage
          .from(BUCKET_NAME)
          .download(`${clubId}.json`);

        if (!storageError && challengeFile) {
          try {
            const text = await challengeFile.text();
            if (text && text.trim().length > 0) {
              const parsed = JSON.parse(text);
              if (Array.isArray(parsed) && parsed.length > 0) {
                // Convertir les challenges au format PlayerChallenge
                const now = new Date();
                challenges = parsed.map((record: any) => {
                  const start = new Date(record.start_date);
                  const end = new Date(record.end_date);
                  let status: "active" | "upcoming" | "completed" = "active";
                  if (now < start) status = "upcoming";
                  else if (now > end) status = "completed";

                  const target = Math.max(1, extractTarget(record.objective));
                  return {
                    id: record.id,
                    title: record.title,
                    startDate: record.start_date,
                    endDate: record.end_date,
                    objective: record.objective,
                    rewardType: record.reward_type,
                    rewardLabel: record.reward_label,
                    status,
                    progress: { current: 0, target }, // Target extrait de l'objectif
                    rewardClaimed: false,
                  };
                });
                logger.info(`[PlayerChallengesPage] Loaded ${challenges.length} challenges from storage fallback`);
              }
            }
          } catch (parseError) {
            logger.error("[PlayerChallengesPage] Error parsing challenge file from storage", parseError);
          }
        }
      }
    } catch (fallbackError) {
      logger.error("[PlayerChallengesPage] Error in fallback challenge loading", fallbackError);
    }
  }

  let challengePoints = 0;
  let challengeBadgesCount = 0;

  if (user) {
    // Récupérer les points de challenges depuis le profil
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", user.id)
      .maybeSingle();

    challengePoints = typeof userProfile?.points === 'number'
      ? userProfile.points
      : (typeof userProfile?.points === 'string' ? parseInt(userProfile.points, 10) || 0 : 0);

    // Si pas trouvé, essayer avec admin client
    if (!userProfile) {
      try {
        const { data: adminProfile } = await supabaseAdmin
          .from("profiles")
          .select("points")
          .eq("id", user.id)
          .maybeSingle();

        if (adminProfile?.points !== undefined) {
          challengePoints = typeof adminProfile.points === 'number'
            ? adminProfile.points
            : (typeof adminProfile.points === 'string' ? parseInt(adminProfile.points, 10) || 0 : 0);
        }
      } catch (e) {
        logger.error("[PlayerChallengesPage] Error fetching profile via admin client", e);
      }
    }

    // Récupérer les badges de challenges
    const { data: challengeBadges } = await supabaseAdmin
      .from("challenge_badges")
      .select("id")
      .eq("user_id", user.id);

    challengeBadgesCount = challengeBadges?.length || 0;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#172554]">
      {/* Background avec overlay - Transparent en haut pour fusionner */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/80 to-black z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.15),transparent)] z-0" />

      {/* Pattern animé - halos de la landing page */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#BFFF00] rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pt-4 md:pt-10 pb-10 text-white">
        <div className="mb-6">
          <PageTitle title="Challenges" />
        </div>

        {(challengePoints > 0 || challengeBadgesCount > 0) && (
          <div className="mb-6 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 border border-white/20">
              <span className="text-sm font-semibold text-white">
                <span className="text-yellow-300 tabular-nums">{challengePoints}</span>
                <span className="ml-1">point{challengePoints > 1 ? "s" : ""} et </span>
                <span className="text-yellow-300 tabular-nums">{challengeBadgesCount}</span>
                <span className="ml-1">badge{challengeBadgesCount > 1 ? "s" : ""} débloqué{challengeBadgesCount > 1 ? "s" : ""} avec les challenges</span>
              </span>
            </div>
          </div>
        )}

        <ChallengesList challenges={challenges} />
      </div>
    </div>
  );
}
