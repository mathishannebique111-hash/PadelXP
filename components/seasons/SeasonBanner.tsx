'use client';

import { useState, useEffect, useMemo } from 'react';
import { Trophy, Gift, Clock, ChevronRight, X, Star, Calendar } from 'lucide-react';

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

export interface SeasonWinner {
  final_rank: number;
  final_points: number;
  user_id: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface SeasonBannerProps {
  season: SeasonData;
  mode: 'active' | 'completed' | 'upcoming';
  currentUserRank?: number;
  currentUserId?: string;
  userCountry?: 'FR' | 'BE';
  winners?: SeasonWinner[];
  upcomingSeason?: SeasonData | null;
}

function useCountdown(targetDate: string, isEnd = true) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const target = new Date(isEnd ? targetDate + 'T23:59:59' : targetDate + 'T00:00:00');
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return { label: isEnd ? 'Terminée' : 'Aujourd\'hui', urgent: true, days: 0 };

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
const countryLabels: Record<string, string> = { FR: 'français', BE: 'belge' };

function getWinnerName(w: SeasonWinner) {
  if (!w.profiles) return 'Joueur';
  const first = w.profiles.first_name || '';
  const lastInit = w.profiles.last_name ? w.profiles.last_name.charAt(0).toUpperCase() + '.' : '';
  return `${first} ${lastInit}`.trim() || w.profiles.display_name || 'Joueur';
}

function hideNav() {
  const nav = document.getElementById('bottom-nav-bar');
  if (nav) nav.style.display = 'none';
}
function showNav() {
  const nav = document.getElementById('bottom-nav-bar');
  if (nav) nav.style.display = '';
}

export default function SeasonBanner({
  season, mode, currentUserRank, currentUserId, userCountry = 'FR', winners = [], upcomingSeason,
}: SeasonBannerProps) {
  const [showDetail, setShowDetail] = useState(false);
  const countdown = useCountdown(season.end_date);
  const progress = useProgress(season.start_date, season.end_date);
  const upcomingCountdown = useCountdown(upcomingSeason?.start_date || '', false);

  const sortedRewards = useMemo(
    () => [...(season.season_rewards || [])].sort((a, b) => a.rank - b.rank),
    [season.season_rewards]
  );

  const upcomingRewards = useMemo(
    () => upcomingSeason ? [...(upcomingSeason.season_rewards || [])].sort((a, b) => a.rank - b.rank) : [],
    [upcomingSeason]
  );

  const totalDays = Math.ceil(
    (new Date(season.end_date + 'T23:59:59').getTime() - new Date(season.start_date).getTime()) / (1000 * 60 * 60 * 24)
  );

  const countryLabel = countryLabels[userCountry] || userCountry;

  // Current user's win info for completed season
  const currentUserWin = mode === 'completed' && currentUserId
    ? winners.find(w => w.user_id === currentUserId)
    : null;

  // Reward matched to user's rank
  const userReward = currentUserWin && currentUserWin.final_rank <= 3
    ? sortedRewards.find(r => r.rank === currentUserWin.final_rank)
    : null;

  useEffect(() => {
    if (showDetail) hideNav(); else showNav();
    return () => showNav();
  }, [showDetail]);

  // =============================
  // ACTIVE BANNER
  // =============================
  if (mode === 'active') {
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
              <div className="flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-400/25 px-2.5 py-1">
                <Gift className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] sm:text-xs font-bold text-amber-300">{sortedRewards.length} récompense{sortedRewards.length > 1 ? 's' : ''} à gagner</span>
                <ChevronRight className="w-3 h-3 text-amber-400/50" />
              </div>
              {currentUserRank && (
                <span className="text-[10px] sm:text-xs text-white/60">
                  {currentUserRank <= 3 ? <span className="text-amber-400 font-bold">{medalEmojis[currentUserRank - 1]} Top {countryLabel}</span> : <><span className="font-bold text-white">{currentUserRank}e</span> {countryLabel}</>}
                </span>
              )}
            </div>
          </div>
        </button>

        {showDetail && <DetailModal season={season} sortedRewards={sortedRewards} totalDays={totalDays} countryLabel={countryLabel} currentUserRank={currentUserRank} onClose={() => setShowDetail(false)} />}
      </>
    );
  }

  // =============================
  // COMPLETED BANNER
  // =============================
  if (mode === 'completed') {
    return (
      <>
        <button onClick={() => setShowDetail(true)}
          className="relative w-full overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 via-white/5 to-amber-500/10 backdrop-blur-sm p-3.5 sm:p-4 mb-4 sm:mb-6 text-left transition-all active:scale-[0.99]">
          <div className="relative z-10">
            {/* Winner announcement or season finished */}
            {currentUserWin && currentUserWin.final_rank <= 3 ? (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1.5">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span className="text-xs sm:text-sm font-extrabold text-amber-300">Félicitations !</span>
                  <Star className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-xs text-white/70">
                  Tu as terminé <span className="font-bold text-white">{currentUserWin.final_rank === 1 ? '1er' : `${currentUserWin.final_rank}e`}</span> de {season.name}
                  {userReward && <> et tu as gagné <span className="font-bold text-amber-300">{userReward.reward_label}</span></>} !
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs sm:text-sm font-extrabold text-white">{season.name}</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-400/15 border border-emerald-400/30 rounded-full px-2.5 py-0.5">Terminée</span>
                </div>
                {/* Mini podium or message */}
                {winners.length > 0 ? (
                  <div className="flex items-center gap-3 justify-center">
                    {winners.slice(0, 3).map((w, i) => (
                      <div key={w.user_id} className="flex items-center gap-1.5">
                        <span className="text-sm">{medalEmojis[i]}</span>
                        <span className="text-[10px] sm:text-xs text-white/70 font-semibold">{getWinnerName(w)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/50 text-center">La saison est terminée. Voir les détails.</p>
                )}
              </div>
            )}

            {/* Upcoming season teaser */}
            {upcomingSeason && (
              <div className="mt-2.5 pt-2.5 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-blue-400" />
                  <span className="text-[10px] sm:text-xs text-white/50">
                    Prochaine saison dans <span className="font-bold text-blue-300">{upcomingCountdown.days > 0 ? `${upcomingCountdown.days} jour${upcomingCountdown.days > 1 ? 's' : ''}` : 'quelques heures'}</span>
                  </span>
                </div>
                <ChevronRight className="w-3 h-3 text-white/30" />
              </div>
            )}
          </div>
        </button>

        {showDetail && (
          <CompletedModal
            season={season}
            sortedRewards={sortedRewards}
            winners={winners}
            currentUserWin={currentUserWin}
            userReward={userReward}
            countryLabel={countryLabel}
            upcomingSeason={upcomingSeason}
            upcomingRewards={upcomingRewards}
            upcomingCountdown={upcomingCountdown}
            onClose={() => setShowDetail(false)}
          />
        )}
      </>
    );
  }

  // =============================
  // UPCOMING BANNER
  // =============================
  const startCountdown = useCountdown(season.start_date, false);

  return (
    <>
      <button onClick={() => setShowDetail(true)}
        className="relative w-full overflow-hidden rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 via-white/5 to-purple-500/10 backdrop-blur-sm p-3.5 sm:p-4 mb-4 sm:mb-6 text-left transition-all active:scale-[0.99]">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span className="text-xs sm:text-sm font-extrabold text-white">{season.name}</span>
            </div>
            <span className="text-[10px] font-bold text-blue-300 bg-blue-400/15 border border-blue-400/30 rounded-full px-2.5 py-0.5">
              Dans {startCountdown.days > 0 ? `${startCountdown.days}j` : 'quelques heures'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-400/25 px-2.5 py-1">
              <Gift className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] sm:text-xs font-bold text-amber-300">{sortedRewards.length} récompense{sortedRewards.length > 1 ? 's' : ''} à gagner</span>
              <ChevronRight className="w-3 h-3 text-amber-400/50" />
            </div>
          </div>
        </div>
      </button>

      {showDetail && <DetailModal season={season} sortedRewards={sortedRewards} totalDays={totalDays} countryLabel={countryLabel} onClose={() => setShowDetail(false)} isUpcoming />}
    </>
  );
}

// ============================================
// DETAIL MODAL (active + upcoming)
// ============================================
function DetailModal({ season, sortedRewards, totalDays, countryLabel, currentUserRank, onClose, isUpcoming }: {
  season: SeasonData; sortedRewards: SeasonReward[]; totalDays: number; countryLabel: string;
  currentUserRank?: number; onClose: () => void; isUpcoming?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[999999] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md sm:rounded-3xl rounded-t-3xl border border-white/15 bg-gradient-to-b from-[#1a1a2e] to-[#0d0d1a] p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10">
          <X className="w-4 h-4 text-white/60" />
        </button>

        <div className="text-center mb-5">
          {isUpcoming ? <Calendar className="w-8 h-8 text-blue-400 mx-auto mb-2" /> : <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-2" />}
          <h2 className="text-lg font-extrabold text-white">{season.name}</h2>
          <p className="text-xs text-white/40 mt-1">
            {isUpcoming && 'Début le '}{new Date(season.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
            {' — '}
            {new Date(season.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Comment ça marche</h3>
          <div className="space-y-2.5">
            <div className="flex items-start gap-3">
              <span className="text-sm mt-0.5">📅</span>
              <p className="text-sm text-white/70">La saison dure <span className="text-white font-semibold">{totalDays} jours</span>. Seuls les matchs joués pendant cette période comptent.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-sm mt-0.5">🏆</span>
              <p className="text-sm text-white/70">Le classement est basé sur le <span className="text-white font-semibold">classement national</span>. Chaque victoire rapporte <span className="text-white font-semibold">10 pts</span>, chaque défaite <span className="text-white font-semibold">3 pts</span>.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-sm mt-0.5">🎯</span>
              <p className="text-sm text-white/70">Enregistre un maximum de matchs pour grimper dans le classement. Max <span className="text-white font-semibold">2 matchs par jour</span> comptabilisés.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-sm mt-0.5">🎁</span>
              <p className="text-sm text-white/70">Le <span className="text-white font-semibold">Top 3</span> à la fin de la saison remporte des récompenses !</p>
            </div>
          </div>
        </div>

        {sortedRewards.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5 text-amber-400" /> Récompenses à gagner
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
                    {reward.reward_description && <p className="text-[11px] text-white/50 leading-relaxed line-clamp-2">{reward.reward_description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentUserRank && (
          <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3 text-center">
            {currentUserRank <= 3 ? (
              <p className="text-sm font-bold text-amber-400">{medalEmojis[currentUserRank - 1]} Tu es {currentUserRank === 1 ? '1er' : `${currentUserRank}e`} au classement {countryLabel} !</p>
            ) : (
              <p className="text-sm text-white/70">Tu es <span className="font-bold text-white">{currentUserRank}e</span> au classement {countryLabel}{currentUserRank <= 5 && <> — <span className="text-amber-400 font-semibold">encore {currentUserRank - 3} place{currentUserRank - 3 > 1 ? 's' : ''}</span> !</>}</p>
            )}
          </div>
        )}

        <button onClick={onClose} className="mt-5 w-full rounded-xl bg-white/10 border border-white/15 py-3 text-sm font-semibold text-white hover:bg-white/15 transition-colors">Fermer</button>
      </div>
    </div>
  );
}

// ============================================
// COMPLETED MODAL
// ============================================
function CompletedModal({ season, sortedRewards, winners, currentUserWin, userReward, countryLabel, upcomingSeason, upcomingRewards, upcomingCountdown, onClose }: {
  season: SeasonData; sortedRewards: SeasonReward[]; winners: SeasonWinner[];
  currentUserWin: SeasonWinner | null; userReward: SeasonReward | null | undefined;
  countryLabel: string; upcomingSeason?: SeasonData | null; upcomingRewards: SeasonReward[];
  upcomingCountdown: { label: string; days: number }; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[999999] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md sm:rounded-3xl rounded-t-3xl border border-white/15 bg-gradient-to-b from-[#1a1a2e] to-[#0d0d1a] p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10">
          <X className="w-4 h-4 text-white/60" />
        </button>

        {/* Header */}
        <div className="text-center mb-5">
          <Trophy className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <h2 className="text-lg font-extrabold text-white">{season.name}</h2>
          <span className="inline-block mt-1 text-[10px] font-bold text-emerald-300 bg-emerald-400/15 border border-emerald-400/30 rounded-full px-3 py-0.5">Saison terminée</span>
        </div>

        {/* User's personal result */}
        {currentUserWin && currentUserWin.final_rank <= 3 && (
          <div className="rounded-xl border-2 border-amber-400/30 bg-amber-500/10 p-4 mb-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="w-5 h-5 text-amber-400" />
              <span className="text-base font-extrabold text-amber-300">Félicitations !</span>
              <Star className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-sm text-white/80 mb-1">
              Tu as terminé <span className="font-bold text-white">{currentUserWin.final_rank === 1 ? '1er' : `${currentUserWin.final_rank}e`}</span> au classement {countryLabel} avec <span className="font-bold text-white">{currentUserWin.final_points} pts</span>
            </p>
            {userReward && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-amber-400/20 bg-amber-500/10 p-3">
                {userReward.reward_image_url ? (
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                    <img src={userReward.reward_image_url} alt={userReward.reward_label} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <span className="text-3xl">{medalEmojis[userReward.rank - 1]}</span>
                )}
                <div className="text-left">
                  <p className="text-xs text-amber-300/70">Tu as gagné</p>
                  <p className="text-sm font-bold text-white">{userReward.reward_label}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Podium */}
        {winners.length > 0 ? (
          <div className="mb-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 mb-3">Podium {countryLabel}</h3>
            <div className="space-y-2">
              {winners.slice(0, 3).map((w, i) => {
                const reward = sortedRewards.find(r => r.rank === w.final_rank);
                return (
                  <div key={w.user_id} className={`flex items-center gap-3 rounded-xl p-3 ${i === 0 ? 'border-2 border-amber-400/20 bg-amber-500/5' : 'border border-white/10 bg-white/5'}`}>
                    <span className="text-xl">{medalEmojis[i]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{getWinnerName(w)}</p>
                      <p className="text-[10px] text-white/40">{w.final_points} pts</p>
                    </div>
                    {reward && (
                      <div className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-2 py-1">
                        <Gift className="w-3 h-3 text-amber-400" />
                        <span className="text-[10px] font-semibold text-white/60 max-w-[80px] truncate">{reward.reward_label}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mb-5 rounded-xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-sm text-white/50">Aucun résultat enregistré pour cette saison.</p>
          </div>
        )}

        {/* Rewards recap */}
        {sortedRewards.length > 0 && (
          <div className="mb-5 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5 text-amber-400" /> Récompenses de la saison
            </h3>
            {sortedRewards.map((reward) => (
              <div key={reward.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                {reward.reward_image_url ? (
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                    <img src={reward.reward_image_url} alt={reward.reward_label} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
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
        )}

        {/* Upcoming season teaser */}
        {upcomingSeason && (
          <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-4 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-bold text-white">{upcomingSeason.name}</span>
            </div>
            <p className="text-xs text-white/50 mb-3">
              Démarre dans <span className="font-bold text-blue-300">{upcomingCountdown.days > 0 ? `${upcomingCountdown.days} jour${upcomingCountdown.days > 1 ? 's' : ''}` : 'quelques heures'}</span>
            </p>
            {upcomingRewards.length > 0 && (
              <div className="space-y-1.5">
                {upcomingRewards.map(reward => (
                  <div key={reward.id} className="flex items-center gap-2">
                    <span className="text-sm">{medalEmojis[reward.rank - 1]}</span>
                    <span className="text-xs text-white/60">{reward.reward_label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button onClick={onClose} className="w-full rounded-xl bg-white/10 border border-white/15 py-3 text-sm font-semibold text-white hover:bg-white/15 transition-colors">Fermer</button>
      </div>
    </div>
  );
}
