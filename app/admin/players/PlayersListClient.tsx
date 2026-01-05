'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, Search } from 'lucide-react';
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
  clubs: {
    name: string;
  };
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

  const debouncedSearch = useDebounce(search, 300);

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

    return filtered;
  }, [initialPlayers, debouncedSearch]);

  function handleClubChange(clubId: string) {
    setSelectedClub(clubId);
    const params = new URLSearchParams(searchParams.toString());
    if (clubId === 'all') {
      params.delete('club');
    } else {
      params.set('club', clubId);
    }
    router.push(`/admin/players?${params.toString()}`);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    const params = new URLSearchParams(searchParams.toString());
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
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Filtrer par club
            </label>
            <select
              value={selectedClub}
              onChange={(e) => handleClubChange(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les clubs</option>
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Rechercher
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Nom, email..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Players Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Photo</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Club</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Inscription</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Aucun joueur trouvé</p>
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
                    <tr key={player.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        {player.avatar_url ? (
                          <Image
                            src={player.avatar_url}
                            alt={player.display_name || 'Joueur'}
                            width={40}
                            height={40}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">
                          {player.display_name || `${player.first_name} ${player.last_name}`}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{player.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{player.clubs?.name || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{registrationDate}</td>
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
