"use client";

import { useState } from "react";
import { Clock, FileText, Trophy, Check } from "lucide-react";

interface Participant {
    user_id: string;
    team: number;
    display_name: string;
    has_confirmed: boolean;
    is_current_user?: boolean;
}

interface PendingMatch {
    id: string;
    winner_team_id: string;
    team1_id: string;
    team2_id: string;
    score_team1: number;
    score_team2: number;
    created_at: string;
    participants: Participant[];
    creator_name: string;
    creator_id: string;
    current_user_confirmed: boolean;
    confirmation_count: number;
    confirmations_needed: number;
}

interface PendingMatchCardProps {
    match: PendingMatch;
    onConfirmed?: () => void;
}

export default function PendingMatchCard({ match, onConfirmed }: PendingMatchCardProps) {
    const [isConfirming, setIsConfirming] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const team1 = match.participants.filter(p => p.team === 1);
    const team2 = match.participants.filter(p => p.team === 2);
    const winnerTeam = match.winner_team_id === match.team1_id ? 1 : 2;

    const matchDate = new Date(match.created_at);
    const dateStr = matchDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    const timeStr = matchDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

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

    // Calculer le nombre de confirmations effectif (incluant la confirmation locale si applicable)
    const effectiveConfirmationCount = confirmed ? match.confirmation_count + 1 : match.confirmation_count;
    const isUserConfirmed = confirmed || match.current_user_confirmed;

    return (
        <div className={`rounded-2xl border-2 p-4 sm:p-6 ${isUserConfirmed ? 'border-blue-400 bg-blue-50' : 'border-amber-400 bg-amber-50'}`}>
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`flex-shrink-0 rounded-full p-2 ${isUserConfirmed ? 'bg-blue-100' : 'bg-amber-100'}`}>
                        {isUserConfirmed ? (
                            <Clock className={`h-5 w-5 ${isUserConfirmed ? 'text-blue-600' : 'text-amber-600'}`} />
                        ) : (
                            <FileText className="h-5 w-5 text-amber-600" />
                        )}
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-gray-900">
                            Match enregistré par {match.creator_name}
                        </div>
                        <div className="text-xs text-gray-600">
                            {dateStr} à {timeStr}
                        </div>
                    </div>
                </div>
                <div className="rounded-lg bg-white px-4 py-2 text-base font-bold text-gray-900 tabular-nums">
                    {match.score_team1}-{match.score_team2}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
                {/* Équipe 1 */}
                <div className={`rounded-lg border p-4 ${winnerTeam === 1 ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
                    <div className="mb-3 text-xs font-normal uppercase tracking-wide text-gray-600 flex items-center gap-1.5">
                        Équipe 1 {winnerTeam === 1 && <Trophy className="h-4 w-4 text-amber-500" />}
                    </div>
                    <div className="divide-y divide-gray-100">
                        {team1.map((p) => (
                            <div key={p.user_id} className="flex items-center gap-2 py-1.5">
                                <span className="text-sm text-gray-900">{p.display_name}</span>
                                {(p.has_confirmed || (p.is_current_user && confirmed)) && (
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#22c55e] shadow-sm">
                                        <Check className="h-4 w-4 text-white" strokeWidth={3} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Équipe 2 */}
                <div className={`rounded-lg border p-4 ${winnerTeam === 2 ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
                    <div className="mb-3 text-xs font-normal uppercase tracking-wide text-gray-600 flex items-center gap-1.5">
                        Équipe 2 {winnerTeam === 2 && <Trophy className="h-4 w-4 text-amber-500" />}
                    </div>
                    <div className="divide-y divide-gray-100">
                        {team2.map((p) => (
                            <div key={p.user_id} className="flex items-center gap-2 py-1.5">
                                <span className="text-sm text-gray-900">{p.display_name}</span>
                                {(p.has_confirmed || (p.is_current_user && confirmed)) && (
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#22c55e] shadow-sm">
                                        <Check className="h-4 w-4 text-white" strokeWidth={3} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="flex items-center justify-between">
                <div className="text-xs text-gray-600">
                    {effectiveConfirmationCount}/3 confirmations
                </div>
                {isUserConfirmed ? (
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-2 rounded-lg bg-[#22c55e] px-6 py-3 text-sm font-semibold text-white">
                            Confirmé <Check className="h-4 w-4" strokeWidth={3} />
                        </span>
                    </div>
                ) : (
                    <button
                        onClick={handleConfirm}
                        disabled={isConfirming}
                        className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isConfirming ? "Confirmation..." : "Confirmer le match"}
                    </button>
                )}
            </div>

            {isUserConfirmed && (
                <div className="mt-3 text-xs text-blue-600 text-center">
                    En attente des autres joueurs...
                </div>
            )}
        </div>
    );
}
