import Link from 'next/link';
import { Building2, Users, MessageSquare } from 'lucide-react';
import StatsCards from './StatsCards';

export const dynamic = 'force-dynamic';

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Tableau de bord</h1>
        <p className="text-slate-400 mt-2">Vue d'ensemble de la plateforme PadelXP.</p>
      </div>

      {/* Stats Cards */}
      <StatsCards />

      {/* Quick Actions */}
      <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/5 p-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="w-1 h-6 bg-padel-green rounded-full"></span>
          Actions rapides
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/admin/clubs"
            className="group flex items-center gap-4 p-5 bg-slate-800/40 hover:bg-slate-800/80 rounded-xl transition-all border border-white/5 hover:border-padel-green/30 hover:shadow-lg hover:shadow-padel-green/20"
          >
            <div className="p-3 rounded-lg bg-padel-green/10 text-padel-green group-hover:bg-padel-green group-hover:text-slate-900 transition-colors">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-white group-hover:text-padel-green transition-colors">Gérer les clubs</p>
              <p className="text-sm text-slate-400 group-hover:text-slate-300">Voir et modifier les clubs</p>
            </div>
          </Link>

          <Link
            href="/admin/players"
            className="group flex items-center gap-4 p-5 bg-slate-800/40 hover:bg-slate-800/80 rounded-xl transition-all border border-white/5 hover:border-padel-green/30 hover:shadow-lg hover:shadow-padel-green/20"
          >
            <div className="p-3 rounded-lg bg-padel-green/10 text-padel-green group-hover:bg-padel-green group-hover:text-slate-900 transition-colors">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-white group-hover:text-padel-green transition-colors">Gérer les joueurs</p>
              <p className="text-sm text-slate-400 group-hover:text-slate-300">Voir tous les joueurs</p>
            </div>
          </Link>

          <Link
            href="/admin/messages"
            className="group flex items-center gap-4 p-5 bg-slate-800/40 hover:bg-slate-800/80 rounded-xl transition-all border border-white/5 hover:border-padel-green/30 hover:shadow-lg hover:shadow-padel-green/20"
          >
            <div className="p-3 rounded-lg bg-padel-green/10 text-padel-green group-hover:bg-padel-green group-hover:text-slate-900 transition-colors">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-white group-hover:text-padel-green transition-colors">Messages</p>
              <p className="text-sm text-slate-400 group-hover:text-slate-300">Voir les messages reçus</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
