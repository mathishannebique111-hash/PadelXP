'use client';

import { useState, useEffect, useMemo } from 'react';
import { Trophy, Gift, Clock, ChevronRight, X, Calendar } from 'lucide-react';
import type { SeasonData, SeasonReward } from './SeasonBanner';

function useCountdown(endDate: string) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const target = new Date(endDate + 'T23:59:59');
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return { label: 'Terminée', urgent: true, days: 0 };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days <= 0) return { label: `${hours}h`, urgent: true, days: 0 };
  if (days <= 2) return { label: `${days}j ${hours}h`, urgent: true, days };
  return { label: `J-${days}`, urgent: days <= 3, days };
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

interface ChallengesSeasonBannerProps {
  season: SeasonData;
}

export default function ChallengesSeasonBanner({ season }: ChallengesSeasonBannerProps) {
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

  useEffect(() => {
    if (showDetail) {
      const nav = document.getElementById('bottom-nav-bar');
      if (nav) nav.style.display = 'none';
    } else {
      const nav = document.getElementById('bottom-nav-bar');
      if (nav) nav.style.display = '';
    }
    return () => {
      const nav = document.getElementById('bottom-nav-bar');
      if (nav) nav.style.display = '';
    };
  }, [showDetail]);

  return (
    <>
      <button onClick={() => setShowDetail(true)}
        className="relative w-full overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-amber-500/10 via-white/5 to-purple-500/10 backdrop-blur-sm p-3.5 sm:p-4 mb-4 sm:mb-6 text-left transition-all active:scale-[0.99]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full opacity-[0.06]" style={{ background: 'radial-gradient(circle at center, rgba(255,215,0,0.8), transparent 70%)' }} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Trophy className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-extrabold text-white truncate">{season.name}</span>
            </div>
            <div className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold flex-shrink-0 ${countdown.urgent ? 'bg-red-500/20 text-red-300 border border-red-400/30' : 'bg-white/10 text-white/70 border border-white/15'}`}>
              <Clock className="w-2.5 h-2.5" />
              {countdown.label}
            </div>
          </div>
          <div className="mb-2.5">
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, rgba(251,191,36,0.8), rgba(245,158,11,0.9), rgba(217,119,6,1))', boxShadow: '0 0 8px rgba(251,191,36,0.3)' }} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] sm:text-xs text-white/60">Complete tes challenges pendant la saison pour grimper au classement</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
          </div>
        </div>
      </button>

      {showDetail && (
        <div className="fixed inset-0 z-[999999] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDetail(false)} />
          <div className="relative w-full max-w-md sm:rounded-3xl rounded-t-3xl border border-white/15 bg-gradient-to-b from-[#1a1a2e] to-[#0d0d1a] p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowDetail(false)} className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10">
              <X className="w-4 h-4 text-white/60" />
            </button>

            <div className="text-center mb-5">
              <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <h2 className="text-lg font-extrabold text-white">{season.name}</h2>
              <p className="text-xs text-white/40 mt-1">
                {new Date(season.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
                {' — '}
                {new Date(season.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Comment ca marche</h3>
              <div className="space-y-2.5">
                <div className="flex items-start gap-3">
                  <span className="text-sm mt-0.5">📅</span>
                  <p className="text-sm text-white/70">La saison dure <span className="text-white font-semibold">{totalDays} jours</span>. Seuls les matchs joues pendant cette periode comptent.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-sm mt-0.5">🏆</span>
                  <p className="text-sm text-white/70">Chaque victoire rapporte <span className="text-white font-semibold">10 pts</span>, chaque defaite <span className="text-white font-semibold">3 pts</span>.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-sm mt-0.5">🎯</span>
                  <p className="text-sm text-white/70">Les <span className="text-white font-semibold">challenges sont a completer pendant la saison</span> pour accumuler un maximum de matchs et grimper au classement.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-sm mt-0.5">🎁</span>
                  <p className="text-sm text-white/70">Le <span className="text-white font-semibold">Top 3</span> a la fin de la saison remporte des recompenses !</p>
                </div>
              </div>
            </div>

            {sortedRewards.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-amber-400" /> Recompenses a gagner
                </h3>
                <div className="space-y-2.5">
                  {sortedRewards.map((reward) => (
                    <div key={reward.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                      {reward.reward_image_url ? (
                        <img src={reward.reward_image_url} alt={reward.reward_label} className="w-16 h-16 object-contain flex-shrink-0" />
                      ) : (
                        <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
                          <span className="text-2xl">{medalEmojis[reward.rank - 1]}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm">{medalEmojis[reward.rank - 1]}</span>
                          <span className="text-sm font-bold text-white truncate">{reward.reward_label}</span>
                        </div>
                        {reward.reward_description && <p className="text-[11px] text-white/50 leading-relaxed line-clamp-2">{reward.reward_description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => setShowDetail(false)} className="mt-5 w-full rounded-xl bg-white/10 border border-white/15 py-3 text-sm font-semibold text-white hover:bg-white/15 transition-colors">Fermer</button>
          </div>
        </div>
      )}
    </>
  );
}
