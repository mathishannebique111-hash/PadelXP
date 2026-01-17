"use client";

import { useState, useEffect, useRef } from "react";
import type { PlayerSearchResult } from "@/lib/utils/player-utils";
import { logger } from '@/lib/logger';

interface PlayerAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (player: PlayerSearchResult | null) => void;
  error?: string;
  placeholder?: string;
  label?: string;
}

const GUEST_UUID = "00000000-0000-0000-0000-000000000000";

export default function PlayerAutocomplete({
  value,
  onChange,
  onSelect,
  error,
  placeholder = "Rechercher un joueur...",
  label,
}: PlayerAutocompleteProps) {
  const [searchResults, setSearchResults] = useState<PlayerSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateGuest, setShowCreateGuest] = useState(false);
  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestLastName, setGuestLastName] = useState("");
  const [creatingGuest, setCreatingGuest] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setShowCreateGuest(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectPlayer = (player: PlayerSearchResult) => {
    const displayName = player.display_name.replace(" 👤", "");
    onChange(displayName);
    onSelect(player);
    setShowDropdown(false);
    setSearchResults([]);
  };

  const searchPlayers = async (query: string) => {
    // Rechercher dès qu'il y a au moins 1 caractère
    if (!query.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    try {
      // On les envoie quand même pour compatibilité, mais ils seront ignorés
      const params = new URLSearchParams({ q: query });
      logger.info("[PlayerAutocomplete] Searching for query:", query, "(club will be read from session server-side)");

      const response = await fetch(`/api/players/search?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        let errorData: any = {};
        let errorText = '';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
          } else {
            errorText = await response.text();
            errorData = { error: errorText || `Erreur ${response.status}` };
          }
        } catch (e) {
          errorData = { error: `Erreur ${response.status}` };
        }

        // Construire un message d'erreur détaillé
        const errorMessage = errorData?.message || errorData?.error || errorText || `Erreur ${response.status}`;

        // Si c'est une erreur 401, ne pas logger comme erreur - juste logger un avertissement et continuer
        // (peut être dû à une erreur temporaire d'authentification qui se résout automatiquement)
        if (response.status === 401) {
          logger.warn('[PlayerAutocomplete] Unauthorized access to search API - returning empty results (may be temporary)');
          setSearchResults([]);
          return;
        }

        // Pour les erreurs serveur (500+), logger avec tous les détails
        if (response.status >= 500) {
          logger.error('[PlayerAutocomplete] Server error in search API:', {
            status: response.status,
            message: errorMessage,
            details: errorData?.details,
            name: errorData?.name,
            stack: errorData?.stack
          });
        } else {
          // Pour les autres erreurs client (400-499), logger un avertissement
          logger.warn('[PlayerAutocomplete] Client error in search API:', {
            status: response.status,
            message: errorMessage,
            details: errorData?.details
          });
        }

        setSearchResults([]);
        return;
      }

      const responseData = await response.json();
      // L'API retourne { players: [...] }
      const data = responseData.players || responseData || [];
      const normalizedQuery = query.toLowerCase().trim();

      logger.info(`[PlayerAutocomplete] Received ${data.length} results for query "${query}" (club filtered server-side from session)`);

      // Si aucun résultat, ne rien faire
      if (!data || data.length === 0) {
        logger.info(`[PlayerAutocomplete] No results found for query "${query}"`);
        setSearchResults([]);
        return;
      }

      logger.info(`[PlayerAutocomplete] Setting ${data.length} search results:`, data.map((p: any) => p.display_name));
      setSearchResults(data);
      // Toujours afficher le dropdown s'il y a des résultats
      if (data.length > 0) {
        setShowDropdown(true);
      }
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
      // Utiliser find_or_create_player avec le nom complet
      const fullName = `${guestFirstName.trim()} ${guestLastName.trim()}`.trim();
      const response = await fetch("/api/players/find-or-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ playerName: fullName }),
      });

      if (response.ok) {
        const { player } = await response.json();

        if (!player) {
          alert("Impossible de trouver ou créer le joueur");
          return;
        }

        // Parser le display_name pour extraire first_name et last_name
        const nameParts = player.display_name.trim().split(/\s+/);
        const first_name = nameParts[0] || "";
        const last_name = nameParts.slice(1).join(" ") || "";

        // Déterminer le type
        const type: "user" | "guest" = player.email ? "user" : "guest";

        const playerResult: PlayerSearchResult = {
          id: player.id,
          first_name,
          last_name,
          type,
          display_name: type === "guest" ? `${player.display_name} 👤` : player.display_name,
        };

        handleSelectPlayer(playerResult);
        setShowCreateGuest(false);
        setGuestFirstName("");
        setGuestLastName("");
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
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onFocus={() => {
          // Toujours rechercher au focus si on a une valeur
          if (value.trim()) {
            searchPlayers(value);
          }
          // Afficher le dropdown si on a déjà des résultats
          if (searchResults.length > 0) {
            setShowDropdown(true);
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-md border bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {error && error !== "Unauthorized" && (
        <div className="mt-1 text-xs text-red-400">{error}</div>
      )}

      {showDropdown && searchResults.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-60 overflow-y-auto">
          {searchResults.map((player) => (
            <button
              key={`${player.type}-${player.id}`}
              type="button"
              onClick={() => handleSelectPlayer(player)}
              className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{player.display_name}</span>
                <span className="text-xs text-gray-500">
                  {player.type === "user" ? "Inscrit" : "Invité"}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const GUEST_USER_ID = GUEST_UUID;

