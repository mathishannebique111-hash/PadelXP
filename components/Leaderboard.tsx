"use client";

import { useEffect, useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { LeaderboardEntry } from "@/lib/types";
import RankBadge from "@/components/RankBadge";
import { getBadges, type PlayerStats } from "@/lib/badges";
import TierBadge from "./TierBadge";
 

type Props = {
  initialData: LeaderboardEntry[];
  currentUserId: string;
};

const BLUE = "#0066FF";
const GREEN = "#BFFF00";

function tierForPoints(points: number) {
  if (points >= 500) return { label: "Champion", className: "bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white", nextAt: Infinity };
  if (points >= 300) return { label: "Diamant", className: "bg-gradient-to-r from-cyan-500 to-blue-500 text-white", nextAt: 500 };
  if (points >= 200) return { label: "Or", className: "bg-gradient-to-r from-amber-400 to-yellow-500 text-white", nextAt: 300 };
  if (points >= 100) return { label: "Argent", className: "bg-gradient-to-r from-zinc-300 to-zinc-400 text-zinc-800", nextAt: 200 };
  return { label: "Bronze", className: "bg-gradient-to-r from-orange-400 to-orange-600 text-white", nextAt: 100 };
}

function computeBadges(row: LeaderboardEntry, streak: number): { icon: string; title: string }[] {
  const stats: PlayerStats = {
    wins: row.wins,
    losses: row.losses,
    matches: row.matches,
    points: row.points,
    streak,
  };
  const badges = getBadges(stats);
  return badges.map(b => ({ icon: b.icon, title: b.title }));
}


export default function Leaderboard({ initialData, currentUserId }: Props) {
  const supabase = createClientComponentClient();
  const [streak, setStreak] = useState<Record<string, number>>({});

  const rows = useMemo(() => {
    // Utiliser les points issus de la vue SQL (inclut bonus premier avis)
    const sorted = [...initialData].sort((a, b) => b.points - a.points || b.wins - a.wins || a.matches - b.matches);
    return sorted.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [initialData]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const next: Record<string, number> = {};
      await Promise.all(
        rows.slice(0, 10).map(async (r) => {
          // Gérer les guests : si user_id commence par "guest_", c'est un guest
          const isGuest = r.user_id.startsWith("guest_");
          let query = supabase
            .from("match_participants")
            .select("match_id, team, matches!inner(winner_team_id, team1_id, team2_id, created_at)")
            .order("matches.created_at", { ascending: true });
          
          if (isGuest) {
            // Pour les guests, extraire l'ID réel et chercher par guest_player_id
            const guestId = r.user_id.replace("guest_", "");
            query = query.eq("guest_player_id", guestId).eq("player_type", "guest");
          } else {
            // Pour les users, chercher par user_id
            query = query.eq("user_id", r.user_id).eq("player_type", "user");
          }
          
          const { data } = await query;
          
          if (!data || data.length === 0) {
            return;
          }
          
          let cs = 0;
          let best = 0;
          data.forEach((p: any) => {
              // Déterminer winner_team (1 ou 2) à partir de winner_team_id
              const winner_team = p.matches?.winner_team_id === p.matches?.team1_id ? 1 : 2;
              const w = winner_team === p.team;
              cs = w ? cs + 1 : 0;
              if (cs > best) best = cs;
            });
            next[r.user_id] = best;
          } else if (data && isGuest) {
            // Pour les guests, on peut garder tous les matchs (ou les filtrer si nécessaire)
            let cs = 0;
            let best = 0;
            data.forEach((p: any) => {
              const winner_team = p.matches?.winner_team_id === p.matches?.team1_id ? 1 : 2;
              const w = winner_team === p.team;
              cs = w ? cs + 1 : 0;
              if (cs > best) best = cs;
            });
            next[r.user_id] = best;
          }
        })
      );
      if (!cancelled) setStreak(next);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [rows, supabase]);

  const top3 = rows.slice(0, 3);
  const rest = rows; // Afficher tous les joueurs y compris le top 3

  const totalPlayers = rows.length;
  const totalMatches = rows.reduce((sum, r) => sum + r.matches, 0);
  const bestWinrateRow = useMemo(() => {
    if (!rows.length) return null;
    let best = rows[0];
    let bestRate = best.matches ? best.wins / best.matches : 0;
    rows.forEach((r) => {
      const rate = r.matches ? r.wins / r.matches : 0;
      if (rate > bestRate) {
        best = r;
        bestRate = rate;
      }
    });
    return { name: best.player_name, rate: Math.round(bestRate * 100) };
  }, [rows]);

  return (
    <div className="space-y-8">
      {/* Podium Top 3 - Focus principal avec agrandissement */}
      {top3.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* 2ème place */}
            {top3[1] && (
              <div 
                className="group relative overflow-hidden rounded-2xl p-8 transition-all hover:scale-[1.02] bg-white" 
                style={{ 
                  border: "3px solid #C0C0C0",
                  boxShadow: "0 0 20px rgba(192,192,192,0.3)",
                }}
              >
                <div className="shimmer-layer shimmer-silver" style={{ animationDelay: '0.7s' }} />
                <div className="absolute -top-2 -right-2 text-6xl z-10">
                  🥈
                </div>
                <div className="mb-4">
                  <div className="text-2xl font-bold text-gray-900">{top3[1].player_name}</div>
                </div>
                <div className="mb-4 grid grid-cols-3 gap-3">
                  <div className="rounded-lg p-3 text-center bg-gray-50">
                    <div className="text-xs text-gray-600">P</div>
                    <div className="text-lg font-bold text-gray-900 tabular-nums">{top3[1].matches}</div>
                  </div>
                  <div className="rounded-lg p-3 text-center bg-gray-50">
                    <div className="text-xs text-gray-600">V</div>
                    <div className="text-lg font-bold text-gray-900 tabular-nums">{top3[1].wins}</div>
                  </div>
                  <div className="rounded-lg p-3 text-center bg-gray-50">
                    <div className="text-xs text-gray-600">D</div>
                    <div className="text-lg font-bold text-gray-900 tabular-nums">{top3[1].losses}</div>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <TierBadge tier={tierForPoints(top3[1].points).label as "Bronze" | "Argent" | "Or" | "Diamant" | "Champion"} size="sm" />
                </div>
              </div>
            )}

            {/* 1ère place - Mise en avant avec bordure dorée */}
            {top3[0] && (
              <div 
                className="group relative overflow-hidden rounded-2xl p-8 transition-all hover:scale-[1.02] lg:scale-105 bg-white" 
                style={{ 
                  border: "3px solid #FFD700",
                  boxShadow: "0 0 25px rgba(255,215,0,0.5)",
                }}
              >
                <div className="shimmer-layer shimmer-gold" style={{ animationDelay: '0s' }} />
                <div className="absolute -top-2 -right-2 text-6xl z-10">
                  🥇
                </div>
                <div className="mb-4">
                  <div className="text-3xl font-bold text-gray-900">{top3[0].player_name}</div>
                </div>
                <div className="mb-4 grid grid-cols-3 gap-3">
                  <div className="rounded-lg p-3 text-center bg-gray-50">
                    <div className="text-xs text-gray-600">P</div>
                    <div className="text-xl font-bold text-gray-900 tabular-nums">{top3[0].matches}</div>
                  </div>
                  <div className="rounded-lg p-3 text-center bg-gray-50">
                    <div className="text-xs text-gray-600">V</div>
                    <div className="text-xl font-bold text-gray-900 tabular-nums">{top3[0].wins}</div>
                  </div>
                  <div className="rounded-lg p-3 text-center bg-gray-50">
                    <div className="text-xs text-gray-600">D</div>
                    <div className="text-xl font-bold text-gray-900 tabular-nums">{top3[0].losses}</div>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <TierBadge tier={tierForPoints(top3[0].points).label as "Bronze" | "Argent" | "Or" | "Diamant" | "Champion"} size="sm" />
                </div>
              </div>
            )}

            {/* 3ème place */}
            {top3[2] && (
              <div 
                className="group relative overflow-hidden rounded-2xl p-8 transition-all hover:scale-[1.02] bg-white" 
                style={{ 
                  border: "3px solid #B87333",
                  boxShadow: "0 0 20px rgba(184,115,51,0.3)",
                }}
              >
                <div className="shimmer-layer shimmer-bronze" style={{ animationDelay: '1.4s' }} />
                <div className="absolute -top-2 -right-2 text-6xl z-10">
                  🥉
                </div>
                <div className="mb-4">
                  <div className="text-2xl font-bold text-gray-900">{top3[2].player_name}</div>
                </div>
                <div className="mb-4 grid grid-cols-3 gap-3">
                  <div className="rounded-lg p-3 text-center bg-gray-50">
                    <div className="text-xs text-gray-600">P</div>
                    <div className="text-lg font-bold text-gray-900 tabular-nums">{top3[2].matches}</div>
                  </div>
                  <div className="rounded-lg p-3 text-center bg-gray-50">
                    <div className="text-xs text-gray-600">V</div>
                    <div className="text-lg font-bold text-gray-900 tabular-nums">{top3[2].wins}</div>
                  </div>
                  <div className="rounded-lg p-3 text-center bg-gray-50">
                    <div className="text-xs text-gray-600">D</div>
                    <div className="text-lg font-bold text-gray-900 tabular-nums">{top3[2].losses}</div>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <TierBadge tier={tierForPoints(top3[2].points).label as "Bronze" | "Argent" | "Or" | "Diamant" | "Champion"} size="sm" />
                </div>
              </div>
            )}
          </div>
          <style jsx global>{`
            @keyframes shimmerDiag {
              0% {
                transform: translateX(-100%) translateY(-100%) rotate(45deg);
              }
              100% {
                transform: translateX(100%) translateY(100%) rotate(45deg);
              }
            }

            .shimmer-layer {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              transform: translateX(-100%) translateY(-100%) rotate(45deg);
              animation: shimmerDiag 3s infinite linear;
              pointer-events: none;
              z-index: 10;
            }

            .shimmer-gold {
              background: linear-gradient(
                90deg,
                transparent 0%,
                rgba(255, 255, 255, 0.6) 50%,
                transparent 100%
              );
            }
            .shimmer-silver {
              background: linear-gradient(
                90deg,
                transparent 0%,
                rgba(255, 255, 255, 0.4) 50%,
                transparent 100%
              );
            }
            .shimmer-bronze {
              background: linear-gradient(
                90deg,
                transparent 0%,
                rgba(255, 215, 0, 0.3) 50%,
                transparent 100%
              );
            }
          `}</style>
        </div>
      )}

      {/* Tableau du classement global - Sobre */}
      {rest.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-lg" style={{ border: "1px solid rgba(0,0,0,0.1)" }}>
          <div className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-2xl" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
            <h3 className="text-xl font-bold text-gray-900 text-center">📊 Classement Global</h3>
          </div>
          <div className="rounded-b-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2" style={{ borderColor: "rgba(0,0,0,0.15)" }}>
                  <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.05em] text-gray-700 border-r border-gray-200 tabular-nums">Rang</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.05em] text-gray-700 border-r border-gray-200">Joueur</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.05em] text-gray-700 border-r border-gray-200">Niveau</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.05em] text-gray-700 border-r border-gray-200 tabular-nums">Points</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.05em] text-gray-700 border-r border-gray-200 tabular-nums">Winrate</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.05em] text-gray-700 border-r border-gray-200 tabular-nums">V</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.05em] text-gray-700 border-r border-gray-200 tabular-nums">D</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.05em] text-gray-700 tabular-nums">MJ</th>
                </tr>
              </thead>
              <tbody>
                {rest.map((r, idx) => {
                  const tier = tierForPoints(r.points);
                  const badges = computeBadges(r, streak[r.user_id] || 0);
                  const winrate = r.matches ? Math.round((r.wins / r.matches) * 100) : 0;
                  // Couleurs plus visibles pour le winrate
                  const rateClass = winrate > 60 ? "font-semibold" : winrate >= 40 ? "font-medium" : "font-medium";
                  const rateColor = winrate > 60 ? "#10B981" : winrate >= 40 ? "#0066FF" : "#EF4444"; // Vert foncé, bleu, rouge foncé
                  const isCurrentUser = r.user_id === currentUserId;
                  
                  return (
                    <tr
                      key={r.user_id}
                      className={`transition-all duration-200 ${
                        isCurrentUser 
                          ? "bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100" 
                          : "bg-white hover:bg-gray-50"
                      } ${idx % 2 === 0 ? "" : "bg-opacity-50"}`}
                      style={{
                        borderBottom: idx < rest.length - 1 ? "1px solid rgba(0,0,0,0.08)" : "none",
                      }}
                    >
                      <td className="px-4 py-4 text-center border-r border-gray-100">
                        <div className="flex items-center justify-center">
                          <RankBadge rank={r.rank} size="sm" />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center border-r border-gray-100">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 text-base">{r.player_name}</span>
                          {r.isGuest && (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-gray-600 bg-gray-200 border border-gray-300 tabular-nums">
                              👤 Invité
                            </span>
                          )}
                          {isCurrentUser && (
                            <span 
                              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white transition-all hover:scale-110 shadow-sm tabular-nums" 
                              style={{ 
                                background: "linear-gradient(135deg, #0066FF, #0052CC)",
                                boxShadow: "0 2px 8px rgba(0,102,255,0.3)",
                                letterSpacing: "0.01em"
                              }}
                            >
                              VOUS
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center border-r border-gray-100">
                        <div className="flex items-center justify-center">
                          <div title={tier.nextAt === Infinity ? "Niveau maximum" : `${Math.max(0, tier.nextAt - r.points)} pts avant le niveau suivant`}>
                            <TierBadge tier={tier.label as "Bronze" | "Argent" | "Or" | "Diamant" | "Champion"} size="sm" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center border-r border-gray-100">
                        <span className="text-base font-semibold text-gray-900 tabular-nums">{r.points.toLocaleString()}</span>
                      </td>
                      <td className={`px-4 py-4 text-center border-r border-gray-100 ${rateClass}`}>
                        <span className="text-base font-semibold tabular-nums" style={{ color: rateColor }}>{winrate}%</span>
                      </td>
                      <td className="px-4 py-4 text-center text-base font-semibold text-gray-700 border-r border-gray-100 tabular-nums">{r.wins}</td>
                      <td className="px-4 py-4 text-center text-base font-semibold text-gray-700 border-r border-gray-100 tabular-nums">{r.losses}</td>
                      <td className="px-4 py-4 text-center text-base font-semibold text-gray-700 tabular-nums">{r.matches}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
