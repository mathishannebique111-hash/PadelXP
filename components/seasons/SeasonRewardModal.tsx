'use client';

import { X, Gift, Target } from 'lucide-react';
import type { SeasonReward } from './SeasonBanner';

const medalEmojis = ['🥇', '🥈', '🥉'];
const rankLabels = ['1er', '2e', '3e'];

interface SeasonRewardModalProps {
  reward: SeasonReward;
  currentUserRank?: number;
  clubName?: string;
  onClose: () => void;
}

export default function SeasonRewardModal({
  reward,
  currentUserRank,
  clubName,
  onClose,
}: SeasonRewardModalProps) {
  const rankDiff = currentUserRank ? currentUserRank - reward.rank : null;
  const isOnPodium = currentUserRank && currentUserRank <= reward.rank;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-sm rounded-3xl border border-white/15 bg-gradient-to-b from-[#1a1a2e] to-[#0d0d1a] p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="w-4 h-4 text-white/60" />
        </button>

        {/* Medal & rank */}
        <div className="text-center mb-5">
          <span className="text-5xl">{medalEmojis[reward.rank - 1]}</span>
          <h3 className="mt-3 text-lg font-extrabold text-white">
            Recompense {rankLabels[reward.rank - 1]}
          </h3>
        </div>

        {/* Reward image */}
        {reward.reward_image_url && (
          <div className="mb-5 rounded-2xl overflow-hidden border border-white/10 bg-white/5">
            <img
              src={reward.reward_image_url}
              alt={reward.reward_label}
              className="w-full h-48 object-cover"
            />
          </div>
        )}

        {/* Reward label */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 border border-amber-400/30 px-4 py-2">
            <Gift className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-amber-200">{reward.reward_label}</span>
          </div>
        </div>

        {/* Description */}
        {reward.reward_description && (
          <p className="text-sm text-white/60 text-center leading-relaxed mb-4">
            {reward.reward_description}
          </p>
        )}

        {/* Club info */}
        {clubName && (
          <p className="text-xs text-white/40 text-center mb-4">
            Offert par <span className="text-white/60 font-semibold">{clubName}</span>
          </p>
        )}

        {/* Rank status */}
        {currentUserRank && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Target className="w-3.5 h-3.5 text-white/50" />
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                Ta position
              </span>
            </div>
            {isOnPodium ? (
              <p className="text-sm font-bold text-emerald-400">
                Tu es {currentUserRank === 1 ? '1er' : `${currentUserRank}e`} — cette recompense est a toi !
              </p>
            ) : rankDiff !== null ? (
              <p className="text-sm text-white/70">
                Tu es <span className="font-bold text-white">{currentUserRank}e</span>
                {' '}&mdash;{' '}
                <span className="text-amber-400 font-semibold">
                  encore {rankDiff} place{rankDiff > 1 ? 's' : ''} a gagner
                </span>
              </p>
            ) : null}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-white/10 border border-white/15 py-3 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
