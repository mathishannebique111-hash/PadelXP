import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import ChallengesList from "@/components/challenges/ChallengesList";
import PageTitle from "@/components/PageTitle";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

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

export default async function PlayerChallengesPage() {
  const requestHeaders = headers();
  const cookieHeader = cookies().toString();
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const host = requestHeaders.get("host");

  if (!host) {
    redirect("/login");
  }

  // Ajouter un timestamp pour forcer le rechargement
  const timestamp = Date.now();
  const response = await fetch(`${protocol}://${host}/api/player/challenges?t=${timestamp}`, {
    headers: {
      cookie: cookieHeader,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
    },
    cache: "no-store",
    next: { revalidate: 0 },
  }).catch(() => null);
  
  console.log(`[PlayerChallengesPage] Fetched at ${new Date().toISOString()} - response status:`, response?.status);

  if (!response) {
    redirect("/login");
  }

  if (response.status === 401) {
    redirect("/login");
  }

  let challenges: PlayerChallenge[] = [];
  try {
    const payload = await response.json();
    challenges = payload?.challenges ?? [];
  } catch (error) {
    console.error("[PlayerChallengesPage] parse error", error);
  }

  // Récupérer les points et badges de challenges
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
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
        console.error("[PlayerChallengesPage] Error fetching profile via admin client", e);
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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-blue-950 via-black to-black">
      {/* Background avec overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/30 via-black/80 to-black z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.15),transparent)] z-0" />
      
      {/* Pattern animé - halos de la landing page */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#BFFF00] rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pt-20 md:pt-10 pb-10 text-white">
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
