"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Eye } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

interface SuggestedPlayer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url?: string | null;
  niveau_padel?: number | null;
  niveau_categorie?: string | null;
  compatibilityScore: number | null;
  compatibilityTags: string[];
}

export default function PartnerSuggestions() {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<SuggestedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    try {
      setError(null);
      // Ne mettre loading que si on n'a pas encore de données
      setLoading((prev) => {
        if (prev === false && suggestions.length === 0) {
          return true;
        }
        return prev;
      });

      // Utiliser stale-while-revalidate pour un chargement instantané
      const response = await fetch(
        `/api/partners/suggestions`,
        {
          method: "GET",
          credentials: "include",
          // Cache avec stale-while-revalidate pour un chargement quasi-instantané
          headers: {
            "Cache-Control": "max-age=10, stale-while-revalidate=60",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          setError("Vous devez être connecté");
          setSuggestions([]);
          return;
        }
        throw new Error(`Erreur ${response.status}`);
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      console.error("[PartnerSuggestions] Erreur:", err);
      setError("Erreur lors du chargement des suggestions");
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [suggestions.length]);

  // Charger les suggestions au montage
  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  // Recharger automatiquement quand un match est soumis ou qu'un questionnaire est complété
  useEffect(() => {
    if (typeof window === "undefined") return;

    let timeoutId1: NodeJS.Timeout;
    let timeoutId2: NodeJS.Timeout;

    const handleMatchSubmitted = () => {
      // Délai réduit pour une mise à jour plus rapide
      timeoutId1 = setTimeout(() => {
        fetchSuggestions();
      }, 1000);
    };

    const handleQuestionnaireCompleted = () => {
      // Délai réduit pour une mise à jour plus rapide
      timeoutId2 = setTimeout(() => {
        fetchSuggestions();
      }, 1000);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "matchSubmitted" && e.newValue === "true") {
        handleMatchSubmitted();
      }
      if (e.key === "questionnaireCompleted" && e.newValue === "true") {
        handleQuestionnaireCompleted();
      }
    };

    window.addEventListener("matchSubmitted", handleMatchSubmitted);
    window.addEventListener("questionnaireCompleted", handleQuestionnaireCompleted);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("matchSubmitted", handleMatchSubmitted);
      window.removeEventListener("questionnaireCompleted", handleQuestionnaireCompleted);
      window.removeEventListener("storage", handleStorageChange);
      if (timeoutId1) clearTimeout(timeoutId1);
      if (timeoutId2) clearTimeout(timeoutId2);
    };
  }, [fetchSuggestions]);

  // Polling périodique réduit - les événements prennent le relais pour les mises à jour immédiates
  // On utilise stale-while-revalidate donc le cache permet un chargement instantané
  useEffect(() => {
    const interval = setInterval(() => {
      // Recharger seulement si pas en cours de chargement
      setLoading((currentLoading) => {
        if (!currentLoading) {
          fetchSuggestions();
        }
        return currentLoading;
      });
    }, 120000); // 2 minutes - les événements gèrent les mises à jour immédiates

    return () => clearInterval(interval);
  }, [fetchSuggestions]);

  if (loading && suggestions.length === 0) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/20">
        <div className="mb-4">
          <h3 className="text-base md:text-lg font-bold text-white">
            Partenaires suggérés
          </h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          <span className="ml-2 text-sm text-gray-400">
            Chargement...
          </span>
        </div>
      </div>
    );
  }

  if (error && suggestions.length === 0) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/20">
        <div className="text-center py-4">
          <p className="text-sm text-red-400 mb-2">{error}</p>
          <button
            type="button"
            onClick={fetchSuggestions}
            className="text-xs text-blue-400 active:text-blue-300"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/20">
        <h3 className="text-base md:text-lg font-bold text-white mb-2">
          Partenaires suggérés
        </h3>
        <p className="text-xs md:text-sm text-gray-400">
          Aucun partenaire suggéré pour le moment.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/20">
      <div className="mb-4">
        <h3 className="text-base md:text-lg font-bold text-white">
          Partenaires suggérés
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {suggestions.map((player, index) => {
          const playerName =
            player.first_name && player.last_name
              ? `${player.first_name} ${player.last_name}`
              : player.display_name || "Joueur";

          const initials =
            player.first_name && player.last_name
              ? `${player.first_name[0]}${player.last_name[0]}`
              : player.display_name?.[0]?.toUpperCase() || "J";

          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-slate-800/50 rounded-xl p-3 md:p-4 border border-white/10"
            >
              <div className="flex items-center gap-3 mb-3">
                {player.avatar_url ? (
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 border-2 border-white/20">
                    <Image
                      src={player.avatar_url}
                      alt={playerName}
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-lg md:text-xl flex-shrink-0 border-2 border-white/20">
                    {initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate text-sm md:text-base">
                    {playerName}
                  </p>
                  {player.niveau_padel && (
                    <p className="text-xs text-gray-400">
                      Niveau {player.niveau_padel.toFixed(1)}/10
                    </p>
                  )}
                  {player.compatibilityScore !== null && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="h-1.5 flex-1 bg-slate-700 rounded-full overflow-hidden max-w-[80px]">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                          style={{
                            width: `${player.compatibilityScore}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-green-400 font-semibold">
                        {player.compatibilityScore}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags de compatibilité */}
              {player.compatibilityTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {player.compatibilityTags.slice(0, 2).map((tag, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-300 rounded-full font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => router.push(`/players/${player.id}`)}
                  className="flex-1 py-2 px-3 border border-white/20 text-gray-300 rounded-lg text-xs md:text-sm font-medium flex items-center justify-center gap-1 active:bg-slate-700/50 min-h-[44px]"
                >
                  <Eye size={14} />
                  <span className="hidden sm:inline">Profil</span>
                </button>
                <button
                  type="button"
                  className="flex-1 py-2 px-3 bg-blue-500 text-white rounded-lg text-xs md:text-sm font-medium flex items-center justify-center gap-1 active:bg-blue-600 min-h-[44px]"
                >
                  <MessageCircle size={14} />
                  <span>Inviter</span>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
