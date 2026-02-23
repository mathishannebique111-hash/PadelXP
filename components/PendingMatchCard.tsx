"use client";

import { useState, useEffect } from "react";
import { Clock, FileText, Trophy, Check, MapPin, X } from "lucide-react";

interface Participant {
    user_id: string;
    team: number;
    display_name: string;
    club_name?: string;
    has_confirmed: boolean;
    has_refused?: boolean;
    is_current_user?: boolean;
}

interface PendingMatch {
    id: string;
    winner_team_id: string;
    team1_id: string;
    team2_id: string;
    score_team1: number;
    score_team2: number;
    score_details?: string;
    created_at: string;
    participants: Participant[];
    creator_name: string;
    creator_id: string;
    current_user_confirmed: boolean;
    confirmation_count: number;
    confirmations_needed: number;
    team1_confirmed: boolean;
    team2_confirmed: boolean;
    location_name?: string;
}

interface PendingMatchCardProps {
    match: PendingMatch;
    onConfirmed?: () => void;
}

export default function PendingMatchCard({ match, onConfirmed }: PendingMatchCardProps) {
    const [isConfirming, setIsConfirming] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isHiding, setIsHiding] = useState(false);

    const team1 = match.participants.filter(p => p.team === 1);
    const team2 = match.participants.filter(p => p.team === 2);
    const winnerTeam = match.winner_team_id === match.team1_id ? 1 : 2;

    const matchDate = new Date(match.created_at);
    const dateStr = isNaN(matchDate.getTime()) ? "" : matchDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    const timeStr = isNaN(matchDate.getTime()) ? "" : matchDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    const handleConfirm = async () => {
        setIsConfirming(true);
        setError(null);

        try {
            const res = await fetch("/api/matches/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ matchId: match.id }),
            });

            const data = await res.json();

            if (res.ok) {
                setConfirmed(true);
                // Ne pas appeler onConfirmed pour que la carte reste visible
                // Le refresh se fera quand le match sera complètement confirmé
            } else {
                setError(data.error || "Erreur lors de la confirmation");
            }
        } catch (err) {
            setError("Erreur de connexion");
        } finally {
            setIsConfirming(false);
        }
    };

    // Calculer le statut de confirmation par équipe
    const team1HasConfirmed = confirmed
        ? (match.team1_confirmed || team1.some(p => p.is_current_user))
        : match.team1_confirmed;
    const team2HasConfirmed = confirmed
        ? (match.team2_confirmed || team2.some(p => p.is_current_user))
        : match.team2_confirmed;
    const isUserConfirmed = confirmed || match.current_user_confirmed;
    const isFullyConfirmed = team1HasConfirmed && team2HasConfirmed;

    // Auto-hide et notification après confirmation complète
    useEffect(() => {
        // CORRECTION BOUCLE INFINIE : Ne lancer l'auto-hide et le refresh (dispatch event)
        // QUE si la confirmation vient d'être faite par l'utilisateur courant (confirmed = true).
        // Si le match arrive déjà fullyConfirmed de l'API (match "coincé" en état pending),
        // on ne doit SURTOUT PAS dispatch d'event, sinon ça lance une boucle de refresh infinie.
        if (isFullyConfirmed && !isHiding && confirmed) {
            const timer = setTimeout(() => {
                setIsHiding(true);
                // Dispatch custom event pour notifier les autres composants
                window.dispatchEvent(new CustomEvent('matchFullyConfirmed', {
                    detail: { matchId: match.id }
                }));
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isFullyConfirmed, isHiding, match.id, confirmed]);

    // Ne pas rendre si la carte est en train de disparaître (après l'animation)
    if (isHiding) {
        return (
            <div className="rounded-2xl border-2 border-green-500 bg-green-50 p-3 sm:p-4 opacity-0 scale-95 transition-all duration-500">
                {/* Contenu vide pendant le fade-out */}
            </div>
        );
    }

    return (
        <div
            className={`rounded-2xl border-2 p-3 sm:p-4 transition-all duration-500 ease-in-out ${isFullyConfirmed
                ? 'border-green-500 bg-green-50 shadow-[0_0_20px_rgba(34,197,94,0.3)] scale-[1.02]'
                : isUserConfirmed
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-amber-400 bg-amber-50'
                }`}
        >
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`flex-shrink-0 rounded-full p-1.5 ${isUserConfirmed ? 'bg-blue-100' : 'bg-amber-100'}`}>
                        {isFullyConfirmed ? (
                            <Check className="h-4 w-4 text-green-600 animate-pulse" />
                        ) : isUserConfirmed ? (
                            <Clock className="h-4 w-4 text-blue-600" />
                        ) : (
                            <FileText className="h-4 w-4 text-amber-600" />
                        )}
                    </div>
                    <div>
                        <div className="text-xs font-semibold text-gray-900">
                            Par {match.creator_name}
                        </div>
                        <div className="text-[10px] text-gray-600 flex items-center gap-1 mt-0.5">
                            <span>{dateStr} • {timeStr}</span>
                            {match.location_name && (
                                <>
                                    <span>•</span>
                                    <MapPin className="h-2.5 w-2.5 text-[#071554]/40" />
                                    <span className="truncate max-w-[100px]">{match.location_name}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="rounded-md bg-white px-2 py-1 text-sm font-bold text-gray-900 tabular-nums shadow-sm border border-gray-100">
                    {match.score_team1}-{match.score_team2}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
                {/* Équipe 1 */}
                <div className={`rounded-lg border p-2 transition-colors duration-300 ${winnerTeam === 1 ? 'border-green-300 bg-green-50/50' : 'border-gray-200 bg-white/80'}`}>
                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500 flex items-center gap-1">
                        Équipe 1 {winnerTeam === 1 && <Trophy className="h-3 w-3 text-amber-500" />}
                    </div>
                    <div className="space-y-1">
                        {team1.map((p) => (
                            <div key={p.user_id} className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-900 truncate max-w-[85%]">
                                    {p.display_name}
                                    {(p as any).club_name && <span className="text-gray-500 font-normal ml-1">({(p as any).club_name})</span>}
                                </span>
                                {(p.has_confirmed || (p.is_current_user && confirmed)) && (
                                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#22c55e]">
                                        <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                                    </div>
                                )}
                                {p.has_refused && (
                                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500">
                                        <X className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Équipe 2 */}
                <div className={`rounded-lg border p-2 transition-colors duration-300 ${winnerTeam === 2 ? 'border-green-300 bg-green-50/50' : 'border-gray-200 bg-white/80'}`}>
                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500 flex items-center gap-1">
                        Équipe 2 {winnerTeam === 2 && <Trophy className="h-3 w-3 text-amber-500" />}
                    </div>
                    <div className="space-y-1">
                        {team2.map((p) => (
                            <div key={p.user_id} className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-900 truncate max-w-[85%]">
                                    {p.display_name}
                                    {(p as any).club_name && <span className="text-gray-500 font-normal ml-1">({(p as any).club_name})</span>}
                                </span>
                                {(p.has_confirmed || (p.is_current_user && confirmed)) && (
                                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#22c55e]">
                                        <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                                    </div>
                                )}
                                {p.has_refused && (
                                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500">
                                        <X className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Affichage du score détaillé central */}
            {
                match.score_details && (
                    <div className="mb-3 flex justify-center">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#071554]/5 text-[#071554] border border-[#071554]/10 shadow-sm">
                            <span className="text-sm font-bold tabular-nums">
                                {match.score_details}
                            </span>
                        </div>
                    </div>
                )
            }

            {
                error && (
                    <div className="mb-3 rounded-md bg-red-100 p-2 text-xs text-red-700">
                        {error}
                    </div>
                )
            }

            <div className="flex items-center justify-between h-9">
                <div className="text-[10px] font-medium text-gray-500 bg-white/50 px-2 py-1 rounded-full flex items-center gap-1">
                    <span className={team1HasConfirmed ? "text-green-600" : "text-gray-400"}>Éq.1 {team1HasConfirmed ? "✓" : "✗"}</span>
                    <span className="text-gray-300">|</span>
                    <span className={team2HasConfirmed ? "text-green-600" : "text-gray-400"}>Éq.2 {team2HasConfirmed ? "✓" : "✗"}</span>
                </div>

                <div className="relative h-full flex items-center">
                    {isUserConfirmed ? (
                        <div className="flex items-center gap-1.5">
                            <span className="flex items-center gap-1.5 rounded-md bg-[#22c55e] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all duration-300 hover:scale-105">
                                Confirmé <Check className="h-3 w-3" strokeWidth={4} />
                            </span>
                        </div>
                    ) : (
                        <button
                            onClick={handleConfirm}
                            disabled={isConfirming}
                            className={`rounded-md bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 hover:shadow active:scale-95 disabled:cursor-not-allowed ${isConfirming ? 'scale-95 opacity-70' : ''
                                }`}
                        >
                            {isConfirming ? "Confirmation..." : "Confirmer"}
                        </button>
                    )}
                </div>
            </div>

            {
                isUserConfirmed && !isFullyConfirmed && (
                    <div className="mt-2 text-[10px] text-blue-600 text-center font-medium animate-pulse">
                        En attente des autres joueurs...
                    </div>
                )
            }
        </div >
    );
}
