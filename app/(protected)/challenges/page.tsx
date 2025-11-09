import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import NavigationBar from "@/components/NavigationBar";
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
    <div className="mx-auto w-full max-w-5xl px-6 py-10 text-white">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Challenges</h1>
        <LogoutButton />
      </div>
      <NavigationBar currentPage="challenges" />

      <ChallengesList challenges={challenges} />
    </div>
  );
}
