import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import ChallengesList from "@/components/challenges/ChallengesList";

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

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-blue-950 via-black to-black">
      {/* Background avec overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/30 via-black/80 to-black z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.15),transparent)] z-0" />
      
      {/* Pattern animé */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#0066FF] rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl px-6 py-10 text-white">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Challenges</h1>
          <LogoutButton />
        </div>

        <ChallengesList challenges={challenges} />
      </div>
    </div>
  );
}
