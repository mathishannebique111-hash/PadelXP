'use client';

import { useEffect, useState } from 'react';
import { Building2, Users, Trophy, MessageSquare } from 'lucide-react';

interface Stats {
  clubs: number;
  players: number;
  matches: number;
  matchesToday: number;
  unreadMessages: number;
}

export default function StatsCards() {
  const [stats, setStats] = useState<Stats>({
    clubs: 0,
    players: 0,
    matches: 0,
    matchesToday: 0,
    unreadMessages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/admin/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-slate-800/50 rounded-xl border border-white/5 p-6 animate-pulse">
            <div className="h-4 bg-slate-700/50 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-slate-700/50 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Clubs',
      value: stats.clubs,
      icon: Building2,
      from: 'from-padel-green',
      to: 'to-padel-green',
      shadow: 'shadow-padel-green/20',
    },
    {
      label: 'Joueurs',
      value: stats.players,
      icon: Users,
      from: 'from-padel-green',
      to: 'to-padel-green',
      shadow: 'shadow-padel-green/20',
    },
    {
      label: 'Matchs (Total)',
      value: stats.matches,
      icon: Trophy,
      from: 'from-padel-green',
      to: 'to-padel-green',
      shadow: 'shadow-padel-green/20',
    },
    {
      label: "Matchs d'aujourd'hui",
      value: stats.matchesToday,
      icon: Trophy,
      from: 'from-padel-green',
      to: 'to-padel-green',
      shadow: 'shadow-padel-green/20',
    },
    {
      label: 'Messages non lus',
      value: stats.unreadMessages,
      icon: MessageSquare,
      from: 'from-padel-green',
      to: 'to-padel-green',
      shadow: 'shadow-padel-green/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="group relative bg-slate-900/60 backdrop-blur-md rounded-xl border border-white/5 p-6 hover:border-padel-green/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-500 pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-xs font-medium text-slate-400 mb-1 group-hover:text-slate-300 transition-colors">{card.label}</p>
                <p className="text-3xl font-bold text-white tracking-tight">{card.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.from} ${card.to} flex items-center justify-center text-slate-900 shadow-lg ${card.shadow} group-hover:scale-110 transition-transform duration-300 shrink-0 ml-2`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
