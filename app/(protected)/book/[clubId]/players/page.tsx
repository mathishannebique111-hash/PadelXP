"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ChevronLeft, Search, UserPlus, Check, X } from "lucide-react";
import Link from "next/link";

interface Player {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    display_name: string;
    type: "user";
}

export default function SelectPlayersPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const clubId = (params?.clubId as string) || "";
    const supabase = createClientComponentClient();

    const courtId = searchParams?.get("court_id") || "";
    const courtName = searchParams?.get("court_name") || "";
    const startTime = searchParams?.get("start_time") || "";
    const endTime = searchParams?.get("end_time") || "";

    const [currentUser, setCurrentUser] = useState<Player | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchScope, setSearchScope] = useState<"club" | "global">("club");
    const [searchResults, setSearchResults] = useState<Player[]>([]);
    const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
    const [searching, setSearching] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Charger l'utilisateur courant
    useEffect(() => {
        async function loadCurrentUser() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("id, first_name, last_name, avatar_url")
                    .eq("id", user.id)
                    .single();

                if (profile) {
                    setCurrentUser({
                        id: profile.id,
                        first_name: profile.first_name || "",
                        last_name: profile.last_name || "",
                        avatar_url: profile.avatar_url,
                        display_name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim(),
                        type: "user"
                    });
                }
            }
        }

        loadCurrentUser();
    }, [supabase]);

    // Recherche de joueurs
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length < 2) {
                setSearchResults([]);
                return;
            }

            setSearching(true);
            try {
                const response = await fetch(
                    `/api/players/search?q=${encodeURIComponent(searchQuery)}&scope=${searchScope}`
                );
                const data = await response.json();

                // Filtrer les joueurs déjà sélectionnés et l'utilisateur courant
                const excludeIds = [
                    currentUser?.id,
                    ...selectedPlayers.map(p => p.id)
                ].filter(Boolean);

                const filtered = (data.results || []).filter(
                    (p: Player) => !excludeIds.includes(p.id) && p.type === "user"
                );

                setSearchResults(filtered);
            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, searchScope, currentUser?.id, selectedPlayers]);

    const addPlayer = (player: Player) => {
        if (selectedPlayers.length >= 3) return;
        setSelectedPlayers([...selectedPlayers, player]);
        setSearchQuery("");
        setSearchResults([]);
    };

    const removePlayer = (playerId: string) => {
        setSelectedPlayers(selectedPlayers.filter(p => p.id !== playerId));
    };

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
        });
    };

    const handleConfirm = async () => {
        if (selectedPlayers.length !== 3) return;

        setSubmitting(true);
        try {
            const response = await fetch("/api/reservations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    court_id: courtId,
                    start_time: startTime,
                    end_time: endTime,
                    participant_ids: selectedPlayers.map(p => p.id),
                    total_price: 0, // À définir plus tard
                    payment_method: "on_site" // Pour l'instant, paiement sur place
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Erreur lors de la réservation");
            }

            // Rediriger vers la page de confirmation
            router.push(`/book/${clubId}/success?reservation_id=${data.reservation.id}`);
        } catch (error) {
            console.error("Reservation error:", error);
            alert(error instanceof Error ? error.message : "Erreur lors de la réservation");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 pb-24">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-white/10">
                <div className="flex items-center gap-3 px-4 py-3">
                    <button onClick={() => router.back()} className="p-2 -ml-2">
                        <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-white">Choisir les joueurs</h1>
                        <p className="text-sm text-white/60">
                            {courtName} • {formatDate(startTime)} à {formatTime(startTime)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-6">
                {/* Joueurs sélectionnés (4 slots) */}
                <section>
                    <h2 className="text-sm font-medium text-white/80 mb-3">
                        Équipe ({selectedPlayers.length + 1}/4)
                    </h2>
                    <div className="space-y-2">
                        {/* Utilisateur courant (slot 1) */}
                        {currentUser && (
                            <div className="flex items-center gap-3 p-3 bg-blue-600/20 border border-blue-500/30 rounded-lg">
                                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                                    {currentUser.first_name?.[0] || "?"}
                                </div>
                                <div className="flex-1">
                                    <p className="text-white font-medium">{currentUser.display_name}</p>
                                    <p className="text-xs text-blue-400">Vous (Organisateur)</p>
                                </div>
                                <Check className="w-5 h-5 text-blue-400" />
                            </div>
                        )}

                        {/* Joueurs sélectionnés (slots 2-4) */}
                        {selectedPlayers.map((player) => (
                            <div key={player.id} className="flex items-center gap-3 p-3 bg-white/10 rounded-lg">
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold">
                                    {player.first_name?.[0] || "?"}
                                </div>
                                <div className="flex-1">
                                    <p className="text-white font-medium">{player.display_name}</p>
                                </div>
                                <button
                                    onClick={() => removePlayer(player.id)}
                                    className="p-2 text-red-400 hover:bg-red-500/20 rounded-full"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}

                        {/* Slots vides */}
                        {Array.from({ length: 3 - selectedPlayers.length }).map((_, i) => (
                            <div
                                key={`empty-${i}`}
                                className="flex items-center gap-3 p-3 border border-dashed border-white/20 rounded-lg"
                            >
                                <div className="w-10 h-10 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center">
                                    <UserPlus className="w-5 h-5 text-white/30" />
                                </div>
                                <p className="text-white/40">Ajouter un joueur...</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Recherche de joueurs */}
                {selectedPlayers.length < 3 && (
                    <section>
                        <h2 className="text-sm font-medium text-white/80 mb-3">Rechercher un joueur</h2>

                        {/* Toggle Club/Global */}
                        <div className="flex gap-2 mb-3">
                            <button
                                onClick={() => setSearchScope("club")}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${searchScope === "club"
                                    ? "bg-blue-600 text-white"
                                    : "bg-white/10 text-white/70"
                                    }`}
                            >
                                Mon club
                            </button>
                            <button
                                onClick={() => setSearchScope("global")}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${searchScope === "global"
                                    ? "bg-blue-600 text-white"
                                    : "bg-white/10 text-white/70"
                                    }`}
                            >
                                Tous les joueurs
                            </button>
                        </div>

                        {/* Barre de recherche */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Nom du joueur..."
                                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Résultats de recherche */}
                        {searching && (
                            <div className="mt-3 text-white/60 text-center">Recherche...</div>
                        )}

                        {searchResults.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {searchResults.map((player) => (
                                    <button
                                        key={player.id}
                                        onClick={() => addPlayer(player)}
                                        className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold">
                                            {player.first_name?.[0] || "?"}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="text-white font-medium">{player.display_name}</p>
                                        </div>
                                        <UserPlus className="w-5 h-5 text-blue-400" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </div>

            {/* Footer */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-white/10">
                <button
                    onClick={handleConfirm}
                    disabled={selectedPlayers.length !== 3 || submitting}
                    className={`w-full py-4 rounded-xl font-semibold text-lg transition-colors ${selectedPlayers.length === 3 && !submitting
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-white/10 text-white/40 cursor-not-allowed"
                        }`}
                >
                    {submitting ? "Réservation en cours..." : "Confirmer la réservation"}
                </button>
            </div>
        </div>
    );
}
