'use client';

import { useState, useEffect } from 'react';
import { Building2, Check, X, Users, Calendar, Loader2, RefreshCw } from 'lucide-react';

interface StoppedClub {
    id: string;
    name: string;
    slug: string;
    trialEndDate: string;
    daysSinceExpiration: number;
    subscriptionStatus: string | null;
    totalPlayers: number;
    survey: {
        yesCount: number;
        noCount: number;
        totalResponses: number;
    };
}

export default function StoppedClubsPage() {
    const [clubs, setClubs] = useState<StoppedClub[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchClubs = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/admin/stopped-clubs');
            if (!res.ok) {
                throw new Error('Erreur lors du chargement');
            }
            const data = await res.json();
            setClubs(data.clubs || []);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchClubs();
    }, []);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Building2 className="w-7 h-7 text-orange-400" />
                        Arrêt clubs
                    </h1>
                    <p className="text-white/60 mt-1">
                        Clubs dont la période de grâce est terminée sans abonnement
                    </p>
                </div>

                <button
                    onClick={fetchClubs}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Rafraîchir
                </button>
            </div>

            {/* Stats globales */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-white/60 text-sm">Clubs en arrêt</p>
                    <p className="text-3xl font-bold text-white">{clubs.length}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-white/60 text-sm">Réponses "Oui"</p>
                    <p className="text-3xl font-bold text-emerald-400">
                        {clubs.reduce((sum, c) => sum + c.survey.yesCount, 0)}
                    </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-white/60 text-sm">Réponses "Non"</p>
                    <p className="text-3xl font-bold text-rose-400">
                        {clubs.reduce((sum, c) => sum + c.survey.noCount, 0)}
                    </p>
                </div>
            </div>

            {/* Loading state */}
            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
                </div>
            )}

            {/* Error state */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300">
                    {error}
                </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && clubs.length === 0 && (
                <div className="text-center py-12">
                    <Building2 className="w-12 h-12 text-white/30 mx-auto mb-4" />
                    <p className="text-white/60">Aucun club en arrêt pour le moment</p>
                    <p className="text-white/40 text-sm mt-1">
                        Les clubs apparaîtront ici 7 jours après l'expiration de leur essai s'ils n'ont pas souscrit
                    </p>
                </div>
            )}

            {/* Clubs list */}
            {!isLoading && !error && clubs.length > 0 && (
                <div className="space-y-4">
                    {clubs.map((club) => (
                        <div
                            key={club.id}
                            className="bg-gradient-to-r from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-5"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                {/* Club info */}
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-white">{club.name}</h3>
                                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-white/60">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            Fin essai: {formatDate(club.trialEndDate)}
                                        </span>
                                        <span className="text-orange-400">
                                            ({club.daysSinceExpiration} jours)
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Users className="w-4 h-4" />
                                            {club.totalPlayers} joueur{club.totalPlayers > 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>

                                {/* Survey stats */}
                                <div className="flex items-center gap-6">
                                    {/* Yes count */}
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                            <Check className="w-5 h-5 text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-emerald-400">{club.survey.yesCount}</p>
                                            <p className="text-xs text-white/40">Oui</p>
                                        </div>
                                    </div>

                                    {/* No count */}
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                                            <X className="w-5 h-5 text-rose-400" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-rose-400">{club.survey.noCount}</p>
                                            <p className="text-xs text-white/40">Non</p>
                                        </div>
                                    </div>

                                    {/* Response rate */}
                                    <div className="hidden sm:block pl-4 border-l border-white/10">
                                        <p className="text-sm text-white/60">
                                            {club.survey.totalResponses}/{club.totalPlayers}
                                        </p>
                                        <p className="text-xs text-white/40">réponses</p>
                                    </div>
                                </div>
                            </div>

                            {/* Progress bar showing survey participation */}
                            {club.totalPlayers > 0 && (
                                <div className="mt-4">
                                    <div className="flex items-center justify-between text-xs text-white/40 mb-1">
                                        <span>Participation au sondage</span>
                                        <span>{Math.round((club.survey.totalResponses / club.totalPlayers) * 100)}%</span>
                                    </div>
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full flex">
                                            {/* Yes portion */}
                                            <div
                                                className="bg-emerald-500 transition-all"
                                                style={{
                                                    width: `${(club.survey.yesCount / club.totalPlayers) * 100}%`,
                                                }}
                                            />
                                            {/* No portion */}
                                            <div
                                                className="bg-rose-500 transition-all"
                                                style={{
                                                    width: `${(club.survey.noCount / club.totalPlayers) * 100}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
