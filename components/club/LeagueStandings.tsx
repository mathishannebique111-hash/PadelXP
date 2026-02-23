"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Trophy, Clock, Users, User } from "lucide-react";

interface Standing {
    rank: number;
    player_id: string;
    display_name: string;
    matches_played: number;
    points: number;
    is_current_user: boolean;
}

interface LeagueDetails {
    id: string;
    name: string;
    max_matches_per_player: number;
    max_players: number;
    remaining_days: number;
    is_expired: boolean;
    status: string;
}

export default function LeagueStandings({ leagueId, onBack }: { leagueId: string; onBack: () => void }) {
    const [league, setLeague] = useState<LeagueDetails | null>(null);
    const [standings, setStandings] = useState<Standing[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStandings = async () => {
            try {
                const res = await fetch(`/api/leagues/${leagueId}`, { credentials: "include" });
                const data = await res.json();
                if (res.ok) {
                    setLeague(data.league);
                    setStandings(data.standings || []);
                }
            } catch (e) {
                console.error("Erreur chargement classement:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchStandings();
    }, [leagueId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-white/20 border-t-padel-green rounded-full animate-spin" />
            </div>
        );
    }

    if (!league) {
        return (
            <div className="text-center py-12">
                <p className="text-white/40">Ligue introuvable</p>
                <button onClick={onBack} className="mt-4 text-padel-green font-bold text-sm underline">Retour</button>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="p-2 rounded-full bg-white/10 text-white active:scale-95 transition-transform"
                >
                    <ArrowLeft size={18} />
                </button>
                <div className="flex-1">
                    <h2 className="text-lg font-black text-white truncate">{league.name}</h2>
                    <div className="flex items-center gap-3 text-xs text-white/50 mt-0.5">
                        <span className="flex items-center gap-1">
                            <Users size={12} />
                            {standings.length}/{league.max_players}
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {league.status === 'pending' ? (
                                <span className="text-amber-400 font-bold">En attente</span>
                            ) : league.is_expired ? (
                                <span className="text-red-400 font-bold">Terminée</span>
                            ) : (
                                <span>{league.remaining_days}j restants</span>
                            )}
                        </span>
                    </div>
                </div>
            </div>

            {/* Podium des 3 premiers (si au moins 3 joueurs) */}
            {standings.length >= 3 && (
                <div className="flex items-end justify-center gap-2 pt-4 pb-2">
                    {/* 2ème */}
                    <div className="flex flex-col items-center w-24">
                        <div className="w-12 h-12 rounded-full bg-slate-400/20 border-2 border-slate-400 flex items-center justify-center mb-1">
                            <User size={20} className="text-slate-400" />
                        </div>
                        <div className="text-[10px] font-bold text-slate-400">2ème</div>
                        <div className="text-xs font-bold text-white truncate w-full text-center">{standings[1].display_name}</div>
                        <div className="text-[10px] font-bold text-padel-green">{standings[1].points} pts</div>
                    </div>
                    {/* 1er */}
                    <div className="flex flex-col items-center w-28 -mt-4">
                        <Trophy size={16} className="text-amber-400 mb-1" />
                        <div className="w-14 h-14 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center mb-1">
                            <User size={24} className="text-amber-400" />
                        </div>
                        <div className="text-[10px] font-black text-amber-400">1er</div>
                        <div className="text-sm font-black text-white truncate w-full text-center">{standings[0].display_name}</div>
                        <div className="text-xs font-bold text-padel-green">{standings[0].points} pts</div>
                    </div>
                    {/* 3ème */}
                    <div className="flex flex-col items-center w-24">
                        <div className="w-12 h-12 rounded-full bg-amber-700/20 border-2 border-amber-700 flex items-center justify-center mb-1">
                            <User size={20} className="text-amber-700" />
                        </div>
                        <div className="text-[10px] font-bold text-amber-700">3ème</div>
                        <div className="text-xs font-bold text-white truncate w-full text-center">{standings[2].display_name}</div>
                        <div className="text-[10px] font-bold text-padel-green">{standings[2].points} pts</div>
                    </div>
                </div>
            )}

            {/* Tableau complet */}
            <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                {/* Header du tableau */}
                <div className="grid grid-cols-[40px_1fr_80px_60px] px-3 py-2 border-b border-white/10 text-[9px] font-bold text-white/30 uppercase tracking-widest">
                    <div className="text-center">#</div>
                    <div>Joueur</div>
                    <div className="text-center">Matchs</div>
                    <div className="text-right">Pts</div>
                </div>

                {/* Lignes */}
                {standings.map((player) => (
                    <div
                        key={player.player_id}
                        className={`grid grid-cols-[40px_1fr_80px_60px] px-3 py-2.5 border-b border-white/5 items-center ${player.is_current_user ? "bg-padel-green/10" : ""
                            }`}
                    >
                        {/* Rang */}
                        <div className="text-center">
                            {player.rank <= 3 ? (
                                <span className={`text-sm font-black ${player.rank === 1 ? "text-amber-400" :
                                    player.rank === 2 ? "text-slate-400" :
                                        "text-amber-700"
                                    }`}>{player.rank}</span>
                            ) : (
                                <span className="text-xs text-white/40 font-bold">{player.rank}</span>
                            )}
                        </div>

                        {/* Nom */}
                        <div className="flex items-center gap-2">
                            <span className={`text-sm truncate ${player.is_current_user ? "font-black text-white" : "font-medium text-white/80"}`}>
                                {player.display_name}
                            </span>
                            {player.is_current_user && (
                                <span className="text-[8px] bg-padel-green px-1 rounded-full font-black text-[#071554]">MOI</span>
                            )}
                        </div>

                        {/* Jauge de matchs */}
                        <div className="flex flex-col items-center gap-0.5">
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-300 ${player.matches_played >= league.max_matches_per_player
                                        ? "bg-amber-400"
                                        : "bg-padel-green"
                                        }`}
                                    style={{ width: `${Math.min(100, (player.matches_played / league.max_matches_per_player) * 100)}%` }}
                                />
                            </div>
                            <span className="text-[9px] text-white/30 font-medium">
                                {player.matches_played}/{league.max_matches_per_player}
                            </span>
                        </div>

                        {/* Points */}
                        <div className="text-right">
                            <span className="text-sm font-black text-white">{player.points}</span>
                        </div>
                    </div>
                ))}

                {standings.length === 0 && (
                    <div className="py-8 text-center text-white/30 text-sm">
                        Aucun joueur inscrit
                    </div>
                )}
            </div>

            {/* Légende */}
            <div className="flex items-center justify-center gap-4 text-[10px] text-white/30">
                <span>🏆 Victoire = 3 pts</span>
                <span>• Défaite = 1 pt</span>
            </div>
        </div>
    );
}
