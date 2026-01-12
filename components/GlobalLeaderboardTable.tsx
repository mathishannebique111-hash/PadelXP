'use client';

import { useState, useEffect } from 'react';
import RankBadge from './RankBadge';
import TierBadge from './TierBadge';
import { logger } from '@/lib/logger';
import { User } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  player_name: string;
  points: number;
  wins: number;
  losses: number;
  matches: number;
  isGuest: boolean;
  avatar_url?: string | null;
}

interface GlobalLeaderboardTableProps {
  initialLeaderboard: LeaderboardEntry[];
  initialProfilesFirstNameMap: Map<string, string>;
  initialProfilesLastNameMap: Map<string, string>;
  currentUserId?: string;
}

export default function GlobalLeaderboardTable({
  initialLeaderboard,
  initialProfilesFirstNameMap,
  initialProfilesLastNameMap,
  currentUserId,
}: GlobalLeaderboardTableProps) {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(initialLeaderboard);
  const [profilesFirstNameMap, setProfilesFirstNameMap] = useState<Map<string, string>>(initialProfilesFirstNameMap);
  const [profilesLastNameMap, setProfilesLastNameMap] = useState<Map<string, string>>(initialProfilesLastNameMap);

  // Recharger les données du leaderboard après les événements de match
  useEffect(() => {
    const reloadLeaderboard = async () => {
      try {
        logger.info("[GlobalLeaderboardTable] Reloading leaderboard...");
        const response = await fetch("/api/leaderboard?t=" + Date.now(), {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.leaderboard) {
            logger.info(`[GlobalLeaderboardTable] Leaderboard data received: ${data.leaderboard.length} players`);
            // Ajouter le rang à chaque joueur (l'API retourne déjà les données triées)
            const leaderboardWithRank = data.leaderboard.map((player: LeaderboardEntry, index: number) => ({
              ...player,
              rank: index + 1,
            }));
            setLeaderboardData(leaderboardWithRank);
            // Parser les noms depuis player_name pour créer les maps
            const newFirstNameMap = new Map<string, string>();
            const newLastNameMap = new Map<string, string>();
            data.leaderboard.forEach((player: LeaderboardEntry) => {
              if (player.player_name) {
                const nameParts = player.player_name.trim().split(/\s+/);
                if (nameParts.length > 0) {
                  newFirstNameMap.set(player.user_id, nameParts[0]);
                  if (nameParts.length > 1) {
                    newLastNameMap.set(player.user_id, nameParts.slice(1).join(' '));
                  }
                }
              }
            });
            setProfilesFirstNameMap(newFirstNameMap);
            setProfilesLastNameMap(newLastNameMap);
          }
        }
      } catch (error) {
        logger.error("[GlobalLeaderboardTable] Error reloading leaderboard:", error);
      }
    };

    // Écouter les événements de soumission de match (événement personnalisé pour le même onglet)
    const handleMatchSubmitted = () => {
      logger.info("[GlobalLeaderboardTable] matchSubmitted event received");
      reloadLeaderboard();
    };

    // Écouter les événements storage pour la communication cross-tab
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "matchSubmitted" && e.newValue === "true") {
        logger.info("[GlobalLeaderboardTable] matchSubmitted storage event received");
        reloadLeaderboard();
      }
    };

    if (typeof window !== "undefined") {
      logger.info("[GlobalLeaderboardTable] Setting up event listeners");
      window.addEventListener("matchSubmitted", handleMatchSubmitted);
      window.addEventListener("storage", handleStorageChange);

      // Recharger immédiatement au montage pour avoir les dernières données
      reloadLeaderboard();

      // Recharger également si le flag est déjà présent (même onglet)
      if (localStorage.getItem("matchSubmitted") === "true") {
        logger.info("[GlobalLeaderboardTable] matchSubmitted flag found in localStorage");
        setTimeout(() => {
          reloadLeaderboard();
          localStorage.removeItem("matchSubmitted");
        }, 500);
      }

      // Recharger toutes les 2 secondes pour avoir les dernières données
      const interval = setInterval(reloadLeaderboard, 2000);

      return () => {
        logger.info("[GlobalLeaderboardTable] Cleaning up event listeners");
        window.removeEventListener("matchSubmitted", handleMatchSubmitted);
        window.removeEventListener("storage", handleStorageChange);
        clearInterval(interval);
      };
    }
  }, []);

  if (leaderboardData.length === 0) {
    return (
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
        <div className="overflow-x-auto rounded-lg sm:rounded-xl md:rounded-2xl border-2 sm:border-4 border-white/70 bg-white/5 backdrop-blur-sm shadow-xl scrollbar-hide">
          <div className="p-8 text-center">
            <p className="text-sm text-white/70">
              Aucun joueur dans le classement pour le moment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
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
      <div className="overflow-x-auto rounded-lg sm:rounded-xl md:rounded-2xl border-2 sm:border-4 border-white/70 bg-white/5 backdrop-blur-sm shadow-xl scrollbar-hide">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 bg-gray-100 whitespace-nowrap w-14 sm:w-auto">Rang</th>
              <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 whitespace-nowrap min-w-[120px] sm:min-w-[150px]">Joueur</th>
              <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 hidden sm:table-cell whitespace-nowrap">Niveau</th>
              <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 whitespace-nowrap">Points</th>
              <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 hidden md:table-cell whitespace-nowrap">Winrate</th>
              <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider border-l border-gray-200 first:border-l-0 hidden sm:table-cell whitespace-nowrap" style={{ color: "#10B981", backgroundColor: "#F0FDF4" }}>V</th>
              <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider border-l border-gray-200 first:border-l-0 hidden sm:table-cell whitespace-nowrap" style={{ color: "#EF4444", backgroundColor: "#FEF2F2" }}>D</th>
              <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 hidden sm:table-cell whitespace-nowrap">MJ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {leaderboardData.map((player, idx) => {
              const isCurrentUser = currentUserId && player.user_id === currentUserId;
              const winRate = player.matches > 0 ? Math.round((player.wins / player.matches) * 100) : 0;
              const tierLabel = (player.points >= 500) ? 'Champion' : (player.points >= 300) ? 'Diamant' : (player.points >= 200) ? 'Or' : (player.points >= 100) ? 'Argent' : 'Bronze';
              const firstName = profilesFirstNameMap.get(player.user_id) || '';
              const lastName = profilesLastNameMap.get(player.user_id) || '';
              const nameParts = player.player_name ? player.player_name.trim().split(' ') : [];
              const finalFirstName = firstName || nameParts[0] || '';
              const finalLastName = lastName || nameParts.slice(1).join(' ');
              const rowClass = isCurrentUser ? 'bg-blue-100 border-b border-gray-300' : (idx === 0 ? 'bg-gray-50' : '');

              return (
                <tr key={player.user_id} className={rowClass}>
                  <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900 text-center border-l border-gray-200 first:border-l-0 w-14 sm:w-auto">
                    <RankBadge rank={player.rank} size="md" />
                  </td>
                  <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 border-l border-gray-200 first:border-l-0 min-w-[120px] sm:min-w-[150px]">
                    <div className="flex items-center gap-2 sm:gap-3 justify-start sm:justify-center">
                      {/* Photo de profil */}
                      {player.avatar_url ? (
                        <div className="relative w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 rounded-full overflow-hidden border border-gray-200">
                          <img
                            src={player.avatar_url}
                            alt={finalFirstName || 'Joueur'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="relative w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 rounded-full bg-slate-100 flex items-center justify-center border border-gray-200">
                          <User className="text-slate-400 w-2/3 h-2/3" />
                        </div>
                      )}
                      <span className="truncate block max-w-[80px] sm:max-w-[150px] md:max-w-none text-left">
                        <strong>{finalFirstName || 'Joueur'}</strong>
                        {finalLastName ? ' ' + finalLastName.charAt(0).toUpperCase() + '.' : ''}
                        {isCurrentUser ? <span className="hidden sm:inline"> (vous)</span> : ''}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center border-l border-gray-200 first:border-l-0 hidden sm:table-cell">
                    <TierBadge tier={tierLabel as "Bronze" | "Argent" | "Or" | "Diamant" | "Champion"} size="sm" />
                  </td>
                  <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center tabular-nums text-gray-900 border-l border-gray-200 first:border-l-0 font-semibold">{player.points}</td>
                  <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center tabular-nums border-l border-gray-200 first:border-l-0 font-semibold hidden md:table-cell" style={{ color: winRate >= 51 ? '#10B981' : winRate === 50 ? '#0066FF' : '#EF4444' }}>{winRate}%</td>
                  <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center tabular-nums border-l border-gray-200 first:border-l-0 font-semibold hidden sm:table-cell" style={{ color: "#10B981", backgroundColor: "#F0FDF4" }}>{player.wins}</td>
                  <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center tabular-nums border-l border-gray-200 first:border-l-0 font-semibold hidden sm:table-cell" style={{ color: "#EF4444", backgroundColor: "#FEF2F2" }}>{player.losses}</td>
                  <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center tabular-nums text-gray-700 border-l border-gray-200 first:border-l-0 font-semibold hidden sm:table-cell">{player.matches}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

