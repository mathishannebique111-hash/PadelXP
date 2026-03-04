'use client';

import { useEffect, useState } from 'react';
import { Trophy, MapPin, Users, Clock } from 'lucide-react';

interface Match {
    id: string;
    playedAt: string;
    clubName: string;
    score: string;
    winnerTeamId: string;
    team1_id: string;
    team2_id: string;
    participants: Array<{
        name: string;
        team: number;
    }>;
}

export default function TodayMatchesList() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchMatches() {
            try {
                const response = await fetch('/api/admin/matches/today');
                if (response.ok) {
                    const data = await response.json();
                    setMatches(data);
                }
            } catch (error) {
                console.error('Error fetching today matches:', error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchMatches();
    }, []);

    if (isLoading) {
        return (
            <div className="mt-8 space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-slate-800/50 rounded-xl border border-white/5 animate-pulse"></div>
                ))}
            </div>
        );
    }

    if (matches.length === 0) {
        return (
            <div className="mt-8 p-12 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/5 text-center">
                <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Aucun match n'a été enregistré aujourd'hui.</p>
            </div>
        );
    }

    return (
        <div className="mt-8 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-1 h-6 rounded-full" style={{ backgroundColor: 'rgb(var(--theme-secondary-accent))' }}></span>
                Matchs d'aujourd'hui
            </h2>

            <div className="grid grid-cols-1 gap-4">
                {matches.map((match) => {
                    const team1 = match.participants.filter(p => p.team === 1);
                    const team2 = match.participants.filter(p => p.team === 2);
                    const winnerTeam = match.winnerTeamId === match.team1_id ? 1 : 2;

                    return (
                        <div
                            key={match.id}
                            className="group bg-slate-900/60 backdrop-blur-md rounded-xl border border-white/5 p-5 transition-all"
                            style={{ borderColor: 'rgba(var(--theme-secondary-accent, 204, 255, 0), 0.1)' }}
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                {/* Infos Match */}
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-4 text-xs text-slate-400">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" />
                                            {new Date(match.playedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {match.clubName}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 sm:gap-8">
                                        {/* Équipe 1 */}
                                        <div
                                            className={`flex-1 flex flex-col items-center p-3 rounded-lg border ${winnerTeam === 1 ? 'border-transparent' : 'bg-slate-800/30 border-white/5'}`}
                                            style={winnerTeam === 1 ? { backgroundColor: 'rgba(var(--theme-secondary-accent, 204, 255, 0), 0.1)', borderColor: 'rgba(var(--theme-secondary-accent, 204, 255, 0), 0.3)' } : {}}
                                        >
                                            <span className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-bold">Équipe 1</span>
                                            <div className="flex flex-col items-center gap-1 text-center">
                                                {team1.map((p, idx) => (
                                                    <span
                                                        key={idx}
                                                        className={`text-sm font-semibold ${winnerTeam === 1 ? '' : 'text-white'}`}
                                                        style={winnerTeam === 1 ? { color: 'rgb(var(--theme-secondary-accent))' } : {}}
                                                    >
                                                        {p.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* VS & Score */}
                                        <div className="flex flex-col items-center justify-center gap-2 px-2">
                                            <span className="text-xs font-black text-slate-600 italic">VS</span>
                                            <div className="bg-slate-800 px-3 py-1 rounded text-lg font-mono font-bold text-white border border-white/5">
                                                {match.score}
                                            </div>
                                        </div>

                                        {/* Équipe 2 */}
                                        <div
                                            className={`flex-1 flex flex-col items-center p-3 rounded-lg border ${winnerTeam === 2 ? 'border-transparent' : 'bg-slate-800/30 border-white/5'}`}
                                            style={winnerTeam === 2 ? { backgroundColor: 'rgba(var(--theme-secondary-accent, 204, 255, 0), 0.1)', borderColor: 'rgba(var(--theme-secondary-accent, 204, 255, 0), 0.3)' } : {}}
                                        >
                                            <span className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-bold">Équipe 2</span>
                                            <div className="flex flex-col items-center gap-1 text-center">
                                                {team2.map((p, idx) => (
                                                    <span
                                                        key={idx}
                                                        className={`text-sm font-semibold ${winnerTeam === 2 ? '' : 'text-white'}`}
                                                        style={winnerTeam === 2 ? { color: 'rgb(var(--theme-secondary-accent))' } : {}}
                                                    >
                                                        {p.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Badge Vainqueur */}
                                <div className="flex flex-col items-center md:items-end md:pl-6 md:border-l md:border-white/5">
                                    <span className="text-[10px] text-slate-500 uppercase font-black mb-1">Gagnant</span>
                                    <div
                                        className="flex items-center gap-2 px-3 py-1 rounded-full font-bold text-xs"
                                        style={{ backgroundColor: 'rgb(var(--theme-secondary-accent))', color: 'var(--theme-player-page, #0f172a)' }}
                                    >
                                        <Trophy className="w-3 h-3" />
                                        Équipe {winnerTeam}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
