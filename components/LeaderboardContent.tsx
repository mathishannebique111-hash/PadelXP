'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import RankBadge from './RankBadge';
import TierBadge from './TierBadge';
import { logger } from '@/lib/logger';

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  player_name: string;
  points: number;
  wins: number;
  losses: number;
  matches: number;
  isGuest: boolean;
}

interface LeaderboardContentProps {
  initialLeaderboard: LeaderboardEntry[];
  initialProfilesFirstNameMap: Map<string, string>;
  initialProfilesLastNameMap: Map<string, string>;
  currentUserId?: string;
}

/**
 * Composant client qui affiche le classement global et les top joueurs
 * et se met à jour automatiquement après l'enregistrement d'un match
 */
export default function LeaderboardContent({
  initialLeaderboard,
  initialProfilesFirstNameMap: initialFirstNameMap,
  initialProfilesLastNameMap: initialLastNameMap,
  currentUserId,
}: LeaderboardContentProps) {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(initialLeaderboard);
  const [profilesFirstNameMap, setProfilesFirstNameMap] = useState<Map<string, string>>(initialFirstNameMap);
  const [profilesLastNameMap, setProfilesLastNameMap] = useState<Map<string, string>>(initialLastNameMap);

  // Fonction pour recharger le classement depuis l'API
  const reloadLeaderboard = useCallback(async () => {
    try {
      console.log('[LeaderboardContent] 🔄 Rechargement du classement...');
      
      // Utiliser un timestamp unique pour éviter tout cache
      const timestamp = Date.now();
      const response = await fetch(`/api/leaderboard?t=${timestamp}&_=${Math.random()}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      if (!response.ok) {
        console.error('[LeaderboardContent] ❌ Erreur API:', response.status, response.statusText);
        return;
      }

      const data = await response.json();
      console.log('[LeaderboardContent] 📊 Réponse API:', { 
        hasLeaderboard: !!data.leaderboard, 
        count: data.leaderboard?.length || 0,
        sample: data.leaderboard?.[0] ? {
          user_id: data.leaderboard[0].user_id.substring(0, 8),
          points: data.leaderboard[0].points,
          wins: data.leaderboard[0].wins,
          losses: data.leaderboard[0].losses,
          matches: data.leaderboard[0].matches
        } : null
      });
      
      if (data.leaderboard && Array.isArray(data.leaderboard)) {
        console.log('[LeaderboardContent] ✅ Données reçues:', data.leaderboard.length, 'joueurs');
        
        // Ajouter le rang à chaque joueur
        const leaderboardWithRank = data.leaderboard.map((player: LeaderboardEntry, index: number) => ({
          ...player,
          rank: index + 1,
        }));

        // Extraire les noms depuis player_name
        const firstNameMap = new Map<string, string>();
        const lastNameMap = new Map<string, string>();
        
        leaderboardWithRank.forEach((player: LeaderboardEntry) => {
          if (player.player_name) {
            const nameParts = player.player_name.trim().split(' ');
            if (nameParts.length > 0) {
              firstNameMap.set(player.user_id, nameParts[0]);
              if (nameParts.length > 1) {
                lastNameMap.set(player.user_id, nameParts.slice(1).join(' '));
              }
            }
          }
        });
        
        // Forcer la mise à jour avec un nouveau tableau pour garantir le re-render
        console.log('[LeaderboardContent] 🔄 Mise à jour de l\'état React...');
        setLeaderboard([...leaderboardWithRank]);
        setProfilesFirstNameMap(new Map(firstNameMap));
        setProfilesLastNameMap(new Map(lastNameMap));
        
        console.log('[LeaderboardContent] ✅ Classement mis à jour ! Points du premier joueur:', leaderboardWithRank[0]?.points);
      } else {
        console.warn('[LeaderboardContent] ⚠️ Données invalides:', data);
      }
    } catch (error) {
      console.error('[LeaderboardContent] ❌ Erreur:', error);
    }
  }, []);

  // Écouter l'événement de match enregistré + polling + storage events
  useEffect(() => {
    console.log('[LeaderboardContent] 🎬 Configuration des listeners...');
    
    let reloadTimeout: NodeJS.Timeout | null = null;
    
    const doReload = () => {
      console.log('[LeaderboardContent] 🔄 Rechargement du classement...');
      // Annuler le timeout précédent si existe
      if (reloadTimeout) {
        clearTimeout(reloadTimeout);
      }
      
      // Attendre 2 secondes pour laisser le temps au match d'être sauvegardé en DB
      reloadTimeout = setTimeout(() => {
        console.log('[LeaderboardContent] ⏱️ Timeout terminé, rechargement...');
        reloadLeaderboard();
        // Forcer aussi le rechargement serveur Next.js (backup)
        router.refresh();
      }, 2000);
    };
    
    const handleMatchSubmitted = () => {
      console.log('[LeaderboardContent] 🎉 Match enregistré détecté (event) !');
      doReload();
    };
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'matchSubmitted' && e.newValue === 'true') {
        console.log('[LeaderboardContent] 🎉 Match enregistré détecté (storage cross-tab) !');
        doReload();
      }
    };

    // Écouter l'événement custom (même page)
    window.addEventListener('matchSubmitted', handleMatchSubmitted);
    // Écouter les événements storage (cross-tab)
    window.addEventListener('storage', handleStorageChange);
    
    // Vérifier au montage si un match vient d'être enregistré
    const checkForRecentMatch = () => {
      const lastMatchTime = localStorage.getItem('lastMatchTime');
      if (lastMatchTime) {
        const timeSinceMatch = Date.now() - parseInt(lastMatchTime, 10);
        if (timeSinceMatch < 30000) { // Dans les 30 dernières secondes
          console.log('[LeaderboardContent] 🎉 Match récent détecté, rechargement...');
          doReload();
          localStorage.removeItem('lastMatchTime');
        }
      }
    };
    
    checkForRecentMatch();
    
    // Vérifier aussi quand la fenêtre reprend le focus (si on revient de la page Matchs)
    const handleFocus = () => {
      console.log('[LeaderboardContent] 👁️ Fenêtre reprend le focus, vérification match récent...');
      checkForRecentMatch();
    };
    window.addEventListener('focus', handleFocus);
    
    // Polling de secours : vérifier toutes les 2 secondes si un match a été enregistré
    const pollingInterval = setInterval(() => {
      const lastMatchTime = localStorage.getItem('lastMatchTime');
      if (lastMatchTime) {
        const timeSinceMatch = Date.now() - parseInt(lastMatchTime, 10);
        if (timeSinceMatch < 30000) { // Dans les 30 dernières secondes
          console.log('[LeaderboardContent] 🔄 Polling détecte un match récent, rechargement...');
          doReload();
          localStorage.removeItem('lastMatchTime');
        }
      }
    }, 2000);
    
    console.log('[LeaderboardContent] ✅ Listeners configurés');

    return () => {
      console.log('[LeaderboardContent] 🧹 Nettoyage des listeners');
      window.removeEventListener('matchSubmitted', handleMatchSubmitted);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
      if (reloadTimeout) {
        clearTimeout(reloadTimeout);
      }
      clearInterval(pollingInterval);
    };
  }, [reloadLeaderboard, router]);

  const tierForPoints = (points: number) => {
    if (points >= 500) return 'Champion';
    if (points >= 300) return 'Diamant';
    if (points >= 200) return 'Or';
    if (points >= 100) return 'Argent';
    return 'Bronze';
  };

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {leaderboard.length >= 3 && (
        <div className="mb-6 sm:mb-8">
          <div className="mb-3 sm:mb-4 flex items-center justify-center gap-2 sm:gap-3">
            <span className="h-px w-5 sm:w-8 md:w-10 bg-gray-300" />
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold text-white shadow-sm">
              Top joueurs du moment
            </span>
            <span className="h-px w-5 sm:w-8 md:w-10 bg-gray-300" />
          </div>
          <div className="flex items-end justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 mt-4 sm:mt-6">
            {leaderboard.slice(0, 3).map((player, index) => {
              const medalEmojis = ['🥇', '🥈', '🥉'];
              const borderColors = [
                'border-yellow-500/80',
                'border-slate-400/80',
                'border-orange-600/80'
              ];
              const borderWidth = 'border-2 sm:border-2 md:border-2';
              const shineClass = index === 0 ? 'podium-gold' : index === 1 ? 'podium-silver' : 'podium-bronze';
              const bgGradients = [
                { background: 'linear-gradient(to bottom, #ffffff, #ffe8a1, #ffdd44)', boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(255, 215, 0, 0.35), inset 0 2px 4px rgba(255,255,255,0.6)' },
                { background: 'linear-gradient(to bottom, #ffffff, #d8d8d8, #b8b8b8)', boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(192, 192, 192, 0.32), inset 0 2px 4px rgba(255,255,255,0.5)' },
                { background: 'linear-gradient(to bottom, #ffffff, #ffd8b3, #ffc085)', boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(205, 127, 50, 0.32), inset 0 2px 4px rgba(255,255,255,0.5)' }
              ];
              return (
                <div key={player.user_id} className={(shineClass + ' ' + borderWidth + ' ' + borderColors[index] + ' rounded-xl sm:rounded-xl md:rounded-2xl p-2.5 sm:p-3 md:p-4 lg:p-5 shadow-lg relative overflow-hidden flex-1 max-w-[110px] sm:max-w-[140px] md:max-w-[180px] lg:max-w-[220px]')} style={bgGradients[index]}>
                  <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 md:top-2 md:right-2 z-30">
                    <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl">{medalEmojis[index]}</span>
                  </div>
                  <div className="relative z-10 pt-3 sm:pt-4 md:pt-5">
                    <h3 className="font-extrabold mb-2 sm:mb-3 md:mb-4 text-center text-gray-900 text-xs sm:text-sm md:text-base lg:text-lg leading-tight line-clamp-2">
                      {index === 2 ? (() => {
                        const parts = (player.player_name || '').split(' ');
                        const f = parts[0] || '';
                        const l = parts.slice(1).join(' ');
                        return (<span><span className="text-xs sm:text-sm md:text-base lg:text-lg">{f}</span>{l ? ' ' + l : ''}</span>);
                      })() : player.player_name}
                    </h3>
                    <div className="flex items-center justify-center">
                      <div className={"inline-flex items-center gap-1 sm:gap-1.5 md:gap-2 rounded-full px-2 sm:px-2.5 md:px-3 lg:px-4 py-1 sm:py-1.5 md:py-2 bg-white/95 backdrop-blur border shadow-md " + (index === 0 ? 'border-yellow-500 ring-1 ring-yellow-300' : index === 1 ? 'border-zinc-500 ring-1 ring-zinc-300' : 'border-orange-500 ring-1 ring-orange-300')}>
                        <span className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-900 tabular-nums">{player.points.toLocaleString()}</span>
                        <span className="text-[9px] sm:text-[10px] md:text-xs font-normal text-gray-900 uppercase tracking-wider">pts</span>
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
          <div className="overflow-x-auto rounded-lg sm:rounded-xl md:rounded-2xl border-2 sm:border-4 border-white/70 bg-white/5 backdrop-blur-sm shadow-xl scrollbar-hide">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 bg-gray-100 whitespace-nowrap">Rang</th>
                  <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 whitespace-nowrap">Joueur</th>
                  <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 hidden sm:table-cell whitespace-nowrap">Niveau</th>
                  <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 whitespace-nowrap">Points</th>
                  <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 hidden md:table-cell whitespace-nowrap">Winrate</th>
                  <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider border-l border-gray-200 first:border-l-0 whitespace-nowrap" style={{ color: "#10B981", backgroundColor: "#F0FDF4" }}>V</th>
                  <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider border-l border-gray-200 first:border-l-0 whitespace-nowrap" style={{ color: "#EF4444", backgroundColor: "#FEF2F2" }}>D</th>
                  <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 hidden sm:table-cell whitespace-nowrap">MJ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {leaderboard.map((player, idx) => {
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
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900 text-center border-l border-gray-200 first:border-l-0">
                        <RankBadge rank={player.rank} size="md" />
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 text-center border-l border-gray-200 first:border-l-0">
                        <span className="truncate block max-w-[100px] sm:max-w-[150px] md:max-w-none">
                          <strong>{finalFirstName || 'Joueur'}</strong>
                          {finalLastName ? ' ' + finalLastName.charAt(0).toUpperCase() + '.' : ''}
                          {isCurrentUser ? <span className="hidden sm:inline"> (vous)</span> : ''}
                        </span>
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center border-l border-gray-200 first:border-l-0 hidden sm:table-cell">
                        <TierBadge tier={tierLabel as "Bronze" | "Argent" | "Or" | "Diamant" | "Champion"} size="sm" />
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center tabular-nums text-gray-900 border-l border-gray-200 first:border-l-0 font-semibold">{player.points}</td>
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center tabular-nums border-l border-gray-200 first:border-l-0 font-semibold hidden md:table-cell" style={{ color: winRate >= 51 ? '#10B981' : winRate === 50 ? '#0066FF' : '#EF4444' }}>{winRate}%</td>
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
