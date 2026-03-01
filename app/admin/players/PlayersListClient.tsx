'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, Search, User } from 'lucide-react';
import Image from 'next/image';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface Player {
  id: string;
  display_name: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
  club_id: string;
  created_at: string;
  matchs_joues: number | null;
  city: string | null;
  postal_code: string | null;
  clubs: {
    name: string;
  };
  push_tokens: Array<{ id: string }>;
}

interface Club {
  id: string;
  name: string;
  email: string;
}

export default function PlayersListClient({
  initialPlayers,
  clubs,
  initialClub,
  initialSearch,
}: {
  initialPlayers: Player[];
  clubs: Club[];
  initialClub: string;
  initialSearch: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [selectedClub, setSelectedClub] = useState(initialClub);
  const [sortBy, setSortBy] = useState<'date' | 'alpha'>('date');

  const debouncedSearch = useDebounce(search, 300);

  // Force actualisation des données en provenance du serveur lors du montage 
  // pour s'assurer que les nouveaux inscrits s'affichent
  useEffect(() => {
    router.refresh();
  }, [router]);

  const filteredPlayers = useMemo(() => {
    let filtered = [...initialPlayers];

    // Filter by search
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (player) =>
          player.display_name?.toLowerCase().includes(searchLower) ||
          player.first_name?.toLowerCase().includes(searchLower) ||
          player.last_name?.toLowerCase().includes(searchLower) ||
          player.email?.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    if (sortBy === 'alpha') {
      filtered.sort((a, b) => {
        const nameA = (a.display_name || `${a.first_name || ''} ${a.last_name || ''}`).trim().toLowerCase();
        const nameB = (b.display_name || `${b.first_name || ''} ${b.last_name || ''}`).trim().toLowerCase();
        return nameA.localeCompare(nameB, 'fr');
      });
    } else {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return filtered;
  }, [initialPlayers, debouncedSearch, sortBy]);

  function handleClubChange(clubId: string) {
    setSelectedClub(clubId);
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (clubId === 'all') {
      params.delete('club');
    } else {
      params.set('club', clubId);
    }
    router.push(`/admin/players?${params.toString()}`);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (value) {
      params.set('search', value);
    } else {
      params.delete('search');
    }
    router.push(`/admin/players?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/5 p-6 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Filtrer par club
            </label>
            <select
              value={selectedClub}
              onChange={(e) => handleClubChange(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all custom-select"
            >
              <option value="all" className="bg-slate-900">Tous les clubs</option>
              {clubs.map((club) => (
                <option key={club.id} value={club.id} className="bg-slate-900">
                  {club.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Trier par
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'alpha')}
              className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all custom-select"
            >
              <option value="date" className="bg-slate-900">Date d'inscription</option>
              <option value="alpha" className="bg-slate-900">Ordre alphabétique</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Rechercher
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Nom, email..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Players Table */}
      <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Nom</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Localisation</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Matchs</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Club</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Notifications</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Inscription</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-slate-500" />
                    </div>
                    <p className="text-slate-400 text-lg">Aucun joueur trouvé</p>
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player) => {
                  const registrationDate = new Date(player.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  });

                  return (
                    <tr key={player.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-medium text-white group-hover:text-blue-300 transition-colors">
                          {player.display_name || `${player.first_name} ${player.last_name}`}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{player.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {player.city && player.postal_code
                          ? `${player.city} (${player.postal_code})`
                          : player.city || player.postal_code || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="font-bold text-white">
                          {player.matchs_joues || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {player.clubs?.name ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {player.clubs.name}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {player.push_tokens && player.push_tokens.length > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                            Oui
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                            Non
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{registrationDate}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
