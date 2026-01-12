"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Eye, Swords, TrendingUp, Users, User, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { showToast } from "@/components/ui/Toast";
import AddPhoneModal from "@/components/AddPhoneModal";

// Fonction pour calculer le temps restant avant expiration (48h)
const getTimeRemaining = (expiresAt: string, currentTime: Date): { hours: number; minutes: number; expired: boolean } | null => {
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - currentTime.getTime();

    if (diff <= 0) return { hours: 0, minutes: 0, expired: true };

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { hours, minutes, expired: false };
};

interface SuggestedPair {
    id: string;
    player1: {
        id: string;
        name: string;
        avatar_url: string | null;
    };
    player2: {
        id: string;
        name: string;
        avatar_url: string | null;
    };
    avgLevel: number;
    avgWinrate: number;
    compatibilityScore: number;
}

export default function SuggestedMatches() {
    const router = useRouter();
    const [suggestions, setSuggestions] = useState<SuggestedPair[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reason, setReason] = useState<string | null>(null);
    const [challenging, setChallenging] = useState<string | null>(null);
    const [showPhoneModal, setShowPhoneModal] = useState(false);
    const [pendingChallenge, setPendingChallenge] = useState<{ player1_id: string; player2_id: string } | null>(null);
    const [myPartner, setMyPartner] = useState<{ id: string; first_name: string | null } | null>(null);
    const [existingChallenges, setExistingChallenges] = useState<Map<string, { expires_at: string; status: string }>>(new Map());
    const [currentTime, setCurrentTime] = useState(new Date());
    const supabase = createClient();

    const fetchSuggestions = useCallback(async () => {
        try {
            setError(null);
            setLoading(true);

            const response = await fetch("/api/matches/suggestions", {
                method: "GET",
                credentials: "include",
            });

            if (!response.ok) {
                if (response.status === 401) {
                    setError("Vous devez être connecté");
                    return;
                }
                throw new Error(`Erreur ${response.status}`);
            }

            const data = await response.json();
            setSuggestions(data.suggestions || []);
            setReason(data.reason || null);
        } catch (err) {
            console.error("[SuggestedMatches] Erreur:", err);
            setError("Erreur lors du chargement des suggestions");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSuggestions();
        loadMyPartner();
    }, [fetchSuggestions]);

    // Charger les défis existants et mettre à jour le temps toutes les secondes
    useEffect(() => {
        const loadExistingChallenges = async () => {
            if (!myPartner) return;
            
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: challenges } = await supabase
                    .from("team_challenges")
                    .select("id, challenger_player_1_id, challenger_player_2_id, defender_player_1_id, defender_player_2_id, status, expires_at")
                    .or(`and(challenger_player_1_id.eq.${user.id},challenger_player_2_id.eq.${myPartner.id}),and(challenger_player_1_id.eq.${myPartner.id},challenger_player_2_id.eq.${user.id})`)
                    .in("status", ["pending", "accepted"]);

                if (challenges) {
                    const challengesMap = new Map();
                    challenges.forEach((challenge) => {
                        // Créer une clé unique pour identifier la paire défendue
                        const defenderKey = `${challenge.defender_player_1_id}-${challenge.defender_player_2_id}`;
                        challengesMap.set(defenderKey, {
                            expires_at: challenge.expires_at,
                            status: challenge.status
                        });
                    });
                    setExistingChallenges(challengesMap);
                }
            } catch (error) {
                console.error("[SuggestedMatches] Erreur chargement défis existants", error);
            }
        };

        loadExistingChallenges();

        // Écouter les événements de création/mise à jour de défi
        const handleChallengeEvent = () => {
            loadExistingChallenges();
        };
        window.addEventListener("teamChallengeCreated", handleChallengeEvent);
        window.addEventListener("teamChallengeUpdated", handleChallengeEvent);

        // Mettre à jour le temps toutes les secondes
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => {
            clearInterval(interval);
            window.removeEventListener("teamChallengeCreated", handleChallengeEvent);
            window.removeEventListener("teamChallengeUpdated", handleChallengeEvent);
        };
    }, [myPartner, supabase]);

    const loadMyPartner = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const response = await fetch("/api/partnerships/list");
            if (!response.ok) return;

            const { partnerships } = await response.json();
            const accepted = partnerships.find((p: any) => p.status === "accepted");
            
            if (accepted) {
                const partnerId = accepted.player_id === user.id ? accepted.partner_id : accepted.player_id;
                const { data: partnerProfile } = await supabase
                    .from("profiles")
                    .select("id, first_name")
                    .eq("id", partnerId)
                    .maybeSingle();
                
                if (partnerProfile) {
                    setMyPartner({ id: partnerProfile.id, first_name: partnerProfile.first_name });
                }
            }
        } catch (error) {
            console.error("[SuggestedMatches] Erreur chargement partenaire", error);
        }
    };

    const handleChallenge = async (defenderPair: { player1_id: string; player2_id: string }) => {
        try {
            setChallenging(`${defenderPair.player1_id}-${defenderPair.player2_id}`);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 2. Vérifier que j'ai un partenaire habituel
            if (!myPartner) {
                showToast("Vous devez avoir un partenaire habituel pour défier une paire", "error");
                setChallenging(null);
                return;
            }

            // 0. Vérifier si un défi existe déjà entre ces deux paires (dans les deux sens)
            // A. Vérifier si j'ai déjà envoyé un défi à cette paire
            const { data: existingChallenge, error: checkError } = await supabase
                .from("team_challenges")
                .select("id, status, created_at, expires_at")
                .eq("challenger_player_1_id", user.id)
                .eq("challenger_player_2_id", myPartner.id)
                .eq("defender_player_1_id", defenderPair.player1_id)
                .eq("defender_player_2_id", defenderPair.player2_id)
                .in("status", ["pending", "accepted"])
                .maybeSingle();

            if (checkError) {
                console.error("[SuggestedMatches] Erreur vérification défi existant", checkError);
            }

            if (existingChallenge) {
                showToast("Vous défiez déjà cette paire actuellement", "info");
                setChallenging(null);
                return;
            }

            // B. Vérifier si cette paire a déjà envoyé un défi à ma paire
            const { data: reverseChallenge, error: reverseCheckError } = await supabase
                .from("team_challenges")
                .select("id, status, created_at, expires_at")
                .eq("challenger_player_1_id", defenderPair.player1_id)
                .eq("challenger_player_2_id", defenderPair.player2_id)
                .eq("defender_player_1_id", user.id)
                .eq("defender_player_2_id", myPartner.id)
                .in("status", ["pending", "accepted"])
                .maybeSingle();

            if (reverseCheckError) {
                console.error("[SuggestedMatches] Erreur vérification défi inverse", reverseCheckError);
            }

            if (reverseChallenge) {
                showToast("Cette paire vous a déjà défié. Répondez à leur défi d'abord.", "info");
                setChallenging(null);
                return;
            }

            // 1. Vérifier que MOI j'ai renseigné mon numéro
            const { data: myProfile } = await supabase
                .from("profiles")
                .select("phone_number")
                .eq("id", user.id)
                .maybeSingle();

            if (!myProfile?.phone_number) {
                setPendingChallenge(defenderPair);
                setShowPhoneModal(true);
                setChallenging(null);
                return;
            }

            // 3. Créer le défi
            const { error: insertError } = await supabase
                .from("team_challenges")
                .insert({
                    challenger_player_1_id: user.id,
                    challenger_player_2_id: myPartner.id,
                    defender_player_1_id: defenderPair.player1_id,
                    defender_player_2_id: defenderPair.player2_id,
                    status: "pending",
                    defender_1_status: "pending",
                    defender_2_status: "pending",
                });

            if (insertError) {
                console.error("[SuggestedMatches] Erreur création défi", insertError);
                showToast("Erreur lors de l'envoi du défi", "error");
                setChallenging(null);
                return;
            }

            showToast("Défi lancé ! En attente de la réponse de vos adversaires.", "success");
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("teamChallengeCreated"));
            }
            setChallenging(null);
        } catch (error) {
            console.error("[SuggestedMatches] Erreur défi", error);
            showToast("Erreur lors de l'envoi du défi", "error");
            setChallenging(null);
        }
    };

    const handlePhoneModalActivated = async () => {
        if (!pendingChallenge) return;

        setShowPhoneModal(false);
        const challenge = pendingChallenge;
        setPendingChallenge(null);

        // Relancer le défi
        await handleChallenge(challenge);
    };

    if (loading && suggestions.length === 0) {
        return (
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/20">
                <div className="mb-4">
                    <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                        <Swords className="text-blue-400 w-5 h-5" />
                        Matchs suggérés
                    </h3>
                </div>
                <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    // Si l'utilisateur n'a pas de partenaire, on ne montre rien (le cadre est invisible)
    if (reason === "no_partner") return null;

    if (suggestions.length === 0) {
        return (
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/20">
                <h3 className="text-base md:text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <Swords className="text-blue-400 w-5 h-5" />
                    Matchs suggérés
                </h3>
                <p className="text-xs md:text-sm text-gray-400">
                    Aucun match correspondant à votre paire n'a été trouvé pour le moment.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/20">
                <div className="mb-4">
                    <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                        <Swords className="text-blue-400 w-5 h-5" />
                        Matchs suggérés
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {suggestions.map((pair, index) => (
                        <motion.div
                            key={pair.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl border border-white/10 overflow-hidden"
                        >
                            {/* Compteur 48h en haut à droite si défi existant */}
                            {(() => {
                                const challengeKey = `${pair.player1.id}-${pair.player2.id}`;
                                const challenge = existingChallenges.get(challengeKey);
                                if (challenge) {
                                    const timeRemaining = getTimeRemaining(challenge.expires_at, currentTime);
                                    if (timeRemaining && !timeRemaining.expired) {
                                        return (
                                            <div className="absolute top-3 right-3 bg-orange-500/20 border border-orange-500/30 rounded-lg px-2 py-1 z-20">
                                                <p className="text-[10px] text-orange-400 font-bold whitespace-nowrap">
                                                    {timeRemaining.hours}h {timeRemaining.minutes}m
                                                </p>
                                            </div>
                                        );
                                    }
                                }
                                return null;
                            })()}
                            
                            {/* Header de compatibilité */}
                            <div className={`absolute top-3 ${existingChallenges.has(`${pair.player1.id}-${pair.player2.id}`) ? 'right-20' : 'right-3'} z-10`}>
                                <div className="bg-emerald-500/20 backdrop-blur-md px-2 py-1 rounded-lg border border-emerald-500/30 flex flex-col items-center">
                                    <span className="text-[10px] text-emerald-400 font-bold leading-none">
                                        {pair.compatibilityScore}%
                                    </span>
                                    <span className="text-[8px] text-emerald-500/70 uppercase font-bold tracking-tighter">compatibilité</span>
                                </div>
                            </div>

                            <div className="p-4">
                                {/* Les deux joueurs l'un au dessus de l'autre */}
                                <div className="flex flex-col gap-3 mb-4">
                                    {[pair.player1, pair.player2].map((player, idx) => (
                                        <div key={player.id} className="flex flex-col gap-1">
                                            <div className="flex items-center gap-3">
                                                {/* La barre verticale */}
                                                <div className="w-1 h-8 rounded-full bg-slate-700/50 flex-shrink-0" />

                                                {/* L'icône ou l'avatar */}
                                                {player.avatar_url ? (
                                                    <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden border border-white/10 shadow-lg relative aspect-square flex-shrink-0">
                                                        <Image
                                                            src={player.avatar_url}
                                                            alt={player.name}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-blue-400/60 border border-white/10 shadow-lg flex-shrink-0">
                                                        <User size={16} />
                                                    </div>
                                                )}

                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-white truncate text-base leading-tight">
                                                        {player.name}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Stats de la paire */}
                                <div className="grid grid-cols-2 gap-2 py-3 border-t border-b border-white/5 mb-4">
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="flex items-center gap-1 text-gray-400 mb-0.5">
                                            <Users size={12} className="text-blue-400" />
                                            <span className="text-[10px] uppercase font-bold tracking-wider">Niveau moyen</span>
                                        </div>
                                        <span className="text-sm font-black text-white">
                                            {pair.avgLevel.toFixed(1)}/10
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center border-l border-white/5">
                                        <div className="flex items-center gap-1 text-gray-400 mb-0.5">
                                            <TrendingUp size={12} className="text-emerald-400" />
                                            <span className="text-[10px] uppercase font-bold tracking-wider">Victoires moy.</span>
                                        </div>
                                        <span className="text-sm font-black text-white">
                                            {pair.avgWinrate}%
                                        </span>
                                    </div>
                                </div>

                                {/* Action - Voir la paire / Défier */}
                                {(() => {
                                    const challengeKey = `${pair.player1.id}-${pair.player2.id}`;
                                    const hasExistingChallenge = existingChallenges.has(challengeKey);
                                    
                                    return (
                                        <button
                                            type="button"
                                            onClick={() => handleChallenge({ player1_id: pair.player1.id, player2_id: pair.player2.id })}
                                            disabled={challenging === `${pair.player1.id}-${pair.player2.id}` || !myPartner || hasExistingChallenge}
                                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {hasExistingChallenge ? (
                                                "DÉFI EN COURS"
                                            ) : challenging === `${pair.player1.id}-${pair.player2.id}` ? (
                                                <>
                                                    <Loader2 size={14} className="animate-spin" />
                                                    Envoi...
                                                </>
                                            ) : (
                                                <>
                                                    <Swords size={14} />
                                                    DÉFIER CETTE PAIRE
                                                </>
                                            )}
                                        </button>
                                    );
                                })()}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
            <AddPhoneModal
                isOpen={showPhoneModal}
                onClose={() => {
                    setShowPhoneModal(false);
                    setPendingChallenge(null);
                }}
                onActivated={handlePhoneModalActivated}
            />
        </>
    );
}
