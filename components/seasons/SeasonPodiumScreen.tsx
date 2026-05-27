'use client';

import { useState, useEffect } from 'react';
import { Trophy, Gift, ArrowRight, X } from 'lucide-react';
import { User } from 'lucide-react';

interface PodiumPlayer {
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

interface PodiumReward {
  rank: number;
  reward_label: string;
  reward_image_url?: string | null;
}

interface SeasonPodiumScreenProps {
  seasonName: string;
  results: PodiumPlayer[];
  rewards: PodiumReward[];
  onClose: () => void;
  onViewNewSeason?: () => void;
}

const medalEmojis = ['🥇', '🥈', '🥉'];

const podiumGradients = [
  'linear-gradient(to bottom, #fffdf5, #ffe8a1, #ffd700)',
  'linear-gradient(to bottom, #f8f8f8, #d8d8d8, #b8b8b8)',
  'linear-gradient(to bottom, #fff5eb, #ffd8b3, #cd7f32)',
];

const podiumBorders = [
  'border-yellow-400/60',
  'border-slate-400/60',
  'border-orange-500/60',
];

const podiumShadows = [
  '0 0 40px rgba(255,215,0,0.3)',
  '0 0 20px rgba(192,192,192,0.2)',
  '0 0 20px rgba(205,127,50,0.2)',
];

export default function SeasonPodiumScreen({
  seasonName,
  results,
  rewards,
  onClose,
  onViewNewSeason,
}: SeasonPodiumScreenProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const top3 = results.slice(0, 3);
  // Display order: [2nd, 1st, 3rd]
  const displayOrder = top3.length >= 3
    ? [top3[1], top3[0], top3[2]]
    : top3;

  const getPlayerName = (player: PodiumPlayer) => {
    if (!player.profiles) return 'Joueur';
    const first = player.profiles.first_name || '';
    const lastInitial = player.profiles.last_name ? player.profiles.last_name.charAt(0).toUpperCase() + '.' : '';
    return `${first} ${lastInitial}`.trim() || player.profiles.display_name || 'Joueur';
  };

  const getRewardForRank = (rank: number) => rewards.find(r => r.rank === rank);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
      >
        <X className="w-5 h-5 text-white/60" />
      </button>

      {/* Content */}
      <div className="relative z-10 w-full max-w-lg px-4 text-center">
        {/* Title */}
        <div
          className={`mb-8 transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
        >
          <Trophy className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h2 className="text-2xl font-extrabold text-white mb-1">Fin de saison !</h2>
          <p className="text-sm text-white/50">{seasonName}</p>
        </div>

        {/* Podium */}
        <div className="flex items-end justify-center gap-3 mb-8">
          {displayOrder.map((player, displayIdx) => {
            const realRank = player.final_rank;
            const rankIdx = realRank - 1;
            const reward = getRewardForRank(realRank);
            const isFirst = realRank === 1;

            const height = isFirst ? 'h-52' : 'h-40';
            const delay = displayIdx === 1 ? '200ms' : displayIdx === 0 ? '400ms' : '600ms';

            return (
              <div
                key={player.final_rank}
                className={`flex flex-col items-center transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: delay }}
              >
                {/* Player card */}
                <div
                  className={`${height} w-28 sm:w-32 rounded-2xl border-2 ${podiumBorders[rankIdx]} p-3 flex flex-col items-center justify-center relative overflow-hidden`}
                  style={{
                    background: podiumGradients[rankIdx],
                    boxShadow: podiumShadows[rankIdx],
                  }}
                >
                  <span className="text-2xl mb-1">{medalEmojis[rankIdx]}</span>

                  {/* Avatar */}
                  {player.profiles?.avatar_url ? (
                    <div className={`rounded-full overflow-hidden border-2 border-white/80 shadow-md mb-2 ${isFirst ? 'w-14 h-14' : 'w-11 h-11'}`}>
                      <img
                        src={player.profiles.avatar_url}
                        alt={getPlayerName(player)}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className={`rounded-full bg-slate-200 flex items-center justify-center border-2 border-white/80 shadow-md mb-2 ${isFirst ? 'w-14 h-14' : 'w-11 h-11'}`}>
                      <User className="text-slate-400 w-2/3 h-2/3" />
                    </div>
                  )}

                  <p className={`font-extrabold text-gray-900 text-center leading-tight line-clamp-2 ${isFirst ? 'text-sm' : 'text-xs'}`}>
                    {getPlayerName(player)}
                  </p>
                  <p className="text-[10px] text-gray-600 font-bold mt-0.5">{player.final_points} pts</p>
                </div>

                {/* Reward below card */}
                {reward && (
                  <div className="mt-2 flex items-center gap-1 rounded-full bg-white/10 border border-white/15 px-2.5 py-1">
                    <Gift className="w-3 h-3 text-amber-400" />
                    <span className="text-[9px] font-semibold text-white/70 line-clamp-1 max-w-[80px]">
                      {reward.reward_label}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div
          className={`space-y-3 transition-all duration-700 delay-[800ms] ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          {onViewNewSeason && (
            <button
              onClick={onViewNewSeason}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-black hover:bg-amber-400 transition-colors"
            >
              Voir la nouvelle saison
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-white/10 border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
