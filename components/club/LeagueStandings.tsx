"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Trophy, Clock, Users, User, Info, X } from "lucide-react";

interface Standing {
    rank: number;
    player_id: string;
    display_name: string;
    matches_played: number;
    points: number;
    division?: number;
    global_rank?: number | null;
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
    format: string;
    current_phase?: number;
    phase_ends_at?: string;
}

export default function LeagueStandings({ leagueId, onBack }: { leagueId: string; onBack: () => void }) {
    const [league, setLeague] = useState<LeagueDetails | null>(null);
    const [standings, setStandings] = useState<Standing[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPhase, setSelectedPhase] = useState<number | null>(null);
    const [showInfoPopup, setShowInfoPopup] = useState(false);

    useEffect(() => {
        const fetchStandings = async () => {
            setLoading(true);
            try {
                const url = selectedPhase !== null
                    ? `/api/leagues/${leagueId}/history?phase=${selectedPhase}`
                    : `/api/leagues/${leagueId}`;

                const res = await fetch(url, { credentials: "include" });
                const data = await res.json();

                if (res.ok) {
                    if (selectedPhase === null) {
                        setLeague(data.league);
                    }
                    setStandings(data.standings || []);
                }
            } catch (e) {
                console.error("Erreur chargement classement:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchStandings();
    }, [leagueId, selectedPhase]);

    const getPhaseRemainingDays = (endsAt?: string) => {
        if (!endsAt) return null;
        const now = new Date();
        const end = new Date(endsAt);
        const diff = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        return diff;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div
                    className="w-6 h-6 border-2 border-white/20 rounded-full animate-spin"
                    style={{ borderTopColor: 'rgb(var(--theme-secondary-accent))' }}
                />
            </div>
        );
    }

    if (!league) {
        return (
            <div className="text-center py-12">
                <p className="text-white/40">Ligue introuvable</p>
                <button
                    onClick={onBack}
                    className="mt-4 font-bold text-sm underline transition-colors"
                    style={{ color: 'rgb(var(--theme-secondary-accent))' }}
                >
                    Retour
                </button>
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
                                <span>{league.remaining_days}j restants (total)</span>
                            )}
                        </span>
                    </div>
                </div>
            </div>

            {/* Bouton Info Format */}
            <button
                onClick={() => setShowInfoPopup(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold text-sm active:scale-[0.98] transition-transform"
            >
                <Info size={16} />
                À lire avant le début de la Ligue
            </button>

            {/* Infos de phase et sélecteur d'historique (Format Divisions uniquement) */}
            {league.format === "divisions" && league.current_phase !== undefined && (
                <div className="flex flex-col gap-3 py-2">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-white">
                                {selectedPhase === null
                                    ? (league.current_phase === 0 ? "Phase de Placement" : `Phase ${league.current_phase}`)
                                    : (selectedPhase === 0 ? "Phase de Placement (Terminée)" : `Phase ${selectedPhase} (Terminée)`)
                                }
                            </span>
                            {selectedPhase === null && league.phase_ends_at && (
                                <span className="text-xs font-medium" style={{ color: 'rgb(var(--theme-secondary-accent))' }}>
                                    {getPhaseRemainingDays(league.phase_ends_at)}j restants pour cette phase
                                </span>
                            )}
                        </div>

                        {league.current_phase > 0 && (
                            <select
                                value={selectedPhase === null ? "" : selectedPhase}
                                onChange={(e) => setSelectedPhase(e.target.value === "" ? null : Number(e.target.value))}
                                className="bg-white/10 border border-white/20 text-white text-xs rounded-lg px-2 py-1.5 font-medium focus:outline-none focus:ring-1 transition-all"
                                style={{ focusRingColor: 'rgb(var(--theme-secondary-accent))' } as any}
                            >
                                <option value="">Phase Actuelle</option>
                                <option value={0}>Historique : Phase 0 (Placement)</option>
                                {Array.from({ length: league.current_phase }).map((_, i) => {
                                    if (i > 0) return <option key={i} value={i}>Historique : Phase {i}</option>;
                                    return null;
                                })}
                            </select>
                        )}
                    </div>
                </div>
            )}

            {/* Podium des 3 premiers (Uniquement pour le classement standard ou la Division 1) */}
            {standings.length >= 3 && (league.format !== "divisions" || !standings[0].division || standings[0].division === 1) && (
                <div className="flex items-end justify-center gap-2 pt-4 pb-2">
                    {/* 2ème */}
                    <div className="flex flex-col items-center w-24">
                        <div className="w-12 h-12 rounded-full bg-slate-400/20 border-2 border-slate-400 flex items-center justify-center mb-1">
                            <User size={20} className="text-slate-400" />
                        </div>
                        <div className="text-[10px] font-bold text-slate-400">2ème</div>
                        <div className="text-xs font-bold text-white truncate w-full text-center">{standings[1].display_name}</div>
                        <div className="text-[10px] font-bold" style={{ color: 'rgb(var(--theme-secondary-accent))' }}>{standings[1].points} pts</div>
                    </div>
                    {/* 1er */}
                    <div className="flex flex-col items-center w-28 -mt-4">
                        <Trophy size={16} className="text-amber-400 mb-1" />
                        <div className="w-14 h-14 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center mb-1">
                            <User size={24} className="text-amber-400" />
                        </div>
                        <div className="text-[10px] font-black text-amber-400">1er</div>
                        <div className="text-sm font-black text-white truncate w-full text-center">{standings[0].display_name}</div>
                        <div className="text-xs font-bold" style={{ color: 'rgb(var(--theme-secondary-accent))' }}>{standings[0].points} pts</div>
                    </div>
                    {/* 3ème */}
                    <div className="flex flex-col items-center w-24">
                        <div className="w-12 h-12 rounded-full bg-amber-700/20 border-2 border-amber-700 flex items-center justify-center mb-1">
                            <User size={20} className="text-amber-700" />
                        </div>
                        <div className="text-[10px] font-bold text-amber-700">3ème</div>
                        <div className="text-xs font-bold text-white truncate w-full text-center">{standings[2].display_name}</div>
                        <div className="text-[10px] font-bold" style={{ color: 'rgb(var(--theme-secondary-accent))' }}>{standings[2].points} pts</div>
                    </div>
                </div>
            )}

            {/* Tableaux (Standard ou par Divisions) */}
            {league.format === "divisions" && standings.some(s => s.division) ? (
                <div className="space-y-6">
                    {Object.entries(
                        standings.reduce((acc, player) => {
                            const div = player.division || 1;
                            if (!acc[div]) acc[div] = [];
                            acc[div].push(player);
                            return acc;
                        }, {} as Record<number, Standing[]>)
                    ).map(([div, players]) => (
                        <div key={div} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                            <div className="bg-white/5 px-3 py-2 flex items-center gap-2 border-b border-white/10">
                                <span className="bg-blue-500 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
                                    {(selectedPhase !== null && selectedPhase !== undefined ? selectedPhase : (league.current_phase || 0)) === 0 ? 'Poule' : 'Division'} {div}
                                </span>
                            </div>

                            <div className="grid grid-cols-[40px_1fr_80px_60px] px-3 py-2 border-b border-white/10 text-[9px] font-bold text-white/30 uppercase tracking-widest">
                                <div className="text-center">#</div>
                                <div>Joueur</div>
                                <div className="text-center">Matchs</div>
                                <div className="text-right">Pts</div>
                            </div>

                            {players.map((player, index) => {
                                const isTop2 = index < 2;
                                const isBottom2 = index >= players.length - 2 && players.length >= 4;
                                const rankDisplay = index + 1;

                                return (
                                    <div
                                        key={player.player_id}
                                        className="relative grid grid-cols-[40px_1fr_80px_60px] px-3 py-2.5 border-b border-white/5 items-center"
                                        style={player.is_current_user ? { backgroundColor: 'rgba(var(--theme-secondary-accent, 204, 255, 0), 0.1)' } : {}}
                                    >
                                        {/* Rang */}
                                        <div className="text-center">
                                            <span className={`text-sm font-bold ${rankDisplay === 1 ? "text-amber-400" : rankDisplay === 2 ? "text-slate-400" : "text-white/40"}`}>{rankDisplay}</span>
                                        </div>

                                        {/* Nom */}
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm truncate ${player.is_current_user ? "font-black text-white" : "font-medium text-white/80"}`}>
                                                {player.display_name}
                                            </span>
                                            {player.is_current_user && (
                                                <span className="text-[8px] px-1 rounded-full font-black" style={{ backgroundColor: 'rgb(var(--theme-secondary-accent))', color: 'var(--theme-player-page, #071554)' }}>MOI</span>
                                            )}
                                        </div>

                                        {/* Jauge de matchs */}
                                        <div className="flex flex-col items-center gap-0.5">
                                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-300 ${player.matches_played >= league.max_matches_per_player ? "bg-amber-400" : ""}`}
                                                    style={player.matches_played < league.max_matches_per_player ? { backgroundColor: 'rgb(var(--theme-secondary-accent))' } : {}}
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
                                )
                            })}
                        </div>
                    ))}

                    {/* Classement Global Provisoire (Phase 0 uniquement) */}
                    {league.format === "divisions" && (selectedPhase !== null && selectedPhase !== undefined ? selectedPhase : (league.current_phase || 0)) === 0 && standings.some(s => s.global_rank) && (
                        <div className="mt-8">
                            <h3 className="text-white font-black px-1 mb-3">Classement Global Provisoire</h3>
                            <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                                <div className="grid grid-cols-[40px_1fr_80px_60px] px-3 py-2 border-b border-white/10 text-[9px] font-bold text-white/30 uppercase tracking-widest bg-white/5">
                                    <div className="text-center">Rang</div>
                                    <div>Joueur</div>
                                    <div className="text-center">Division</div>
                                    <div className="text-right">Pts</div>
                                </div>

                                {standings
                                    .filter(p => p.global_rank !== null && p.global_rank !== undefined)
                                    .sort((a, b) => (a.global_rank as number) - (b.global_rank as number))
                                    .map((player) => {
                                        const globalRank = player.global_rank as number;
                                        const projectedDivision = Math.floor((globalRank - 1) / 4) + 1;

                                        return (
                                            <div
                                                key={player.player_id}
                                                className="relative grid grid-cols-[40px_1fr_80px_60px] px-3 py-2.5 border-b border-white/5 items-center"
                                                style={player.is_current_user ? { backgroundColor: 'rgba(var(--theme-secondary-accent, 204, 255, 0), 0.1)' } : {}}
                                            >
                                                {/* Rang Global */}
                                                <div className="text-center">
                                                    <span className={`text-sm font-bold ${globalRank === 1 ? "text-amber-400" :
                                                        globalRank === 2 ? "text-slate-300" :
                                                            globalRank === 3 ? "text-amber-700" :
                                                                "text-white/40"}`}>{globalRank}</span>
                                                </div>

                                                {/* Nom */}
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm truncate ${player.is_current_user ? "font-black text-white" : "font-medium text-white/80"}`}>
                                                        {player.display_name}
                                                    </span>
                                                </div>

                                                {/* Division Projetée */}
                                                <div className="text-center font-black">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-widest ${projectedDivision === 1 ? "bg-amber-400 text-black" :
                                                        projectedDivision === 2 ? "bg-slate-300 text-black" :
                                                            projectedDivision === 3 ? "bg-amber-700 text-white" :
                                                                "bg-white/10 text-white"
                                                        }`}>
                                                        Div {projectedDivision}
                                                    </span>
                                                </div>

                                                {/* Points */}
                                                <div className="text-right">
                                                    <span className="text-sm font-black text-white">{player.points}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
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
                            className="grid grid-cols-[40px_1fr_80px_60px] px-3 py-2.5 border-b border-white/5 items-center"
                            style={player.is_current_user ? { backgroundColor: 'rgba(var(--theme-secondary-accent, 204, 255, 0), 0.1)' } : {}}
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
                                    <span className="text-[8px] px-1 rounded-full font-black" style={{ backgroundColor: 'rgb(var(--theme-secondary-accent))', color: 'var(--theme-player-page, #071554)' }}>MOI</span>
                                )}
                            </div>

                            {/* Jauge de matchs */}
                            <div className="flex flex-col items-center gap-0.5">
                                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-300 ${player.matches_played >= league.max_matches_per_player
                                            ? "bg-amber-400"
                                            : ""
                                            }`}
                                        style={player.matches_played < league.max_matches_per_player ? { backgroundColor: 'rgb(var(--theme-secondary-accent))', width: `${Math.min(100, (player.matches_played / league.max_matches_per_player) * 100)}%` } : { width: `${Math.min(100, (player.matches_played / league.max_matches_per_player) * 100)}%` }}
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
            )}

            {/* Légende */}
            <div className="flex items-center justify-center gap-4 text-[10px] text-white/30">
                <span>🏆 Victoire = 3 pts</span>
                <span>• Défaite = 1 pt</span>
            </div>

            {/* Modal d'informations */}
            {showInfoPopup && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[110] flex flex-col items-center justify-end md:justify-center bg-[#071554]/80 backdrop-blur-sm p-4 pb-24 md:pb-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-lg bg-[#0a1536] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-0 md:zoom-in-95 duration-300 max-h-[80vh]">
                        {/* Header */}
                        <div className="relative p-6 text-center border-b border-white/5 shrink-0 bg-[#07102e]">
                            <button
                                onClick={() => setShowInfoPopup(false)}
                                className="absolute right-4 top-4 p-2 rounded-full bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <h3 className="text-xl font-black text-white">Règles de la Ligue</h3>
                            <p className="text-sm font-medium mt-1" style={{ color: 'rgb(var(--theme-secondary-accent))' }}>
                                {league.format === "divisions" ? "Format Montées/Descentes" : "Format Championnat"}
                            </p>
                        </div>

                        {/* Contenu */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            {league.format === "divisions" ? (
                                <>
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5 p-1.5 rounded-full shrink-0" style={{ backgroundColor: 'rgba(var(--theme-secondary-accent, 204, 255, 0), 0.2)', color: 'rgb(var(--theme-secondary-accent))' }}>
                                                <Trophy size={16} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-white mb-1">Objectif</h4>
                                                <p className="text-xs text-white/70 leading-relaxed mb-2">
                                                    Atteignez la Division 1 ! La compétition se déroule en plusieurs <strong>phases de 2 semaines</strong> chacune.
                                                </p>
                                                <ul className="text-xs text-white/70 space-y-2 ml-1">
                                                    <li>• <strong className="text-white">Phase de Placement (Initial)</strong> : Les joueurs ou équipes sont répartis aléatoirement dans des poules. À l'issue de cette phase, le classement global détermine votre division de départ.</li>
                                                    <li>• <strong className="text-white">Phases Régulières</strong> : Le <strong>1er</strong> de chaque division monte dans la division supérieure. Le <strong>dernier</strong> descend dans la division inférieure. Les autres se maintiennent.</li>
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5 p-1.5 rounded-full shrink-0" style={{ backgroundColor: 'rgba(var(--theme-secondary-accent, 204, 255, 0), 0.2)', color: 'rgb(var(--theme-secondary-accent))' }}>
                                                <Users size={16} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-white mb-1">Comment jouer ?</h4>
                                                <p className="text-xs text-white/70 leading-relaxed">
                                                    Pour qu'un match compte pour la ligue, <strong>tous les joueurs doivent faire partie de la même poule ou division</strong>. Vous pouvez jouer jusqu'à {league.max_matches_per_player} matchs par phase.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5 p-1.5 rounded-full shrink-0" style={{ backgroundColor: 'rgba(var(--theme-secondary-accent, 204, 255, 0), 0.2)', color: 'rgb(var(--theme-secondary-accent))' }}>
                                                <Info size={16} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-white mb-1">Attribution des Points</h4>
                                                <p className="text-xs text-white/70 leading-relaxed mb-2">
                                                    Ce format récompense la diversité ! Tournez avec vos partenaires pour maximiser vos points. S'il y a égalité de points entre deux joueurs, ils sont départagés par leur nombre de points global (Expérience PadelXP).
                                                </p>
                                                <ul className="text-xs text-white/60 space-y-1 ml-2 border-l-2 border-white/10 pl-2">
                                                    <li><span className="text-white font-bold">3 pts</span> : Première victoire de la phase avec un partenaire donné.</li>
                                                    <li><span className="text-white font-bold">2 pts</span> : Victoires suivantes avec le même partenaire.</li>
                                                    <li><span className="text-white font-bold">1 pt</span> : Défaite (aucun point au-delà du quota de matchs).</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3">
                                            <div
                                                className="mt-0.5 p-1.5 rounded-full shrink-0"
                                                style={{ backgroundColor: 'rgba(var(--theme-secondary-accent, 204, 255, 0), 0.2)', color: 'rgb(var(--theme-secondary-accent))' }}
                                            >
                                                <Trophy size={16} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-white mb-1">Objectif</h4>
                                                <p className="text-xs text-white/70 leading-relaxed">
                                                    Terminez à la 1ère place du classement général à la fin de la période ({league.remaining_days} jours restants). Le joueur avec le plus de points remporte la ligue.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5 p-1.5 rounded-full shrink-0" style={{ backgroundColor: 'rgba(var(--theme-secondary-accent, 204, 255, 0), 0.2)', color: 'rgb(var(--theme-secondary-accent))' }}>
                                                <Users size={16} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-white mb-1">Comment jouer ?</h4>
                                                <p className="text-xs text-white/70 leading-relaxed">
                                                    Organisez vos matchs avec n'importe quel autre membre de la ligue. Pour qu'un match comptabilise des points, <strong>tous les participants</strong> au match doivent être inscrits à la ligue. Vous pouvez jouer un maximum de {league.max_matches_per_player} matchs au total.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5 p-1.5 rounded-full shrink-0" style={{ backgroundColor: 'rgba(var(--theme-secondary-accent, 204, 255, 0), 0.2)', color: 'rgb(var(--theme-secondary-accent))' }}>
                                                <Info size={16} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-white mb-1">Attribution des Points</h4>
                                                <ul className="text-xs text-white/70 space-y-1 ml-2 border-l-2 border-white/10 pl-2">
                                                    <li><span className="text-white font-bold">3 pts</span> : Victoire.</li>
                                                    <li><span className="text-white font-bold">1 pt</span> : Défaite.</li>
                                                    <li><span className="text-white/40">0 pt après avoir atteint votre quota de matchs.</span></li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-white/5 bg-[#07102e] shrink-0">
                            <button
                                onClick={() => setShowInfoPopup(false)}
                                className="w-full py-3 rounded-xl font-black text-sm active:scale-[0.98] transition-transform"
                                style={{ 
                                    backgroundColor: 'rgb(var(--theme-secondary-accent))', 
                                    color: 'var(--theme-secondary-accent-contrast, var(--theme-player-page, #071554))' 
                                }}
                            >
                                J'ai compris
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
