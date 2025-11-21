import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserClubInfo, getClubMatchHistory } from "@/lib/utils/club-utils";
import { calculatePlayerLeaderboard } from "@/lib/utils/player-leaderboard-utils";
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
          Aucun club n'est relié à ce compte. Ajoutez un club pour visualiser votre classement.
        </div>
      </div>
    );
  }

  // Utiliser la même fonction de calcul que la page profil du compte joueur pour obtenir les données identiques
  const leaderboard = await calculatePlayerLeaderboard(clubId);
  const history = await getClubMatchHistory(clubId, clubSlug);

  const top3 = leaderboard.slice(0, 3);
  const totalPlayers = leaderboard.length;
  const totalMatches = leaderboard.reduce((sum, p) => sum + p.matches, 0);
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
        <div className="mb-6 sm:mb-8">
          <div className="mb-3 sm:mb-4 flex items-center justify-center gap-2 sm:gap-3">
            <span className="h-px w-5 sm:w-8 md:w-10 bg-gray-300" />
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold text-white shadow-sm">
              Top joueurs du moment
            </span>
            <span className="h-px w-5 sm:w-8 md:w-10 bg-gray-300" />
          </div>
          <div className="hidden md:flex items-end justify-center gap-4 md:gap-6 w-full mt-6 md:mt-8">
            <div className="flex-1 max-w-[240px]">
              <div 
                className="podium-silver border-4 border-slate-400/80 rounded-2xl p-8 shadow-lg relative overflow-hidden"
                style={{
                  background: 'linear-gradient(to bottom, #ffffff, #d8d8d8, #b8b8b8)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(192, 192, 192, 0.35), inset 0 2px 4px rgba(255,255,255,0.5)'
                }}
              >
                <div className="absolute top-2 right-2 z-30">
                  <span className="text-3xl md:text-4xl lg:text-5xl">🥈</span>
                </div>
                <div className="text-center relative z-10 pt-5">
                  <h3 className="text-2xl md:text-3xl font-extrabold mb-8 text-gray-900 tracking-tight">
                    {top3[1].player_name}
                  </h3>
                  <div className="flex items-center justify-center mt-4">
                    <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 bg-white/95 backdrop-blur border-2 border-zinc-500 ring-2 ring-zinc-300 shadow-lg shadow-zinc-300/70">
                      <span className="text-2xl font-bold text-gray-900 tabular-nums">{top3[1].points.toLocaleString()}</span>
                      <span className="text-xs font-normal text-gray-800 uppercase tracking-wider">points</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 max-w-[280px]">
              <div 
                className="podium-gold border-4 border-yellow-500/80 rounded-2xl p-9 shadow-xl relative overflow-hidden"
                style={{
                  background: 'linear-gradient(to bottom, #ffffff, #ffe8a1, #ffdd44)',
                  boxShadow: '0 6px 25px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 140px rgba(255, 215, 0, 0.4), inset 0 2px 6px rgba(255,255,255,0.6)'
                }}
              >
                <div className="absolute top-2 right-2 z-30">
                  <span className="text-3xl md:text-4xl lg:text-5xl">🥇</span>
                </div>
                <div className="absolute top-1 left-1 z-20">
                  <span className="inline-flex items-center rounded-full bg-yellow-100 text-yellow-800 px-2 py-0.5 text-xs font-semibold shadow-sm border border-yellow-300">Meilleur joueur</span>
                </div>
                <div className="text-center relative z-10 pt-6">
                  <h3 className="text-2xl md:text-3xl font-extrabold mb-8 text-gray-900 tracking-tight drop-shadow-sm">
                    {top3[0].player_name}
                  </h3>
                  <div className="flex items-center justify-center mt-4">
                    <div className="inline-flex items-center gap-3 rounded-full px-6 py-2.5 bg-white/95 backdrop-blur border-2 border-yellow-500 ring-2 ring-yellow-300 shadow-xl shadow-yellow-300/70">
                      <span className="text-2xl font-bold text-gray-900 tabular-nums">{top3[0].points.toLocaleString()}</span>
                      <span className="text-xs font-normal text-gray-900 uppercase tracking-wider">points</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 max-w-[240px]">
              <div 
                className="podium-bronze border-4 border-orange-600/80 rounded-2xl p-8 shadow-lg relative overflow-hidden"
                style={{
                  background: 'linear-gradient(to bottom, #ffffff, #ffd8b3, #ffc085)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(205, 127, 50, 0.35), inset 0 2px 4px rgba(255,255,255,0.5)'
                }}
              >
                <div className="absolute top-2 right-2 z-30">
                  <span className="text-3xl md:text-4xl lg:text-5xl">🥉</span>
                </div>
                <div className="text-center relative z-10 pt-5">
                  <h3 className="text-2xl md:text-3xl font-extrabold mb-8 text-gray-900 tracking-tight">
                    {(() => { var parts = (top3[2].player_name || '').split(' '); var f = parts[0] || ''; var l = parts.slice(1).join(' '); return (<span><span className="text-2xl md:text-3xl">{f}</span>{l ? ' ' + l : ''}</span>); })()}
                  </h3>
                  <div className="flex items-center justify-center mt-4">
                    <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 bg-white/95 backdrop-blur border-2 border-orange-500 ring-2 ring-orange-300 shadow-lg shadow-orange-300/70">
                      <span className="text-2xl font-bold text-gray-900 tabular-nums">{top3[2].points.toLocaleString()}</span>
                      <span className="text-xs font-normal text-gray-800 uppercase tracking-wider">points</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="md:hidden space-y-3 sm:space-y-4 mt-4 sm:mt-6">
            {top3.map(function(player, index) {
              var medalEmojis = ['🥇', '🥈', '🥉'];
              var borderColors = [
                'border-yellow-500/80',
                'border-slate-400/80',
                'border-orange-600/80'
              ];
              var borderWidth = 'border-4';
              var shineClass = index === 0 ? 'podium-gold' : index === 1 ? 'podium-silver' : 'podium-bronze';
              var bgGradients = [
                { background: 'linear-gradient(to bottom, #ffffff, #ffe8a1, #ffdd44)', boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(255, 215, 0, 0.35), inset 0 2px 4px rgba(255,255,255,0.6)' },
                { background: 'linear-gradient(to bottom, #ffffff, #d8d8d8, #b8b8b8)', boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(192, 192, 192, 0.32), inset 0 2px 4px rgba(255,255,255,0.5)' },
                { background: 'linear-gradient(to bottom, #ffffff, #ffd8b3, #ffc085)', boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(205, 127, 50, 0.32), inset 0 2px 4px rgba(255,255,255,0.5)' }
              ];
              return (
                <div key={player.user_id} className={(shineClass + ' ' + borderWidth + ' ' + borderColors[index] + ' rounded-2xl p-5 shadow-2xl relative overflow-hidden')} style={bgGradients[index]}>
                  <div className="absolute top-2 right-2 z-30">
                    <span className="text-3xl md:text-4xl">{medalEmojis[index]}</span>
                  </div>
                  <div className="relative z-10 pt-4">
                    <h3 className={"font-extrabold mb-6 text-center text-gray-900 " + (index === 0 ? 'text-2xl' : index === 1 ? 'text-2xl' : 'text-2xl')}>
                      {index === 2 ? (function(){ var parts=(player.player_name||'').split(' '); var f=parts[0]||''; var l=parts.slice(1).join(' '); return (<span><span className="text-2xl">{f}</span>{l ? ' ' + l : ''}</span>); })() : player.player_name}
                    </h3>
                    <div className="flex items-center justify-center mt-2">
                      <div className={"inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-white/95 backdrop-blur border-2 shadow-lg " + (index === 0 ? 'border-yellow-500 ring-2 ring-yellow-300' : index === 1 ? 'border-zinc-500 ring-2 ring-zinc-300' : 'border-orange-500 ring-2 ring-orange-300')}>
                        <span className="text-2xl font-bold text-gray-900 tabular-nums">{player.points.toLocaleString()}</span>
                        <span className="text-xs font-normal text-gray-900 uppercase tracking-wider">points</span>
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
              <span className="h-px w-5 sm:w-8 md:w-10 bg-gray-300" />
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold text-white shadow-sm">
                Classement global
              </span>
              <span className="h-px w-5 sm:w-8 md:w-10 bg-gray-300" />
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl sm:rounded-2xl border-2 sm:border-4 border-white/70 bg-white/5 backdrop-blur-sm shadow-xl scrollbar-hide">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 bg-gray-100">Rang</th>
                  <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0">Joueur</th>
                  <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 hidden sm:table-cell">Niveau</th>
                  <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0">Points</th>
                  <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 hidden md:table-cell">Winrate</th>
                  <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider border-l border-gray-200 first:border-l-0" style={{ color: "#10B981", backgroundColor: "#F0FDF4" }}>V</th>
                  <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider border-l border-gray-200 first:border-l-0" style={{ color: "#EF4444", backgroundColor: "#FEF2F2" }}>D</th>
                  <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 hidden sm:table-cell">MJ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {leaderboard.map(function(player, idx) {
                  var winRate = player.matches > 0 ? Math.round((player.wins / player.matches) * 100) : 0;
                  var tierLabel = (player.points >= 500) ? 'Champion' : (player.points >= 300) ? 'Diamant' : (player.points >= 200) ? 'Or' : (player.points >= 100) ? 'Argent' : 'Bronze';
                  var nameParts = (player.player_name || '').trim().split(' ');
                  var firstName = nameParts[0] || '';
                  var lastName = nameParts.slice(1).join(' ');
                  var rowClass = idx === 0 ? 'bg-gray-50' : '';
                  return (
                    <tr key={player.user_id} className={rowClass}>
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900 text-center border-l border-gray-200 first:border-l-0">
                        <RankBadge rank={player.rank} size="md" />
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 text-center border-l border-gray-200 first:border-l-0">
                        <span className="truncate block max-w-[120px] sm:max-w-none"><strong>{firstName || 'Joueur'}</strong>{lastName ? ' ' + lastName : ''}</span>
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center border-l border-gray-200 first:border-l-0 hidden sm:table-cell">
                        <TierBadge tier={tierLabel as "Bronze" | "Argent" | "Or" | "Diamant" | "Champion"} size="sm" />
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center tabular-nums text-gray-900 border-l border-gray-200 first:border-l-0 font-semibold">{player.points}</td>
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center tabular-nums border-l border-gray-200 first:border-l-0 font-semibold hidden md:table-cell" style={{ color: winRate > 60 ? '#10B981' : winRate >= 40 ? '#0066FF' : '#EF4444' }}>{winRate}%</td>
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center tabular-nums border-l border-gray-200 first:border-l-0 font-semibold" style={{ color: "#10B981", backgroundColor: "#F0FDF4" }}>{player.wins}</td>
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center tabular-nums border-l border-gray-200 first:border-l-0 font-semibold" style={{ color: "#EF4444", backgroundColor: "#FEF2F2" }}>{player.losses}</td>
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center tabular-nums text-gray-700 border-l border-gray-200 first:border-l-0 font-semibold hidden sm:table-cell">{player.matches}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-gray-500 text-sm">Aucun joueur dans le classement</div>
      )}
    </div>
  );
}



