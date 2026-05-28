'use client';

import { useState, useEffect, useMemo } from 'react';
import { Trophy, Gift, Clock, ChevronRight } from 'lucide-react';
import SeasonRewardModal from './SeasonRewardModal';

export interface SeasonReward {
  id: string;
  rank: number;
  reward_label: string;
  reward_description?: string | null;
  reward_image_url?: string | null;
}

export interface SeasonData {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'upcoming' | 'active' | 'completed';
  countries: string[];
  season_rewards: SeasonReward[];
}

interface SeasonBannerProps {
  season: SeasonData;
  currentUserRank?: number;
  clubName?: string;
}

function useCountdown(endDate: string) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const end = new Date(endDate + 'T23:59:59');
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return { label: 'Terminee', urgent: true };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days <= 0 && hours <= 48) {
    return { label: `${hours}h`, urgent: true };
  }

  return { label: `J-${days}`, urgent: days <= 3 };
}

function useProgress(startDate: string, endDate: string) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate + 'T23:59:59').getTime();
  const now = Date.now();

  const total = end - start;
  if (total <= 0) return 100;

  const elapsed = now - start;
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

const medalEmojis = ['🥇', '🥈', '🥉'];

export default function SeasonBanner({ season, currentUserRank, clubName }: SeasonBannerProps) {
  const [selectedReward, setSelectedReward] = useState<SeasonReward | null>(null);
  const countdown = useCountdown(season.end_date);
  const progress = useProgress(season.start_date, season.end_date);

  const sortedRewards = useMemo(
    () => [...(season.season_rewards || [])].sort((a, b) => a.rank - b.rank),
    [season.season_rewards]
  );

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-amber-500/10 via-white/5 to-purple-500/10 backdrop-blur-sm p-4 sm:p-5 mb-4 sm:mb-6">
        {/* Subtle shine effect */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute -top-1/2 -left-1/2 w-full h-full opacity-[0.07]"
            style={{
              background: 'radial-gradient(circle at center, rgba(255,215,0,0.8), transparent 70%)',
            }}
          />
        </div>

        <div className="relative z-10">
          {/* Header: Season name + countdown */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                {season.name}
              </h3>
            </div>
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                countdown.urgent
                  ? 'bg-red-500/20 text-red-300 border border-red-400/30'
                  : 'bg-white/10 text-white/80 border border-white/15'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>{countdown.label}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, rgba(251,191,36,0.8), rgba(245,158,11,0.9), rgba(217,119,6,1))',
                  boxShadow: '0 0 12px rgba(251,191,36,0.4)',
                }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-white/40 font-medium">
                {new Date(season.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              </span>
              <span className="text-[10px] text-white/40 font-medium">
                {new Date(season.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              </span>
            </div>
          </div>

          {/* Rewards preview */}
          {sortedRewards.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 mb-2">
                <Gift className="w-3.5 h-3.5 text-amber-400/80" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                  A gagner
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {sortedRewards.map((reward) => (
                  <button
                    key={reward.id}
                    onClick={() => setSelectedReward(reward)}
                    className="group relative flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-2.5 sm:p-3 transition-all hover:bg-white/10 hover:border-white/20 active:scale-[0.97]"
                  >
                    {reward.reward_image_url ? (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-white/10">
                        <img
                          src={reward.reward_image_url}
                          alt={reward.reward_label}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <span className="text-xl sm:text-2xl">{medalEmojis[reward.rank - 1]}</span>
                    )}
                    <span className="text-[9px] sm:text-[10px] font-semibold text-white/70 text-center line-clamp-2 leading-tight">
                      {reward.reward_label}
                    </span>
                    <ChevronRight className="absolute top-1.5 right-1.5 w-3 h-3 text-white/20 group-hover:text-white/40 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Current user rank hint */}
          {currentUserRank && currentUserRank <= 5 && (
            <div className="mt-3 pt-3 border-t border-white/10 text-center">
              <span className="text-xs text-white/60">
                Tu es actuellement{' '}
                <span className={`font-bold ${currentUserRank <= 3 ? 'text-amber-400' : 'text-white'}`}>
                  {currentUserRank === 1 ? '1er' : `${currentUserRank}e`}
                </span>
                {currentUserRank <= 3 ? ' — dans le top !' : ` — encore ${currentUserRank - 3} place${currentUserRank - 3 > 1 ? 's' : ''} !`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Reward detail modal */}
      {selectedReward && (
        <SeasonRewardModal
          reward={selectedReward}
          currentUserRank={currentUserRank}
          clubName={clubName}
          onClose={() => setSelectedReward(null)}
        />
      )}
    </>
  );
}
