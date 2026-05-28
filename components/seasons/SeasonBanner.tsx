'use client';

import { useState, useEffect, useMemo } from 'react';
import { Trophy, Gift, Clock, ChevronRight, X } from 'lucide-react';

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
  userCountry?: 'FR' | 'BE';
}

function useCountdown(endDate: string) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const end = new Date(endDate + 'T23:59:59');
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return { label: 'Terminée', urgent: true };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days <= 0) return { label: `${hours}h`, urgent: true };
  if (days <= 2) return { label: `${days}j ${hours}h`, urgent: true };

  return { label: `J-${days}`, urgent: days <= 3 };
}

function useProgress(startDate: string, endDate: string) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate + 'T23:59:59').getTime();
  const now = Date.now();
  const total = end - start;
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, ((now - start) / total) * 100));
}

const medalEmojis = ['🥇', '🥈', '🥉'];
const countryLabels: Record<string, string> = { FR: 'français', BE: 'belge' };

export default function SeasonBanner({ season, currentUserRank, userCountry = 'FR' }: SeasonBannerProps) {
  const [showDetail, setShowDetail] = useState(false);
  const countdown = useCountdown(season.end_date);
  const progress = useProgress(season.start_date, season.end_date);

  const sortedRewards = useMemo(
    () => [...(season.season_rewards || [])].sort((a, b) => a.rank - b.rank),
    [season.season_rewards]
  );

  const totalDays = Math.ceil(
    (new Date(season.end_date + 'T23:59:59').getTime() - new Date(season.start_date).getTime()) / (1000 * 60 * 60 * 24)
  );

  const countryLabel = countryLabels[userCountry] || userCountry;

  // Hide bottom nav when modal is open
  useEffect(() => {
    const nav = document.getElementById('bottom-nav-bar');
    if (!nav) return;
    if (showDetail) {
      nav.style.display = 'none';
    } else {
      nav.style.display = '';
    }
    return () => { nav.style.display = ''; };
  }, [showDetail]);

  return (
    <>
      {/* Compact banner — clickable */}
      <button
        onClick={() => setShowDetail(true)}
        className="relative w-full overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-amber-500/10 via-white/5 to-purple-500/10 backdrop-blur-sm p-3.5 sm:p-4 mb-4 sm:mb-6 text-left transition-all active:scale-[0.99]"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full opacity-[0.06]" style={{ background: 'radial-gradient(circle at center, rgba(255,215,0,0.8), transparent 70%)' }} />
        </div>

        <div className="relative z-10">
          {/* Row 1: title + countdown */}
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Trophy className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-extrabold text-white truncate">{season.name}</span>
            </div>
            <div className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold flex-shrink-0 ${
              countdown.urgent ? 'bg-red-500/20 text-red-300 border border-red-400/30' : 'bg-white/10 text-white/70 border border-white/15'
            }`}>
              <Clock className="w-2.5 h-2.5" />
              {countdown.label}
            </div>
          </div>

          {/* Row 2: progress bar */}
          <div className="mb-2.5">
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full" style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, rgba(251,191,36,0.8), rgba(245,158,11,0.9), rgba(217,119,6,1))',
                boxShadow: '0 0 8px rgba(251,191,36,0.3)',
              }} />
            </div>
          </div>

          {/* Row 3: rewards CTA + rank */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-400/25 px-2.5 py-1">
              <Gift className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] sm:text-xs font-bold text-amber-300">
                {sortedRewards.length} récompense{sortedRewards.length > 1 ? 's' : ''} à gagner
              </span>
              <ChevronRight className="w-3 h-3 text-amber-400/50" />
            </div>
            {currentUserRank && (
              <span className="text-[10px] sm:text-xs text-white/60">
                {currentUserRank <= 3 ? (
                  <span className="text-amber-400 font-bold">{medalEmojis[currentUserRank - 1]} Top {countryLabel}</span>
                ) : (
                  <>
                    <span className="font-bold text-white">{currentUserRank}e</span> {countryLabel}
                  </>
                )}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Detail modal — rules + rewards */}
      {showDetail && (
        <div className="fixed inset-0 z-[999999] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDetail(false)} />

          <div className="relative w-full max-w-md sm:rounded-3xl rounded-t-3xl border border-white/15 bg-gradient-to-b from-[#1a1a2e] to-[#0d0d1a] p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowDetail(false)} className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10">
              <X className="w-4 h-4 text-white/60" />
            </button>

            {/* Header */}
            <div className="text-center mb-5">
              <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <h2 className="text-lg font-extrabold text-white">{season.name}</h2>
              <p className="text-xs text-white/40 mt-1">
                {new Date(season.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
                {' — '}
                {new Date(season.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Rules */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Comment ça marche</h3>
              <div className="space-y-2.5">
                <div className="flex items-start gap-3">
                  <span className="text-sm mt-0.5">📅</span>
                  <p className="text-sm text-white/70">
                    La saison dure <span className="text-white font-semibold">{totalDays} jours</span>. Seuls les matchs joués pendant cette période comptent.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-sm mt-0.5">🏆</span>
                  <p className="text-sm text-white/70">
                    Le classement est basé sur le <span className="text-white font-semibold">classement national</span>.
                    Chaque victoire rapporte <span className="text-white font-semibold">10 pts</span>, chaque défaite <span className="text-white font-semibold">3 pts</span>.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-sm mt-0.5">🎯</span>
                  <p className="text-sm text-white/70">
                    Enregistre un maximum de matchs pour grimper dans le classement. Max <span className="text-white font-semibold">2 matchs par jour</span> comptabilisés.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-sm mt-0.5">🎁</span>
                  <p className="text-sm text-white/70">
                    Le <span className="text-white font-semibold">Top 3</span> à la fin de la saison remporte des récompenses !
                  </p>
                </div>
              </div>
            </div>

            {/* Rewards */}
            {sortedRewards.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-amber-400" />
                  Récompenses à gagner
                </h3>
                <div className="space-y-2.5">
                  {sortedRewards.map((reward) => (
                    <div key={reward.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                      {reward.reward_image_url ? (
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                          <img src={reward.reward_image_url} alt={reward.reward_label} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                          <span className="text-2xl">{medalEmojis[reward.rank - 1]}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm">{medalEmojis[reward.rank - 1]}</span>
                          <span className="text-sm font-bold text-white truncate">{reward.reward_label}</span>
                        </div>
                        {reward.reward_description && (
                          <p className="text-[11px] text-white/50 leading-relaxed line-clamp-2">{reward.reward_description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current rank */}
            {currentUserRank && (
              <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                {currentUserRank <= 3 ? (
                  <p className="text-sm font-bold text-amber-400">
                    {medalEmojis[currentUserRank - 1]} Tu es {currentUserRank === 1 ? '1er' : `${currentUserRank}e`} au classement {countryLabel} !
                  </p>
                ) : (
                  <p className="text-sm text-white/70">
                    Tu es <span className="font-bold text-white">{currentUserRank}e</span> au classement {countryLabel}
                    {currentUserRank <= 5 && (
                      <> — <span className="text-amber-400 font-semibold">encore {currentUserRank - 3} place{currentUserRank - 3 > 1 ? 's' : ''}</span> !</>
                    )}
                  </p>
                )}
              </div>
            )}

            <button onClick={() => setShowDetail(false)}
              className="mt-5 w-full rounded-xl bg-white/10 border border-white/15 py-3 text-sm font-semibold text-white hover:bg-white/15 transition-colors">
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
