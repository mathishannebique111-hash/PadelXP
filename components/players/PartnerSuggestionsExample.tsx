"use client";

/**
 * EXEMPLE DE COMPOSANT POUR LES SUGGESTIONS DE PARTENAIRES
 * 
 * Ce composant montre comment intégrer le bouton "Voir profil"
 * dans un système de suggestions de partenaires.
 * 
 * À utiliser quand vous créerez le système de suggestions.
 */

import { useRouter } from "next/navigation";
import { MessageCircle, Eye } from "lucide-react";

interface SuggestedPlayer {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  niveau_padel?: number;
  avatar_url?: string;
}

interface Props {
  suggestions: SuggestedPlayer[];
}

export default function PartnerSuggestionsExample({ suggestions }: Props) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white mb-4">
        Partenaires suggérés
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suggestions.map((player) => (
          <div
            key={player.id}
            className="bg-slate-800 rounded-2xl p-4 border border-white/10"
          >
            <div className="flex items-center gap-3 mb-4">
              {player.avatar_url ? (
                <img
                  src={player.avatar_url}
                  alt={player.display_name}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
                  {player.first_name?.[0] || player.display_name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">
                  {player.display_name}
                </p>
                {player.niveau_padel && (
                  <p className="text-xs text-gray-400">
                    Niveau {player.niveau_padel.toFixed(1)}/10
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 py-2 px-3 bg-blue-500 text-white rounded-lg text-xs md:text-sm font-medium flex items-center justify-center gap-1 active:bg-blue-600 min-h-[44px]"
              >
                <MessageCircle size={14} />
                <span>Inviter</span>
              </button>

              {/* BOUTON "VOIR PROFIL" - Redirige vers /players/[id] */}
              <button
                type="button"
                onClick={() => router.push(`/players/${player.id}`)}
                className="py-2 px-3 border border-slate-600 text-gray-300 rounded-lg text-xs md:text-sm font-medium flex items-center gap-1 active:bg-slate-700 min-h-[44px]"
              >
                <Eye size={14} />
                <span className="hidden sm:inline">Profil</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
