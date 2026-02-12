'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';
import { User } from 'lucide-react';
import { MapPin } from 'lucide-react';
import { Globe } from 'lucide-react';
import { Map as MapIcon } from 'lucide-react';
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
  avatar_url?: string | null;
  niveau_padel?: number;
}

interface LeaderboardContentProps {
  initialLeaderboard: LeaderboardEntry[];
  initialProfilesFirstNameMap: Record<string, string>;
  initialProfilesLastNameMap: Record<string, string>;
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
  const [profilesFirstNameMap, setProfilesFirstNameMap] = useState<Map<string, string>>(new Map(Object.entries(initialFirstNameMap)));
  const [profilesLastNameMap, setProfilesLastNameMap] = useState<Map<string, string>>(new Map(Object.entries(initialLastNameMap)));
  const [scope, setScope] = useState<'department' | 'region' | 'national'>('department');

  // Cache state: stores data for each scope
  const [cache, setCache] = useState<Record<string, {
    leaderboard: LeaderboardEntry[],
    firstNameMap: Map<string, string>,
    lastNameMap: Map<string, string>,
    timestamp: number
  }>>({
    department: {
      leaderboard: initialLeaderboard,
      firstNameMap: new Map(Object.entries(initialFirstNameMap)),
      lastNameMap: new Map(Object.entries(initialLastNameMap)),
      timestamp: Date.now()
    }
  });

  // Fonction pour recharger le classement depuis l'API
  const fetchLeaderboardForScope = useCallback(async (targetScope: string) => {
    try {
      console.log(`[LeaderboardContent] 🔄 Fetching for scope: ${targetScope}...`);

      const timestamp = Date.now();
      const response = await fetch(`/api/leaderboard?scope=${targetScope}&t=${timestamp}&_=${Math.random()}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      if (!response.ok) return null;

      const data = await response.json();

      if (data.leaderboard && Array.isArray(data.leaderboard)) {
        // Ajouter le rang
        const leaderboardWithRank = data.leaderboard.map((player: LeaderboardEntry, index: number) => ({
          ...player,
          rank: index + 1,
        }));

        // Extraire les noms
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

        return {
          leaderboard: leaderboardWithRank,
          firstNameMap,
          lastNameMap,
          timestamp: Date.now()
        };
      }
    } catch (error) {
      console.error(`[LeaderboardContent] ❌ Error fetching ${targetScope}:`, error);
    }
    return null;
  }, []);

  // Update view from cache or fetch if missing
  const updateViewFromScope = useCallback(async (targetScope: 'department' | 'region' | 'national') => {
    // 1. Try to load from cache first (Instant UI update)
    if (cache[targetScope]) {
      console.log(`[LeaderboardContent] ⚡️ Cache hit for ${targetScope}`);
      setLeaderboard(cache[targetScope].leaderboard);
      setProfilesFirstNameMap(cache[targetScope].firstNameMap);
      setProfilesLastNameMap(cache[targetScope].lastNameMap);

      // Optional: Refetch in background if cache is too old (> 1 min)
      if (Date.now() - cache[targetScope].timestamp > 60000) {
        console.log(`[LeaderboardContent] 🔄 Cache stale for ${targetScope}, refreshing in bg...`);
        const freshData = await fetchLeaderboardForScope(targetScope);
        if (freshData) {
          setCache(prev => ({ ...prev, [targetScope]: freshData }));
          // Only update view if user is still on this scope
          if (targetScope === scope) {
            setLeaderboard(freshData.leaderboard);
            setProfilesFirstNameMap(freshData.firstNameMap);
            setProfilesLastNameMap(freshData.lastNameMap);
          }
        }
      }
    } else {
      // 2. Not in cache, fetch immediately
      console.log(`[LeaderboardContent] 💨 Cache miss for ${targetScope}, fetching...`);
      const data = await fetchLeaderboardForScope(targetScope);
      if (data) {
        setCache(prev => ({ ...prev, [targetScope]: data }));
        setLeaderboard(data.leaderboard);
        setProfilesFirstNameMap(data.firstNameMap);
        setProfilesLastNameMap(data.lastNameMap);
      }
    }
  }, [cache, fetchLeaderboardForScope, scope]);

  // Effect: Prefetch other scopes on mount
  useEffect(() => {
    const scopesToPrefetch = ['department', 'region', 'national'].filter(s => s !== scope && !cache[s]);

    if (scopesToPrefetch.length > 0) {
      console.log('[LeaderboardContent] 🚀 Prefetching scopes:', scopesToPrefetch);
      Promise.all(scopesToPrefetch.map(s => fetchLeaderboardForScope(s))).then(results => {
        setCache(prev => {
          const newCache = { ...prev };
          results.forEach((data, index) => {
            if (data) newCache[scopesToPrefetch[index]] = data;
          });
          return newCache;
        });
      });
    }
  }, []); // Run once on mount

  // Effect: Update view when scope changes
  useEffect(() => {
    updateViewFromScope(scope);
  }, [scope, updateViewFromScope]);

  // Legacy reload function for real-time updates (matches etc)
  const reloadLegacy = useCallback(async () => {
    // Force refresh the current scope and update cache
    const data = await fetchLeaderboardForScope(scope);
    if (data) {
      setCache(prev => ({ ...prev, [scope]: data }));
      setLeaderboard(data.leaderboard);
      setProfilesFirstNameMap(data.firstNameMap);
      setProfilesLastNameMap(data.lastNameMap);
    }
  }, [fetchLeaderboardForScope, scope]);

  // Écouter l'événement de match enregistré + polling + storage events
  useEffect(() => {
    console.log('[LeaderboardContent] 🎬 Configuration des listeners...');

    let reloadTimeout: NodeJS.Timeout | null = null;

    const doReload = () => {
      console.log('[LeaderboardContent] 🔄 Rechargement du classement...');
      if (reloadTimeout) clearTimeout(reloadTimeout);

      // Attendre 2 secondes pour laisser le temps au match d'être sauvegardé en DB
      reloadTimeout = setTimeout(() => {
        console.log('[LeaderboardContent] ⏱️ Timeout terminé, rechargement...');
        reloadLegacy();
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
  }, [reloadLegacy, router]);

  const tierForPoints = (points: number) => {
    if (points >= 500) return 'Champion';
    if (points >= 300) return 'Diamant';
    if (points >= 200) return 'Or';
    if (points >= 100) return 'Argent';
    return 'Bronze';
  };

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Scope filter tabs */}
      <div className="flex items-center justify-center gap-2 px-2">
        {[
          { key: 'department' as const, label: 'Département', icon: MapPin },
          { key: 'region' as const, label: 'Région', icon: MapIcon },
          { key: 'national' as const, label: 'France', icon: Globe },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setScope(key); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${scope === key
              ? 'bg-blue-500/20 text-blue-300 border border-blue-400/40 shadow-lg shadow-blue-500/10'
              : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white/70'
              }`}
          >
            <Icon size={14} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      {leaderboard.length >= 5 && (
        <div className="mb-6 sm:mb-8">
          <div className="mb-3 sm:mb-4 flex items-center justify-center gap-2 sm:gap-3">
            <span className="h-px w-5 sm:w-8 md:w-10 bg-gray-300" />
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold text-white shadow-sm">
              Top joueurs du moment
            </span>
            <span className="h-px w-5 sm:w-8 md:w-10 bg-gray-300" />
          </div>
          <div className="flex items-end justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 mt-4 sm:mt-6">
            {(() => {
              const top3 = leaderboard.slice(0, 3);
              // Réorganiser : [2, 1, 3] pour avoir 2 à gauche, 1 au milieu, 3 à droite
              const reordered = [top3[1], top3[0], top3[2]];
              return reordered.map((player, displayIndex) => {
                // L'index réel dans le classement (0=1er, 1=2ème, 2=3ème)
                const realIndex = displayIndex === 0 ? 1 : displayIndex === 1 ? 0 : 2;
                const index = realIndex; // Utiliser realIndex pour les styles (medal, couleur, etc.)
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
                // Extraire prénom et nom de famille
                const firstName = profilesFirstNameMap.get(player.user_id) || '';
                const lastName = profilesLastNameMap.get(player.user_id) || '';
                const nameParts = player.player_name ? player.player_name.trim().split(' ') : [];
                const finalFirstName = firstName || nameParts[0] || '';
                const finalLastName = lastName || nameParts.slice(1).join(' ');
                const lastNameInitial = finalLastName ? finalLastName.charAt(0).toUpperCase() : '';

                // Taille différente pour le top 1 (au milieu)
                const sizeClass = index === 0
                  ? 'max-w-[120px] sm:max-w-[160px] md:max-w-[200px] lg:max-w-[240px]'
                  : 'max-w-[110px] sm:max-w-[140px] md:max-w-[180px] lg:max-w-[220px]';

                return (
                  <div key={player.user_id} className={(shineClass + ' ' + borderWidth + ' ' + borderColors[index] + ' rounded-2xl p-2.5 sm:p-3 md:p-4 lg:p-5 shadow-lg relative overflow-hidden flex-1 ' + sizeClass)} style={bgGradients[index]}>
                    <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 md:top-2 md:right-2 z-30">
                      <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl">{medalEmojis[index]}</span>
                    </div>
                    <div className="relative z-10 pt-3 sm:pt-4 md:pt-5">
                      {/* Photo de profil - taille différente pour le top 1 */}
                      <div className="flex justify-center mb-2 sm:mb-3">
                        {player.avatar_url ? (
                          <div className={`relative flex-shrink-0 rounded-full overflow-hidden border-2 border-white/80 shadow-lg ${index === 0
                            ? 'w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24'
                            : 'w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20'
                            }`}>
                            <img
                              src={player.avatar_url}
                              alt={finalFirstName || 'Joueur'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className={`relative flex-shrink-0 flex items-center justify-center bg-slate-200 rounded-full overflow-hidden shadow-lg ${index === 0
                            ? 'w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24'
                            : 'w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20'
                            }`}>
                            <User className="text-slate-400 w-2/3 h-2/3" />
                          </div>
                        )}
                      </div>

                      {/* Prénom + première lettre du nom de famille - taille différente pour le top 1 */}
                      <h3 className={`font-extrabold mb-2 sm:mb-3 md:mb-4 text-center text-gray-900 leading-tight line-clamp-2 ${index === 0
                        ? 'text-sm sm:text-base md:text-lg lg:text-xl'
                        : 'text-xs sm:text-sm md:text-base lg:text-lg'
                        }`}>
                        {finalFirstName || 'Joueur'}{lastNameInitial ? ' ' + lastNameInitial + '.' : ''}
                      </h3>
                    </div>
                  </div>
                );
              })
            })()}
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
          <div className="overflow-x-auto rounded-2xl border-2 sm:border-4 border-white/70 bg-white/5 backdrop-blur-sm shadow-xl scrollbar-hide">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-200">
                <tr>
                  <th className="px-1 sm:px-2 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 bg-gray-200 whitespace-nowrap w-12 sm:w-16">Rang</th>
                  <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 whitespace-nowrap min-w-[100px] sm:min-w-[180px]">Joueur</th>
                  <th className="px-1 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 whitespace-nowrap">Niveau</th>
                  <th className="px-1 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 whitespace-nowrap">Points</th>
                  <th className="px-1 sm:px-2 py-2 sm:py-3 md:py-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-900 border-l border-gray-200 first:border-l-0 whitespace-nowrap w-10 sm:w-14">Profil</th>
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
                  const canViewProfile = !player.isGuest && player.user_id !== currentUserId;
                  return (
                    <tr key={player.user_id} className={rowClass}>
                      <td className="px-1 sm:px-2 py-2 sm:py-3 text-center border-l border-gray-200 first:border-l-0 w-12 sm:w-16">
                        <RankBadge rank={player.rank} size="sm" className="w-6 h-6 sm:w-8 sm:h-8" />
                      </td>
                      <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-[10px] sm:text-sm text-gray-900 border-l border-gray-200 first:border-l-0 min-w-[100px] sm:min-w-[180px]">
                        <div className="flex items-center gap-1.5 sm:gap-3">
                          {/* Photo de profil */}
                          {player.avatar_url ? (
                            <div className="relative w-7 h-7 sm:w-10 sm:h-10 flex-shrink-0 rounded-full overflow-hidden border border-gray-200">
                              <img
                                src={player.avatar_url}
                                alt={finalFirstName || 'Joueur'}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="relative w-7 h-7 sm:w-10 sm:h-10 flex-shrink-0 rounded-full bg-slate-100 flex items-center justify-center border border-gray-200">
                              <User className="text-slate-400 w-2/3 h-2/3" />
                            </div>
                          )}
                          {/* Nom du joueur */}
                          <div className="flex-1 min-w-0">
                            <span className="truncate block">
                              <strong>{finalFirstName || 'Joueur'}</strong>
                              {finalLastName ? ' ' + finalLastName.charAt(0).toUpperCase() + '.' : ''}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-1 sm:px-3 md:px-4 py-2 sm:py-3 text-center border-l border-gray-200 first:border-l-0">
                        {player.niveau_padel ? (
                          <div className="inline-flex items-center justify-center px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs sm:text-sm font-bold min-w-[44px]">
                            {player.niveau_padel.toFixed(2)}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-1 sm:px-3 md:px-4 py-2 sm:py-3 text-[10px] sm:text-sm text-center tabular-nums text-gray-900 border-l border-gray-200 first:border-l-0 font-semibold">{player.points}</td>
                      <td className="px-1 sm:px-2 py-2 sm:py-3 text-center border-l border-gray-200 first:border-l-0 w-10 sm:w-14">
                        {canViewProfile && (
                          <button
                            type="button"
                            onClick={() => router.push(`/players/${player.user_id}?from=leaderboard`)}
                            className="p-1 sm:p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors inline-flex items-center justify-center"
                            title="Voir le profil"
                          >
                            <Eye size={14} />
                          </button>
                        )}
                      </td>
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
