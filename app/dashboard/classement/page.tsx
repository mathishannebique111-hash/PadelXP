import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserClubInfo, getClubDashboardData, getClubMatchHistory } from "@/lib/utils/club-utils";
import RankBadge from "@/components/RankBadge";
import TierBadge from "@/components/TierBadge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function tierForPoints(points: number): "Bronze" | "Argent" | "Or" | "Diamant" | "Champion" {
  if (points >= 500) return "Champion";
  if (points >= 300) return "Diamant";
  if (points >= 200) return "Or";
  if (points >= 100) return "Argent";
  return "Bronze";
}

export default async function ClassementPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/clubs/login?next=/dashboard/classement");
  }

  const { clubId, clubSlug } = await getUserClubInfo();

  if (!clubId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold">Classement</h1>
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
          Aucun club n’est relié à ce compte. Ajoutez un club pour visualiser votre classement.
        </div>
      </div>
    );
  }

  const { leaderboard } = await getClubDashboardData(clubId, clubSlug);
  const history = await getClubMatchHistory(clubId, clubSlug);

  const top3 = leaderboard.slice(0, 3);
  const totalPlayers = leaderboard.length;
  const totalMatches = history.matches.length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-white">Classement</h1>
        <div className="flex gap-2 text-sm text-white/70">
          <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
            {totalPlayers} joueur{totalPlayers > 1 ? "s" : ""}
          </span>
          <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
            {totalMatches} match{totalMatches > 1 ? "s" : ""} comptabilisé{totalMatches > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {top3.length > 0 && (
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-center gap-3">
            <span className="h-px w-10 bg-gray-300" />
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm font-semibold text-gray-900 shadow-sm">
              Top joueurs du moment <span aria-hidden>✨</span>
            </span>
            <span className="h-px w-10 bg-gray-300" />
          </div>

          <div className="hidden md:flex items-end justify-center gap-6 w-full mt-8">
            {top3[1] && (
              <div
                className="flex-1 max-w-[240px]"
              >
                <div
                  className="podium-silver border-2 border-gray-300 rounded-2xl p-8 hover:border-gray-400 transition-all shadow-lg transform hover:scale-[1.02] relative overflow-hidden"
                  style={{
                    background: "linear-gradient(to bottom, #ffffff, #d8d8d8, #b8b8b8)",
                    boxShadow:
                      "0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(192, 192, 192, 0.35), inset 0 2px 4px rgba(255,255,255,0.5)",
                  }}
                >
                  <div className="absolute top-2 right-2 text-5xl z-20 opacity-90 drop-shadow-md">🥈</div>
                  <div className="text-center relative z-10 pt-5">
                    <h3 className="text-2xl font-extrabold mb-8 text-gray-900 tracking-tight">{top3[1].player_name}</h3>
                    <div className="flex items-center justify-center mt-4">
                      <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 bg-white/95 backdrop-blur border-2 border-zinc-500 ring-2 ring-zinc-300 shadow-lg shadow-zinc-300/70">
                        <span className="text-2xl font-extrabold text-gray-900 tabular-nums">
                          {top3[1].points.toLocaleString()}
                        </span>
                        <span className="text-xs font-semibold text-gray-800 uppercase tracking-wider">points</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {top3[0] && (
              <div className="flex-1 max-w-[280px]">
                <div
                  className="podium-gold border-2 border-yellow-400 rounded-2xl p-9 hover:border-yellow-500 transition-all shadow-xl transform hover:scale-[1.02] relative overflow-hidden"
                  style={{
                    background: "linear-gradient(to bottom, #ffffff, #ffe8a1, #ffdd44)",
                    boxShadow:
                      "0 6px 25px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 140px rgba(255, 215, 0, 0.4), inset 0 2px 6px rgba(255,255,255,0.6)",
                  }}
                >
                  <div className="absolute top-2 right-2 text-5xl z-20 opacity-95 drop-shadow-lg">🥇</div>
                  <div className="absolute top-1 left-1 z-20">
                    <span className="inline-flex items-center rounded-full bg-yellow-100 text-yellow-800 px-2 py-0.5 text-xs font-semibold shadow-sm border border-yellow-300">
                      Meilleur joueur
                    </span>
                  </div>
                  <div className="text-center relative z-10 pt-6">
                    <h3 className="text-3xl font-extrabold mb-8 text-gray-900 tracking-tight drop-shadow-sm">
                      {top3[0].player_name}
                    </h3>
                    <div className="flex items-center justify-center mt-4">
                      <div className="inline-flex items-center gap-3 rounded-full px-6 py-2.5 bg-white/95 backdrop-blur border-2 border-yellow-500 ring-2 ring-yellow-300 shadow-xl shadow-yellow-300/70">
                        <span className="text-3xl font-extrabold text-gray-900 tabular-nums">
                          {top3[0].points.toLocaleString()}
                        </span>
                        <span className="text-xs font-semibold text-gray-900 uppercase tracking-wider">points</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {top3[2] && (
              <div className="flex-1 max-w-[240px]">
                <div
                  className="podium-bronze border-2 border-orange-300 rounded-2xl p-8 hover:border-orange-400 transition-all shadow-lg transform hover:scale-[1.02] relative overflow-hidden"
                  style={{
                    background: "linear-gradient(to bottom, #ffffff, #ffd8b3, #ffc085)",
                    boxShadow:
                      "0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(205, 127, 50, 0.35), inset 0 2px 4px rgba(255,255,255,0.5)",
                  }}
                >
                  <div className="absolute top-2 right-2 text-5xl z-20 opacity-90 drop-shadow-md">🥉</div>
                  <div className="text-center relative z-10 pt-5">
                    <h3 className="text-lg font-extrabold mb-8 text-gray-900 tracking-tight">
                      {(() => {
                        const parts = (top3[2].player_name || "").split(" ");
                        const first = parts[0] || "";
                        const last = parts.slice(1).join(" ");
                        return (
                          <span>
                            <span className="text-xl">{first}</span>
                            {last ? ` ${last}` : ""}
                          </span>
                        );
                      })()}
                    </h3>
                    <div className="flex items-center justify-center mt-4">
                      <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 bg-white/95 backdrop-blur border-2 border-orange-500 ring-2 ring-orange-300 shadow-lg shadow-orange-300/70">
                        <span className="text-2xl font-extrabold text-gray-900 tabular-nums">
                          {top3[2].points.toLocaleString()}
                        </span>
                        <span className="text-xs font-semibold text-gray-800 uppercase tracking-wider">points</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="md:hidden space-y-4 mt-8">
            {top3.map((player, index) => {
              const icons = ["🥇", "🥈", "🥉"];
              const borderColors = [
                "border-yellow-400",
                "border-gray-300",
                "border-orange-300",
              ];
              const bgGradients = [
                {
                  background: "linear-gradient(to bottom, #ffffff, #ffe8a1, #ffdd44)",
                  boxShadow:
                    "0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(255, 215, 0, 0.35), inset 0 2px 4px rgba(255,255,255,0.6)",
                },
                {
                  background: "linear-gradient(to bottom, #ffffff, #d8d8d8, #b8b8b8)",
                  boxShadow:
                    "0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(192, 192, 192, 0.32), inset 0 2px 4px rgba(255,255,255,0.5)",
                },
                {
                  background: "linear-gradient(to bottom, #ffffff, #ffd8b3, #ffc085)",
                  boxShadow:
                    "0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(205, 127, 50, 0.32), inset 0 2px 4px rgba(255,255,255,0.5)",
                },
              ];

              return (
                <div
                  key={player.user_id}
                  className={`rounded-2xl p-5 shadow-2xl relative overflow-hidden border-2 ${borderColors[index]}`}
                  style={bgGradients[index]}
                >
                  <div className="absolute top-2 right-2 z-20 opacity-90 drop-shadow-md text-5xl">
                    {icons[index]}
                  </div>
                  <div className="relative z-10 pt-4">
                    <h3
                      className={`font-extrabold mb-6 text-center text-gray-900 ${
                        index === 0 ? "text-2xl" : index === 1 ? "text-xl" : "text-lg"
                      }`}
                    >
                      {index === 2
                        ? (() => {
                            const parts = (player.player_name || "").split(" ");
                            const first = parts[0] || "";
                            const last = parts.slice(1).join(" ");
                            return (
                              <span>
                                <span className="text-xl">{first}</span>
                                {last ? ` ${last}` : ""}
                              </span>
                            );
                          })()
                        : player.player_name}
                    </h3>
                    <div className="flex items-center justify-center mt-2">
                      <div
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-white/95 backdrop-blur border-2 shadow-lg ${
                          index === 0
                            ? "border-yellow-500 ring-2 ring-yellow-300"
                            : index === 1
                            ? "border-zinc-500 ring-2 ring-zinc-300"
                            : "border-orange-500 ring-2 ring-orange-300"
                        }`}
                      >
                        <span className="text-lg font-extrabold text-gray-900 tabular-nums">
                          {player.points.toLocaleString()}
                        </span>
                        <span className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
                          points
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {leaderboard.length > 0 ? (
        <div className="overflow-hidden">
          <div className="px-5 pt-5">
            <div className="mb-4 flex items-center justify-center gap-3">
              <span className="h-px w-10 bg-gray-300" />
              <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm font-semibold text-gray-900 shadow-sm">
                Classement global <span aria-hidden>🏆</span>
              </span>
              <span className="h-px w-10 bg-gray-300" />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-4 text-center text-sm font-semibold uppercase tracking-wider text-gray-700 border-l border-gray-200 first:border-l-0 bg-gray-100">
                    Rang
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold uppercase tracking-wider text-gray-700 border-l border-gray-200 first:border-l-0">
                    Joueur
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold uppercase tracking-wider text-gray-700 border-l border-gray-200 first:border-l-0">
                    Niveau
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold uppercase tracking-wider text-gray-700 border-l border-gray-200 first:border-l-0">
                    Points
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold uppercase tracking-wider text-gray-700 border-l border-gray-200 first:border-l-0">
                    Winrate
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold uppercase tracking-wider text-green-700 bg-green-50 border-l border-gray-200 first:border-l-0">
                    V
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold uppercase tracking-wider text-red-700 bg-red-50 border-l border-gray-200 first:border-l-0">
                    D
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold uppercase tracking-wider text-gray-700 border-l border-gray-200 first:border-l-0">
                    MJ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {leaderboard.map((player, idx) => {
                  const winRate = player.matches > 0 ? Math.round((player.wins / player.matches) * 100) : 0;
                  const tier = tierForPoints(player.points);
                  const rowClass = idx === 0 ? "bg-gray-50" : "";
                  return (
                    <tr key={player.user_id} className={rowClass}>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-center border-l border-gray-200 first:border-l-0">
                        <RankBadge rank={player.rank} size="md" />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-center border-l border-gray-200 first:border-l-0">
                        <span className="font-semibold">{player.player_name}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center border-l border-gray-200 first:border-l-0">
                        <TierBadge tier={tier} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-sm text-center tabular-nums text-gray-900 border-l border-gray-200 first:border-l-0 font-semibold">
                        {player.points}
                      </td>
                      <td
                        className="px-4 py-3 text-sm text-center tabular-nums border-l border-gray-200 first:border-l-0 font-semibold"
                        style={{ color: winRate > 60 ? "#10B981" : winRate >= 40 ? "#0066FF" : "#EF4444" }}
                      >
                        {winRate}%
                      </td>
                      <td className="px-4 py-3 text-sm text-center tabular-nums text-green-700 bg-green-50 border-l border-gray-200 first:border-l-0 font-semibold">
                        {player.wins}
                      </td>
                      <td className="px-4 py-3 text-sm text-center tabular-nums text-red-700 bg-red-50 border-l border-gray-200 first:border-l-0 font-semibold">
                        {player.losses}
                      </td>
                      <td className="px-4 py-3 text-sm text-center tabular-nums text-gray-700 border-l border-gray-200 first:border-l-0 font-semibold">
                        {player.matches}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
          Pas encore de matchs enregistrés pour générer un classement.
        </div>
      )}
    </div>
  );
}



