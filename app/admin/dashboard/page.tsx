import Link from 'next/link';
import { Building2, Users, MessageSquare } from 'lucide-react';
import StatsCards from './StatsCards';

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Admin</h1>
        <p className="text-gray-600 mt-1">Vue d'ensemble de la plateforme</p>
      </div>

      {/* Stats Cards */}
      <StatsCards />

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/clubs"
            className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all border border-gray-200"
          >
            <Building2 className="w-6 h-6 text-blue-600" />
            <div>
              <p className="font-semibold text-gray-900">Gérer les clubs</p>
              <p className="text-sm text-gray-600">Voir et modifier les clubs</p>
            </div>
          </Link>
          <Link
            href="/admin/players"
            className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all border border-gray-200"
          >
            <Users className="w-6 h-6 text-blue-600" />
            <div>
              <p className="font-semibold text-gray-900">Gérer les joueurs</p>
              <p className="text-sm text-gray-600">Voir tous les joueurs</p>
            </div>
          </Link>
          <Link
            href="/admin/messages"
            className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all border border-gray-200"
          >
            <MessageSquare className="w-6 h-6 text-blue-600" />
            <div>
              <p className="font-semibold text-gray-900">Messages</p>
              <p className="text-sm text-gray-600">Voir les messages reçus</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
