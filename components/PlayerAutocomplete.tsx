"use client";

import { useState, useEffect, useRef } from "react";
import type { PlayerSearchResult } from "@/lib/utils/player-utils";
import { logger } from '@/lib/logger';

import { Home, Globe, Mail, UserPlus } from "lucide-react";

interface PlayerAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (player: PlayerSearchResult | null) => void;
  error?: string;
  placeholder?: string;
  label?: string;
  searchScope?: 'club' | 'global' | 'guest';
  inputClassName?: string;
}

const GUEST_UUID = "00000000-0000-0000-0000-000000000000";

export default function PlayerAutocomplete({
  value,
  onChange,
  onSelect,
  error,
  placeholder = "Rechercher un joueur...",
  label,
  searchScope = 'club',
  inputClassName = "",
}: PlayerAutocompleteProps) {

  const [searchResults, setSearchResults] = useState<PlayerSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateGuest, setShowCreateGuest] = useState(false);
  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestLastName, setGuestLastName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [creatingGuest, setCreatingGuest] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        // Ne pas fermer le createGuest si on est en mode "guest" explicite
        if (searchScope !== 'guest') {
          setShowCreateGuest(false);
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchScope]);

  // Reset search when scope changes
  useEffect(() => {
    setSearchResults([]);
    setShowDropdown(false);
    if (value && searchScope !== 'guest') {
      searchPlayers(value);
    }
  }, [searchScope]);

  // Si on passe en mode guest, on affiche le formulaire
  // Si on quitte le mode guest, on cache le formulaire
  useEffect(() => {
    setShowCreateGuest(searchScope === 'guest');
  }, [searchScope]);


  const handleSelectPlayer = (player: PlayerSearchResult) => {
    const displayName = player.display_name.replace(" 👤", "");
    onChange(displayName);
    onSelect(player);
    setShowDropdown(false);
    setSearchResults([]);
  };

  const searchPlayers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    try {
      const params = new URLSearchParams({
        q: query,
        scope: searchScope
      });
      logger.info(`[PlayerAutocomplete] Searching query="${query}" scope="${searchScope}"`);

      const response = await fetch(`/api/players/search?${params.toString()}`, {
        credentials: 'include',
      });

      // ... (existing error handling)
      if (!response.ok) {
        // ... (keep existing error handling)
        setSearchResults([]);
        return;
      }

      const responseData = await response.json();
      const data = responseData.players || responseData || [];

      // ... (existing logging)

      setSearchResults(data);
      setShowDropdown(true);
    } catch (error) {
      logger.error("Error searching players:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Si le champ est vidé, réinitialiser la sélection
    if (!newValue.trim()) {
      onSelect(null);
      setShowDropdown(false);
      setSearchResults([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Recherche avec délai court pour une meilleure réactivité (100ms au lieu de 200ms)
    searchTimeoutRef.current = setTimeout(() => {
      searchPlayers(newValue);
    }, 100);
  };

  const handleBlur = () => {
    // Fermer le dropdown après un court délai pour permettre le clic
    setTimeout(() => {
      setShowDropdown(false);
    }, 200);
  };

  const handleCreateGuest = async () => {
    if (!guestFirstName.trim() || !guestLastName.trim()) {
      return;
    }

    setCreatingGuest(true);
    try {
      // Utiliser find_or_create_player avec le nom complet et l'email
      const fullName = `${guestFirstName.trim()} ${guestLastName.trim()}`.trim();
      const response = await fetch("/api/players/find-or-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          playerName: fullName,
          email: guestEmail.trim() || undefined
        }),
      });

      if (response.ok) {
        const { player } = await response.json();

        if (!player) {
          alert("Impossible de trouver ou créer le joueur");
          return;
        }

        // Parser le display_name pour extraire first_name et last_name
        // La majuscule est déjà gérée par l'API mais on s'assure que l'affichage local est correct
        const nameParts = player.display_name.trim().split(/\s+/);
        const first_name = nameParts[0] || "";
        const last_name = nameParts.slice(1).join(" ") || "";

        // Déterminer le type (prioriser le type retourné par l'API)
        // IMPORTANT : Ne pas forcer 'user' si email présent, car un guest peut avoir un email
        const type: "user" | "guest" = (player.type as "user" | "guest") || "guest";

        const playerResult: PlayerSearchResult = {
          id: player.id,
          first_name,
          last_name,
          type,
          display_name: type === "guest" ? `${player.display_name} 👤` : player.display_name,
          email: player.email || guestEmail.trim() || null,
        };

        handleSelectPlayer(playerResult);
        setShowCreateGuest(false);
        setGuestFirstName("");
        setGuestLastName("");
        setGuestEmail("");
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Impossible de trouver ou créer le joueur";
        alert(`Erreur: ${errorMessage}`);
      }
    } catch (error) {
      logger.error("Error creating guest:", error);
      alert("Erreur lors de la création du joueur");
    } finally {
      setCreatingGuest(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="mb-2 block text-sm font-medium text-white">{label}</label>
      )}

      {searchScope === 'guest' ? (
        <div className="bg-slate-800/90 rounded-xl border border-white/10 p-4 animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-md shadow-xl">
          <div className="mb-4 flex justify-between items-center">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Mail size={16} className="text-blue-400" /> Inviter par email
            </h4>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Prénom</label>
                <input
                  type="text"
                  value={guestFirstName}
                  onChange={(e) => setGuestFirstName(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  placeholder="Prénom"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Nom</label>
                <input
                  type="text"
                  value={guestLastName}
                  onChange={(e) => setGuestLastName(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  placeholder="Nom"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email <span className="text-gray-500 font-normal">(Requis pour invitation)</span></label>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                placeholder="email@exemple.com"
              />
            </div>

            <button
              type="button"
              onClick={handleCreateGuest}
              disabled={creatingGuest || !guestFirstName.trim() || !guestLastName.trim()}
              className="w-full mt-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all"
            >
              {creatingGuest ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              ) : null}
              Ajouter au match
            </button>
          </div>
        </div>
      ) : (
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          // onBlur supprimé pour éviter les fermetures intempestives sur mobile
          // La fermeture est gérée par le clickOutside
          onFocus={() => {
            if (value.trim()) {
              searchPlayers(value);
            } else if (searchResults.length > 0) {
              setShowDropdown(true);
            }
          }}
          placeholder={searchScope === 'global' ? "Rechercher dans tout PadelXP..." : "Rechercher dans mon club..."}
          className={`w-full rounded-md border bg-white px-4 py-3 text-sm text-[#071554] focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm ${inputClassName}`}
        />
      )}

      {error && error !== "Unauthorized" && (
        <div className="mt-1 text-xs text-red-400">{error}</div>
      )}

      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-80 overflow-y-auto">
          {!showCreateGuest ? (
            <>
              {searchResults.length > 0 ? (
                searchResults.map((player) => (
                  <button
                    key={`${player.type}-${player.id}`}
                    type="button"
                    onClick={() => handleSelectPlayer(player)}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{player.display_name}</span>
                      <span className="flex items-center gap-2 text-xs">
                        {player.type === "user" ? (
                          player.is_external ? (
                            <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                              <span className="truncate max-w-[100px]">{player.club_name || "Autre club"}</span>
                            </span>
                          ) : (
                            <span className="text-gray-500">Inscrit</span>
                          )
                        ) : (
                          <span className="text-gray-400 italic">Invité</span>
                        )}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500 italic text-center">
                  Aucun joueur trouvé
                </div>
              )}

              {/* Option "Inviter un nouveau joueur" supprimée à la demande (Step 1239) */}

            </>
          ) : (
            <div className="p-4 bg-gray-50">
              <div className="mb-3 flex justify-between items-center">
                <h4 className="text-sm font-semibold text-gray-700">Inviter un nouveau joueur</h4>
                <button
                  onClick={() => setShowCreateGuest(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Annuler
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={guestFirstName}
                    onChange={(e) => setGuestFirstName(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900"
                    placeholder="Prénom"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nom</label>
                  <input
                    type="text"
                    value={guestLastName}
                    onChange={(e) => setGuestLastName(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900"
                    placeholder="Nom"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email <span className="text-gray-400 font-normal">(Optionnel, pour invitation)</span></label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900"
                    placeholder="email@exemple.com"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCreateGuest}
                  disabled={creatingGuest || !guestFirstName.trim() || !guestLastName.trim()}
                  className="w-full mt-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                >
                  {creatingGuest ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  ) : null}
                  Créer et ajouter
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const GUEST_USER_ID = GUEST_UUID;

