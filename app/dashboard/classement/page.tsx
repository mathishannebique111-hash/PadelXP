import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserClubInfo, getClubDashboardData, getClubMatchHistory } from "@/lib/utils/club-utils";
import RankBadge from "@/components/RankBadge";
import TierBadge from "@/components/TierBadge";
import PageTitle from "../PageTitle";
import Image from "next/image";

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
  const supabase = await createClient();
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
        <PageTitle title="Classement" />
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
  const totalClubPoints = leaderboard.reduce((sum, p) => sum + (p.points || 0), 0);
  const avgTop3Points = top3.length ? Math.round(top3.reduce((s, p) => s + (p.points || 0), 0) / top3.length) : 0;
  const bestWinrate = leaderboard.reduce((best, p) => {
    const wr = p.matches > 0 ? Math.round((p.wins / p.matches) * 100) : 0;
    return Math.max(best, wr);
  }, 0);
  const lastMatchAt = history.matches[0]?.created_at ? new Date(history.matches[0]?.created_at) : null;

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <PageTitle title="Classement" />
        <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
          <span
            className="group relative inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold text-white overflow-hidden ring-1 ring-white/20 border border-white/10"
            style={{ background: "linear-gradient(135deg, rgba(0,102,255,0.25) 0%, rgba(76,29,149,0.25) 100%)", boxShadow: "0 4px 14px rgba(0,0,0,0.25)" }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-800" />
            <Image
              src="/images/Membres page membres.png"
              alt="Membres"
              width={16}
              height={16}
              className="relative w-4 h-4 object-contain flex-shrink-0"
              unoptimized
            />
            <span className="relative">{totalPlayers} joueur{totalPlayers > 1 ? "s" : ""}</span>
          </span>
          <span
            className="group relative inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold text-white overflow-hidden ring-1 ring-white/20 border border-white/10"
            style={{ background: "linear-gradient(135deg, rgba(0,102,255,0.25) 0%, rgba(76,29,149,0.25) 100%)", boxShadow: "0 4px 14px rgba(0,0,0,0.25)" }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-800" />
            <Image
              src="/images/Historique des matchs joueur.png"
              alt="Historique"
              width={16}
              height={16}
              className="relative w-4 h-4 object-contain flex-shrink-0"
              unoptimized
            />
            <span className="relative">{totalMatches} match{totalMatches > 1 ? "s" : ""} comptabilisé{totalMatches > 1 ? "s" : ""}</span>
          </span>
        </div>
      </div>

      {top3.length > 0 && (
        <div className="mb-8">
          <div className="mb-3 sm:mb-4 flex items-center justify-center gap-2 sm:gap-3">
            <span className="h-px w-12 sm:w-16 md:w-24 bg-white/20" />
            <span className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-white/20 bg-white/10 px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold text-white shadow-sm">
              Top joueurs du moment
            </span>
            <span className="h-px w-12 sm:w-16 md:w-24 bg-white/20" />
          </div>

          <div className="hidden md:flex items-end justify-center gap-4 lg:gap-6 w-full mt-6 sm:mt-8">
            {top3[1] && (
              <div
                className="flex-1 max-w-[200px] lg:max-w-[240px]"
              >
                <div
                  className="podium-silver border-2 sm:border-3 md:border-4 border-slate-400/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 hover:border-slate-300/90 transition-all shadow-lg transform hover:scale-[1.02] relative overflow-hidden"
                  style={{ background: "linear-gradient(to bottom, #ffffff, #d8d8d8, #b8b8b8)", boxShadow: "0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(192, 192, 192, 0.35), inset 0 2px 4px rgba(255,255,255,0.5)" }}
                >
                  <div className="absolute top-1 sm:top-2 right-1 sm:right-2 z-20 opacity-90 drop-shadow-md">
                    <Image src="/images/Médaille top2.png" alt="Médaille 2ème place" width={48} height={48} className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" unoptimized />
                  </div>
                  <div className="text-center relative z-10 pt-3 sm:pt-4 md:pt-5">
                    <h3 className="text-lg sm:text-xl md:text-2xl font-extrabold mb-4 sm:mb-6 md:mb-8 text-gray-900 tracking-tight">{top3[1].player_name}</h3>
                    <div className="flex items-center justify-center mt-2 sm:mt-3 md:mt-4">
                      <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 bg-white/95 backdrop-blur border-2 border-zinc-500 ring-2 ring-zinc-300 shadow-lg shadow-zinc-300/70">
                        <span className="text-lg sm:text-xl md:text-2xl font-extrabold text-gray-900 tabular-nums">
                          {top3[1].points.toLocaleString()}
                        </span>
                        <span className="text-[10px] sm:text-xs font-semibold text-gray-800 uppercase tracking-wider">points</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {top3[0] && (
              <div className="flex-1 max-w-[220px] lg:max-w-[280px]">
                <div
                  className="podium-gold border-2 sm:border-3 md:border-4 border-yellow-500/80 rounded-xl sm:rounded-2xl p-5 sm:p-7 md:p-9 hover:border-yellow-400/90 transition-all shadow-xl transform hover:scale-[1.02] relative overflow-hidden"
                  style={{ background: "linear-gradient(to bottom, #ffffff, #ffe8a1, #ffdd44)", boxShadow: "0 6px 25px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 140px rgba(255, 215, 0, 0.4), inset 0 2px 6px rgba(255,255,255,0.6)" }}
                >
                  <div className="absolute top-1 sm:top-2 right-1 sm:right-2 z-20 opacity-95 drop-shadow-lg">
                    <Image src="/images/Médaille top1.png" alt="Médaille 1ère place" width={48} height={48} className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" unoptimized />
                  </div>
                  <div className="text-center relative z-10 pt-4 sm:pt-5 md:pt-6">
                    <div className="absolute -top-3 sm:-top-4 -left-3 sm:-left-4 z-20">
                      <span className="inline-flex items-center rounded-full bg-yellow-100 text-yellow-800 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold shadow-sm border border-yellow-300">
                        Meilleur joueur
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold mb-4 sm:mb-6 md:mb-8 text-gray-900 tracking-tight drop-shadow-sm">
                      {top3[0].player_name}
                    </h3>
                    <div className="flex items-center justify-center mt-2 sm:mt-3 md:mt-4">
                      <div className="inline-flex items-center gap-2 sm:gap-3 rounded-full px-4 sm:px-5 md:px-6 py-1.5 sm:py-2 md:py-2.5 bg-white/95 backdrop-blur border-2 border-yellow-500 ring-2 ring-yellow-300 shadow-xl shadow-yellow-300/70">
                        <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 tabular-nums">
                          {top3[0].points.toLocaleString()}
                        </span>
                        <span className="text-[10px] sm:text-xs font-semibold text-gray-900 uppercase tracking-wider">points</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {top3[2] && (
              <div className="flex-1 max-w-[200px] lg:max-w-[240px]">
                <div
                  className="podium-bronze border-2 sm:border-3 md:border-4 border-orange-600/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 hover:border-orange-500/90 transition-all shadow-lg transform hover:scale-[1.02] relative overflow-hidden"
                  style={{ background: "linear-gradient(to bottom, #ffffff, #ffd8b3, #ffc085)", boxShadow: "0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(205, 127, 50, 0.35), inset 0 2px 4px rgba(255,255,255,0.5)" }}
                >
                  <div className="absolute top-1 sm:top-2 right-1 sm:right-2 z-20 opacity-90 drop-shadow-md">
                    <Image src="/images/Médaille top3.png" alt="Médaille 3ème place" width={48} height={48} className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" unoptimized />
                  </div>
                  <div className="text-center relative z-10 pt-3 sm:pt-4 md:pt-5">
                    <h3 className="text-base sm:text-lg md:text-lg font-extrabold mb-4 sm:mb-6 md:mb-8 text-gray-900 tracking-tight">
                      {(() => {
                        const parts = (top3[2].player_name || "").split(" ");
                        const first = parts[0] || "";
                        const last = parts.slice(1).join(" ");
                        return (
                          <span>
                            <span className="text-lg sm:text-xl">{first}</span>
                            {last ? ` ${last}` : ""}
                          </span>
                        );
                      })()}
                    </h3>
                    <div className="flex items-center justify-center mt-2 sm:mt-3 md:mt-4">
                      <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 bg-white/95 backdrop-blur border-2 border-orange-500 ring-2 ring-orange-300 shadow-lg shadow-orange-300/70">
                        <span className="text-lg sm:text-xl md:text-2xl font-extrabold text-gray-900 tabular-nums">
                          {top3[2].points.toLocaleString()}
                        </span>
                        <span className="text-[10px] sm:text-xs font-semibold text-gray-800 uppercase tracking-wider">points</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="md:hidden space-y-3 sm:space-y-4 mt-6 sm:mt-8">
            {top3.map((player, index) => {
              const icons = [
                { src: "/images/Médaille top1.png", alt: "1ère place" },
                { src: "/images/Médaille top2.png", alt: "2ème place" },
                { src: "/images/Médaille top3.png", alt: "3ème place" }
              ];

              return (
                <div
                  key={player.user_id}
                  className={`rounded-xl sm:rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-2xl border-2 sm:border-3 md:border-4 ${
                    index === 0 ? "podium-gold border-yellow-500/80" : index === 1 ? "podium-silver border-slate-400/80" : "podium-bronze border-orange-600/80"
                  }`}
                  style={
                    index === 0
                      ? { background: "linear-gradient(to bottom, #ffffff, #ffe8a1, #ffdd44)", boxShadow: "0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(255, 215, 0, 0.35), inset 0 2px 4px rgba(255,255,255,0.6)" }
                      : index === 1
                      ? { background: "linear-gradient(to bottom, #ffffff, #d8d8d8, #b8b8b8)", boxShadow: "0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(192, 192, 192, 0.32), inset 0 2px 4px rgba(255,255,255,0.5)" }
                      : { background: "linear-gradient(to bottom, #ffffff, #ffd8b3, #ffc085)", boxShadow: "0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(205, 127, 50, 0.32), inset 0 2px 4px rgba(255,255,255,0.5)" }
                  }
                >
                  <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 z-20 drop-shadow">
                    <Image src={icons[index].src} alt={icons[index].alt} width={48} height={48} className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" unoptimized />
                  </div>
                  {index === 0 && (
                    <div className="absolute -top-3 sm:-top-4 -left-3 sm:-left-4 z-20">
                      <span className="inline-flex items-center rounded-full bg-yellow-100 text-yellow-800 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold shadow-sm border border-yellow-300">
                        Meilleur joueur
                      </span>
                    </div>
                  )}
                  <div className="relative z-10 pt-3 sm:pt-4">
                    <h3
                      className={`font-extrabold mb-4 sm:mb-5 md:mb-6 text-center text-gray-900 ${
                        index === 0 ? "text-lg sm:text-xl md:text-2xl" : index === 1 ? "text-base sm:text-lg md:text-xl" : "text-sm sm:text-base md:text-lg"
                      }`}
                    >
                      <span>
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
                      </span>
                    </h3>
                    <div className="flex items-center justify-center mt-2 sm:mt-3">
                      <div
                        className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 bg-white/95 backdrop-blur border-2 shadow-lg ${
                          index === 0 ? "border-yellow-500 ring-2 ring-yellow-300" : index === 1 ? "border-zinc-500 ring-2 ring-zinc-300" : "border-orange-500 ring-2 ring-orange-300"
                        }`}
                      >
                        <span className="text-base sm:text-lg font-extrabold text-gray-900 tabular-nums">
                          {player.points.toLocaleString()}
                        </span>
                        <span className="text-[10px] sm:text-xs font-semibold text-gray-900 uppercase tracking-wider">
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
          <div className="px-3 sm:px-4 md:px-5 pt-3 sm:pt-4 md:pt-5">
            <div className="mb-3 sm:mb-4 flex items-center justify-center gap-2 sm:gap-3">
              <span className="h-px w-12 sm:w-16 md:w-24 bg-white/20" />
              <span className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-white/20 bg-white/10 px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold text-white shadow-sm">
                Classement global
              </span>
              <span className="h-px w-12 sm:w-16 md:w-24 bg-white/20" />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl sm:rounded-2xl md:rounded-3xl border-2 sm:border-3 md:border-4 border-slate-300 bg-white shadow-2xl scrollbar-hide">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs md:text-sm font-semibold uppercase tracking-wider text-slate-700 border-l border-slate-200 first:border-l-0">
                    Rang
                  </th>
                  <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs md:text-sm font-semibold uppercase tracking-wider text-slate-700 border-l border-slate-200 first:border-l-0">
                    Joueur
                  </th>
                  <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs md:text-sm font-semibold uppercase tracking-wider text-slate-700 border-l border-slate-200 first:border-l-0 hidden sm:table-cell">
                    Niveau
                  </th>
                  <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs md:text-sm font-semibold uppercase tracking-wider text-slate-700 border-l border-slate-200 first:border-l-0">
                    Points
                  </th>
                  <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs md:text-sm font-semibold uppercase tracking-wider text-slate-700 border-l border-slate-200 first:border-l-0 hidden md:table-cell">
                    Winrate
                  </th>
                  <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs md:text-sm font-semibold uppercase tracking-wider text-slate-700 border-l border-slate-200 first:border-l-0 hidden sm:table-cell">
                    V
                  </th>
                  <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs md:text-sm font-semibold uppercase tracking-wider text-slate-700 border-l border-slate-200 first:border-l-0 hidden sm:table-cell">
                    D
                  </th>
                  <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs md:text-sm font-semibold uppercase tracking-wider text-slate-700 border-l border-slate-200 first:border-l-0 hidden md:table-cell">
                    MJ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {leaderboard.map((player, idx) => {
                  const winRate = player.matches > 0 ? Math.round((player.wins / player.matches) * 100) : 0;
                  const tier = tierForPoints(player.points);
                  const rowClass = "bg-white";
                  return (
                    <tr key={player.user_id} className={rowClass}>
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-[10px] sm:text-xs md:text-sm font-semibold text-slate-800 text-center border-l border-slate-200 first:border-l-0">
                        <RankBadge rank={player.rank} size="md" />
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-[10px] sm:text-xs md:text-sm text-slate-800 text-center border-l border-slate-200 first:border-l-0">
                        <span className="font-semibold truncate block max-w-[120px] sm:max-w-none">{player.player_name}</span>
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-[10px] sm:text-xs md:text-sm text-center border-l border-slate-200 first:border-l-0 hidden sm:table-cell">
                        <TierBadge tier={tier} size="sm" />
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-[10px] sm:text-xs md:text-sm text-center tabular-nums text-slate-900 border-l border-slate-200 first:border-l-0 font-semibold">
                        {player.points}
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-[10px] sm:text-xs md:text-sm text-center tabular-nums border-l border-slate-200 first:border-l-0 font-semibold text-emerald-600 hidden md:table-cell">
                        {winRate}%
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-[10px] sm:text-xs md:text-sm text-center tabular-nums text-emerald-700 bg-emerald-50 border-l border-slate-200 first:border-l-0 font-semibold hidden sm:table-cell">
                        {player.wins}
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-[10px] sm:text-xs md:text-sm text-center tabular-nums text-rose-700 bg-rose-50 border-l border-slate-200 first:border-l-0 font-semibold hidden sm:table-cell">
                        {player.losses}
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-[10px] sm:text-xs md:text-sm text-center tabular-nums text-slate-700 border-l border-slate-200 first:border-l-0 font-semibold hidden md:table-cell">
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
        <div className="rounded-lg sm:rounded-xl border border-white/40 ring-1 ring-white/10 bg-white/5 p-4 sm:p-6 text-xs sm:text-sm text-white/60">
          Pas encore de matchs enregistrés pour générer un classement.
        </div>
      )}
    </div>
  );
}



