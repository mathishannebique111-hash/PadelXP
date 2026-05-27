'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, Crown, Trophy, User } from 'lucide-react';

interface SeasonResult {
  id: string;
  user_id: string;
  final_rank: number;
  final_points: number;
  wins: number;
  losses: number;
  matches_played: number;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface PastSeason {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  season_rewards: Array<{
    rank: number;
    reward_label: string;
  }>;
  results?: SeasonResult[];
}

interface SeasonHistoryTabProps {
  currentUserId?: string;
}

const medalEmojis = ['🥇', '🥈', '🥉'];

export default function SeasonHistoryTab({ currentUserId }: SeasonHistoryTabProps) {
  const [seasons, setSeasons] = useState<PastSeason[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadSeasons = useCallback(async () => {
    try {
      const res = await fetch('/api/seasons', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const completed = (data.seasons || []).filter((s: any) => s.status === 'completed');
      setSeasons(completed);
    } catch {
      // Silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadSeasons(); }, [loadSeasons]);

  const toggleExpand = async (seasonId: string) => {
    if (expandedId === seasonId) {
      setExpandedId(null);
      return;
    }

    // Load results if not loaded
    const season = seasons.find(s => s.id === seasonId);
    if (season && !season.results) {
      try {
        const res = await fetch(`/api/seasons/${seasonId}/results`);
        if (res.ok) {
          const data = await res.json();
          setSeasons(prev => prev.map(s =>
            s.id === seasonId ? { ...s, results: data.results || [] } : s
          ));
        }
      } catch {
        // Silent
      }
    }
    setExpandedId(seasonId);
  };

  if (isLoading) {
    return <div className="py-8 text-center text-white/40 text-sm">Chargement...</div>;
  }

  if (seasons.length === 0) {
    return (
      <div className="py-8 text-center">
        <Trophy className="w-8 h-8 text-white/20 mx-auto mb-3" />
        <p className="text-sm text-white/40">Aucune saison terminee</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {seasons.map(season => {
        const isExpanded = expandedId === season.id;
        const myResult = season.results?.find(r => r.user_id === currentUserId);

        return (
          <div key={season.id} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
            <button
              onClick={() => toggleExpand(season.id)}
              className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-white/5 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center flex-shrink-0">
                  <Crown className="w-4 h-4 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-white text-sm truncate">{season.name}</h3>
                  <p className="text-[10px] text-white/40">
                    {new Date(season.start_date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                    {' - '}
                    {new Date(season.end_date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {myResult && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    myResult.final_rank <= 3
                      ? 'bg-amber-400/15 text-amber-300'
                      : 'bg-white/10 text-white/60'
                  }`}>
                    {myResult.final_rank <= 3 ? medalEmojis[myResult.final_rank - 1] : `#${myResult.final_rank}`}
                  </span>
                )}
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-white/30" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-white/30" />
                )}
              </div>
            </button>

            {isExpanded && season.results && (
              <div className="border-t border-white/10 p-3 sm:p-4">
                <div className="space-y-1">
                  {season.results.slice(0, 10).map(result => {
                    const isMe = result.user_id === currentUserId;
                    const name = result.profiles
                      ? `${result.profiles.first_name || ''} ${result.profiles.last_name ? result.profiles.last_name.charAt(0) + '.' : ''}`.trim()
                      : 'Joueur';

                    return (
                      <div
                        key={result.id}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 ${isMe ? 'bg-blue-500/10 border border-blue-400/20' : ''}`}
                      >
                        <div className="w-6 text-center flex-shrink-0">
                          {result.final_rank <= 3 ? (
                            <span className="text-sm">{medalEmojis[result.final_rank - 1]}</span>
                          ) : (
                            <span className="text-xs text-white/40 font-medium">{result.final_rank}</span>
                          )}
                        </div>

                        {result.profiles?.avatar_url ? (
                          <div className="w-7 h-7 rounded-full overflow-hidden border border-white/20 flex-shrink-0">
                            <img src={result.profiles.avatar_url} alt={name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                            <User className="w-3.5 h-3.5 text-white/30" />
                          </div>
                        )}

                        <span className={`text-sm flex-1 min-w-0 truncate ${isMe ? 'font-bold text-white' : 'text-white/80'}`}>
                          {name}
                        </span>
                        <span className="text-sm font-bold text-white/90 tabular-nums flex-shrink-0">
                          {result.final_points} pts
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
