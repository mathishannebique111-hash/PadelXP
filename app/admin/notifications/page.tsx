'use client';

import { useState, useEffect, useMemo } from 'react';
import { Bell, TrendingUp, Users, MousePointerClick, Search, ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react';

interface OverviewStats {
  totalSent: number;
  totalRead: number;
  totalClicked: number;
  readRate: number;
  clickRate: number;
  uniqueUsers: number;
}

interface PlayerStat {
  userId: string;
  fullName: string;
  email: string;
  clubId: string | null;
  sent: number;
  read: number;
  clicked: number;
  readRate: number;
  clickRate: number;
}

interface TypeStat {
  type: string;
  sent: number;
  read: number;
  clicked: number;
  readRate: number;
  clickRate: number;
}

interface DailyStat {
  date: string;
  sent: number;
  read: number;
  clicked: number;
  clickRate: number;
}

interface Club {
  id: string;
  name: string;
}

const TYPE_LABELS: Record<string, string> = {
  badge: 'Badge',
  badge_unlocked: 'Badge debloque',
  level_up: 'Niveau atteint',
  top3: 'Top 3',
  top3_ranking: 'Top 3 classement',
  referral: 'Parrainage',
  challenge: 'Challenge',
  challenge_new: 'Nouveau challenge',
  challenge_expiring: 'Challenge expirant',
  challenge_progress: 'Progression challenge',
  match_confirmation: 'Confirmation match',
  match_validated: 'Match valide',
  match_refusal_warning: 'Alerte refus match',
  match_points_earned: 'Points gagnes',
  match_proposal: 'Proposition match',
  match_accepted: 'Match accepte',
  match_declined: 'Match refuse',
  match_invitation_received: 'Invitation recue',
  match_invitation_accepted: 'Invitation acceptee',
  match_invitation_refused: 'Invitation refusee',
  match_invitation_expired: 'Invitation expiree',
  win_streak: 'Serie victoires',
  partner_match_played: 'Match partenaire',
  inactivity_reminder: 'Rappel inactivite',
  weekly_recap: 'Resume hebdo',
  first_match_reminder: 'Rappel 1er match',
  coach_debrief: 'Debrief coach',
  coach_message: 'Message coach',
  partnership_request: 'Demande partenariat',
  partnership_accepted: 'Partenariat accepte',
  partnership_declined: 'Partenariat refuse',
  team_challenge_received: 'Defi equipe recu',
  team_challenge_accepted: 'Defi equipe accepte',
  team_challenge_refused: 'Defi equipe refuse',
  team_challenge_expired: 'Defi equipe expire',
  team_challenge_reminder: 'Rappel defi equipe',
  reservation_created: 'Reservation creee',
  reservation_confirmed: 'Reservation confirmee',
  reservation_cancelled: 'Reservation annulee',
  reservation_expired: 'Reservation expiree',
  reservation_payment_reminder: 'Rappel paiement',
  chat: 'Chat',
  system: 'Systeme',
};

type SortField = 'sent' | 'clicked' | 'clickRate' | 'fullName';
type SortDir = 'asc' | 'desc';

export default function AdminNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([]);
  const [typeStats, setTypeStats] = useState<TypeStat[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [days, setDays] = useState<number | null>(null);
  const [clubId, setClubId] = useState('');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('sent');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showAllTypes, setShowAllTypes] = useState(false);

  useEffect(() => {
    fetchData();
  }, [days, clubId]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (days) params.set('days', String(days));
      if (clubId) params.set('clubId', clubId);

      const res = await fetch(`/api/admin/notifications/analytics?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();

      setOverview(data.overview);
      setPlayerStats(data.playerStats);
      setTypeStats(data.typeStats);
      setDailyStats(data.dailyStats);
      setClubs(data.clubs);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filteredPlayers = useMemo(() => {
    let filtered = playerStats;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p =>
        p.fullName.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
      );
    }
    return filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [playerStats, search, sortField, sortDir]);

  const visibleTypes = showAllTypes ? typeStats : typeStats.slice(0, 10);

  // Simple bar chart for daily stats
  const maxDailySent = Math.max(...dailyStats.map(d => d.sent), 1);

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Bell className="w-7 h-7 text-blue-400" />
          Notifications Analytics
        </h1>
        <p className="text-slate-400 mt-1">Suivi des envois, ouvertures et engagement</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          value={days ?? ''}
          onChange={e => setDays(e.target.value ? Number(e.target.value) : null)}
          className="bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Depuis le debut</option>
          <option value={7}>7 derniers jours</option>
          <option value={14}>14 derniers jours</option>
          <option value={30}>30 derniers jours</option>
          <option value={60}>60 derniers jours</option>
          <option value={90}>90 derniers jours</option>
        </select>

        <select
          value={clubId}
          onChange={e => setClubId(e.target.value)}
          className="bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tous les clubs</option>
          {clubs.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Bell className="w-5 h-5" />}
            label="Envoyees"
            value={overview.totalSent.toLocaleString()}
            color="blue"
          />
          <StatCard
            icon={<MousePointerClick className="w-5 h-5" />}
            label="Ouvertes"
            value={overview.totalClicked.toLocaleString()}
            sub={`${overview.clickRate}% taux d'ouverture`}
            color="green"
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Joueurs touches"
            value={overview.uniqueUsers.toLocaleString()}
            color="purple"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Moy. / joueur"
            value={overview.uniqueUsers > 0 ? Math.round(overview.totalSent / overview.uniqueUsers).toString() : '0'}
            sub={`${overview.uniqueUsers > 0 ? Math.round(overview.totalClicked / overview.uniqueUsers) : 0} ouvertes / joueur`}
            color="amber"
          />
        </div>
      )}

      {/* Daily Chart */}
      {dailyStats.length > 0 && (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Volume quotidien</h2>
          <div className="flex items-end gap-1 h-40">
            {dailyStats.map(d => {
              const h = (d.sent / maxDailySent) * 100;
              const clickH = d.sent > 0 ? (d.clicked / d.sent) * h : 0;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative min-w-0">
                  <div className="w-full flex flex-col justify-end" style={{ height: '140px' }}>
                    <div className="relative w-full">
                      <div
                        className="w-full bg-blue-500/30 rounded-t"
                        style={{ height: `${Math.max(h, 2)}px` }}
                      />
                      <div
                        className="w-full bg-green-500 rounded-t absolute bottom-0"
                        style={{ height: `${Math.max(clickH, 0)}px` }}
                      />
                    </div>
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white whitespace-nowrap z-10 shadow-xl">
                    <div className="font-medium">{new Date(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</div>
                    <div className="text-blue-400">{d.sent} envoyees</div>
                    <div className="text-green-400">{d.clicked} ouvertes</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            <span>{dailyStats.length > 0 && new Date(dailyStats[0].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
            <span>{dailyStats.length > 0 && new Date(dailyStats[dailyStats.length - 1].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
          </div>
          <div className="flex gap-4 mt-3 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500/30" /> Envoyees</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500" /> Ouvertes</span>
          </div>
        </div>
      )}

      {/* Type Stats */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Par type de notification</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-3 text-slate-400 font-medium">Type</th>
                <th className="text-right py-3 px-3 text-slate-400 font-medium">Envoyees</th>
                <th className="text-right py-3 px-3 text-slate-400 font-medium">Ouvertes</th>
                <th className="text-right py-3 px-3 text-slate-400 font-medium">Taux ouverture</th>
                <th className="text-left py-3 px-3 text-slate-400 font-medium w-40"></th>
              </tr>
            </thead>
            <tbody>
              {visibleTypes.map(t => (
                <tr key={t.type} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-3 text-white font-medium">
                    {TYPE_LABELS[t.type] || t.type}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-300">{t.sent}</td>
                  <td className="py-3 px-3 text-right text-slate-300">{t.clicked}</td>
                  <td className="py-3 px-3 text-right">
                    <RateBadge rate={t.clickRate} />
                  </td>
                  <td className="py-3 px-3">
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          t.clickRate >= 50 ? 'bg-green-500' : t.clickRate >= 20 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${t.clickRate}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {typeStats.length > 10 && (
          <button
            onClick={() => setShowAllTypes(!showAllTypes)}
            className="mt-3 text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            {showAllTypes ? (
              <><ChevronUp className="w-4 h-4" /> Voir moins</>
            ) : (
              <><ChevronDown className="w-4 h-4" /> Voir les {typeStats.length - 10} autres types</>
            )}
          </button>
        )}
      </div>

      {/* Player Stats */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-lg font-semibold text-white">Par joueur</h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un joueur..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-slate-800 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <SortableHeader field="fullName" label="Joueur" currentSort={sortField} dir={sortDir} onSort={handleSort} align="left" />
                <SortableHeader field="sent" label="Envoyees" currentSort={sortField} dir={sortDir} onSort={handleSort} />
                <SortableHeader field="clicked" label="Ouvertes" currentSort={sortField} dir={sortDir} onSort={handleSort} />
                <SortableHeader field="clickRate" label="Taux ouverture" currentSort={sortField} dir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.slice(0, 100).map(p => (
                <tr key={p.userId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-3">
                    <div className="text-white font-medium">{p.fullName}</div>
                    <div className="text-slate-500 text-xs">{p.email}</div>
                  </td>
                  <td className="py-3 px-3 text-right text-slate-300">{p.sent}</td>
                  <td className="py-3 px-3 text-right text-slate-300">{p.clicked}</td>
                  <td className="py-3 px-3 text-right">
                    <RateBadge rate={p.clickRate} />
                  </td>
                </tr>
              ))}
              {filteredPlayers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    Aucun joueur trouve
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredPlayers.length > 100 && (
          <p className="mt-3 text-xs text-slate-500 text-center">
            Affichage des 100 premiers sur {filteredPlayers.length} joueurs
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: 'blue' | 'green' | 'purple' | 'amber';
}) {
  const colors = {
    blue: 'from-blue-600/20 to-blue-600/5 border-blue-500/20 text-blue-400',
    green: 'from-green-600/20 to-green-600/5 border-green-500/20 text-green-400',
    purple: 'from-purple-600/20 to-purple-600/5 border-purple-500/20 text-purple-400',
    amber: 'from-amber-600/20 to-amber-600/5 border-amber-500/20 text-amber-400',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-5`}>
      <div className={`${colors[color].split(' ').pop()} mb-3`}>{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-slate-400 mt-0.5">{label}</div>
      {sub && <div className={`text-xs mt-1 ${colors[color].split(' ').pop()}`}>{sub}</div>}
    </div>
  );
}

function RateBadge({ rate }: { rate: number }) {
  const color = rate >= 50 ? 'text-green-400 bg-green-500/10' : rate >= 20 ? 'text-amber-400 bg-amber-500/10' : 'text-red-400 bg-red-500/10';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {rate}%
    </span>
  );
}

function SortableHeader({ field, label, currentSort, dir, onSort, align = 'right' }: {
  field: SortField;
  label: string;
  currentSort: SortField;
  dir: SortDir;
  onSort: (f: SortField) => void;
  align?: 'left' | 'right';
}) {
  const isActive = currentSort === field;
  return (
    <th
      className={`py-3 px-3 text-slate-400 font-medium cursor-pointer hover:text-white transition-colors select-none ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-40" />
        )}
      </span>
    </th>
  );
}
