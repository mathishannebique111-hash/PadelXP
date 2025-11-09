import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import NavigationBar from "@/components/NavigationBar";
import LogoutButton from "@/components/LogoutButton";

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
}

function formatRange(startISO: string, endISO: string) {
  const formatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  return `${formatter.format(new Date(startISO))} → ${formatter.format(new Date(endISO))}`;
}

function statusLabel(status: PlayerChallenge["status"]) {
  switch (status) {
    case "active":
      return "Challenge en cours";
    case "upcoming":
      return "À venir";
    case "completed":
      return "Terminé";
    default:
      return "En cours";
  }
}

function statusClasses(status: PlayerChallenge["status"]) {
  switch (status) {
    case "active":
      return "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40";
    case "upcoming":
      return "bg-blue-500/20 text-blue-200 border border-blue-400/40";
    case "completed":
    default:
      return "bg-white/10 text-white/70 border border-white/15";
  }
}

function resolveProgress(challenge: PlayerChallenge) {
  const target = challenge.progress?.target && challenge.progress.target > 0 ? challenge.progress.target : 1;
  const current = Math.min(Math.max(challenge.progress?.current ?? 0, 0), target);
  const percent = Math.min(100, Math.round((current / target) * 100));
  return { current, target, percent };
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

  const response = await fetch(`${protocol}://${host}/api/player/challenges`, {
    headers: {
      cookie: cookieHeader,
    },
    cache: "no-store",
  }).catch(() => null);

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

      <div className="space-y-6">
        {challenges.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-14 text-center text-white/70">
            Aucun challenge n'a encore été publié par votre club. Revenez bientôt !
          </div>
        ) : (
          <div className="space-y-6">
            {challenges.map((challenge) => {
              const progress = resolveProgress(challenge);
              const rewardChipClasses = challenge.rewardType === "points"
                ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-gray-900"
                : "bg-gradient-to-br from-violet-400 to-purple-500 text-white";
              const progressBarClass = progress.percent >= 100
                ? "bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-300"
                : "bg-gradient-to-r from-sky-400 via-indigo-500 to-blue-600";

              return (
                <article
                  key={challenge.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_18px_40px_rgba(3,7,18,0.45)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusClasses(challenge.status)}`}>
                        {statusLabel(challenge.status)}
                      </span>
                      <h2 className="text-xl font-semibold text-white">{challenge.title}</h2>
                      <p className="text-sm text-white/70">
                        <span className="font-semibold text-white">Objectif :</span> {challenge.objective}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-sm text-white/70">
                      <div>
                        <span className="font-semibold text-white">Durée :</span> {formatRange(challenge.startDate, challenge.endDate)}
                      </div>
                      <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-lg ${rewardChipClasses}`}>
                        {challenge.rewardType === "points" ? "💎" : "🏅"}
                        {challenge.rewardType === "points"
                          ? `${challenge.rewardLabel} points`
                          : `Badge “${challenge.rewardLabel}”`}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3 rounded-2xl border border-blue-400/30 bg-blue-500/10 p-4 shadow-[0_0_24px_rgba(37,99,235,0.2)]">
                    <div className="flex items-center justify-between text-sm font-semibold text-white/80">
                      <span>Progression : {progress.current}/{progress.target}</span>
                      <span>{progress.percent}%</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${progressBarClass}`}
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                    <p className="text-xs text-white/60">
                      {progress.percent >= 100
                        ? "Félicitations, objectif atteint !"
                        : progress.current > 0
                        ? "Continuez, vous êtes sur la bonne voie pour atteindre votre objectif."
                        : "Commencez dès maintenant pour atteindre votre objectif !"}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
