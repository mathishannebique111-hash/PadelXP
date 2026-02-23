"use client";

import { useState, useEffect } from "react";
import { Plus, Users, Clock, Copy, Check, Trophy, ArrowLeft, KeyRound } from "lucide-react";
import { toast } from "sonner";
import LeagueStandings from "./LeagueStandings";
import JoinLeagueModal from "./JoinLeagueModal";

interface League {
    id: string;
    name: string;
    invite_code: string;
    max_matches_per_player: number;
    max_players: number;
    duration_weeks: number;
    starts_at: string;
    ends_at: string;
    status: string;
    created_by: string;
    player_count: number;
    is_creator: boolean;
    my_matches_played: number;
    my_points: number;
}

// Placeholder "Coming Soon" pour les non-beta
function ComingSoonPlaceholder() {
    return (
        <div className="min-h-[40vh] flex items-center justify-center p-4">
            <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-[#0a0f2c] shadow-2xl ring-1 ring-white/10">
                <div className="p-8 md:p-12 lg:p-16 flex flex-col items-center text-center relative overflow-hidden">
                    <div className="absolute top-0 left-1/2 w-64 h-64 bg-green-500/10 blur-[100px] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none" />
                    <div className="relative inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[10px] md:text-xs font-bold tracking-widest uppercase text-white shadow-inner mb-6 md:mb-8 backdrop-blur-sm">
                        <span className="text-gray-400">LIGUES</span>
                        <span className="text-[#BFFF00]">ARRIVE BIENTÔT</span>
                    </div>
                    <h1 className="relative text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-[1.1] mb-6 md:mb-8">
                        Créez vos ligues <span className="text-[#BFFF00]">entre amis</span>
                    </h1>
                    <div className="relative space-y-4 md:space-y-6 flex flex-col items-center">
                        <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-lg">
                            Bientôt, les membres premium pourront créer des ligues privées pour se défier entre amis. Invitez vos partenaires, jouez vos matchs et découvrez qui est vraiment le meilleur grâce à un classement dédié et automatisé.
                        </p>
                        <ul className="space-y-3 md:space-y-4 text-sm md:text-base text-gray-300 text-left">
                            <li className="flex items-start gap-3">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#BFFF00] flex-shrink-0 shadow-[0_0_8px_#BFFF00]" />
                                <span>Création de ligues privées entre amis</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#BFFF00] flex-shrink-0 shadow-[0_0_8px_#BFFF00]" />
                                <span>Classement automatisé et historique des matchs</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#BFFF00] flex-shrink-0 shadow-[0_0_8px_#BFFF00]" />
                                <span>Voir qui est le meilleur joueur de votre groupe</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function TournamentsContent({ isBetaUser = false }: { isBetaUser?: boolean }) {
    const [leagues, setLeagues] = useState<League[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    // Form states
    const [formName, setFormName] = useState("");
    const [formDuration, setFormDuration] = useState(4);
    const [formMaxMatches, setFormMaxMatches] = useState(10);
    const [formMaxPlayers, setFormMaxPlayers] = useState(8);
    const [creating, setCreating] = useState(false);

    // Si pas beta, afficher le placeholder
    if (!isBetaUser) {
        return <ComingSoonPlaceholder />;
    }

    const fetchLeagues = async () => {
        try {
            const res = await fetch("/api/leagues/my-leagues", { credentials: "include" });
            const data = await res.json();
            setLeagues(data.leagues || []);
        } catch (e) {
            console.error("Erreur chargement ligues:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeagues();
    }, []);

    const handleCreate = async () => {
        if (!formName.trim()) {
            toast.error("Le nom de la ligue est requis");
            return;
        }
        setCreating(true);
        try {
            const res = await fetch("/api/leagues/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    name: formName.trim(),
                    duration_weeks: formDuration,
                    max_matches_per_player: formMaxMatches,
                    max_players: formMaxPlayers,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Erreur");
                return;
            }
            toast.success(`Ligue "${data.league.name}" créée !`);
            // Afficher le code dans un toast persistant
            toast.info(`Code d'invitation : ${data.invite_code}`, { duration: 10000 });
            setShowCreateForm(false);
            setFormName("");
            fetchLeagues();
        } catch (e) {
            toast.error("Erreur lors de la création");
        } finally {
            setCreating(false);
        }
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        toast.success("Code copié !");
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const getRemainingDays = (endsAt: string) => {
        const now = new Date();
        const end = new Date(endsAt);
        const diff = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        return diff;
    };

    // Si on a sélectionné une ligue, afficher le classement
    if (selectedLeagueId) {
        return (
            <LeagueStandings
                leagueId={selectedLeagueId}
                onBack={() => setSelectedLeagueId(null)}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Boutons d'action */}
            <div className="flex gap-3">
                <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-bold text-sm shadow-lg active:scale-[0.98] transition-transform"
                >
                    <Plus size={18} />
                    Créer une ligue
                </button>
                <button
                    onClick={() => setShowJoinModal(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-sm active:scale-[0.98] transition-transform"
                >
                    <KeyRound size={18} />
                    Rejoindre
                </button>
            </div>

            {/* Formulaire de création inline */}
            {showCreateForm && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <h3 className="text-base font-bold text-white">Nouvelle ligue privée</h3>

                    <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1 ml-1">Nom de la ligue *</label>
                        <input
                            type="text"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            placeholder="Les Champions du Dimanche"
                            className="w-full h-11 rounded-xl bg-white/10 border border-white/20 px-4 text-white text-sm font-medium placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-padel-green/50"
                            maxLength={40}
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1 ml-1">Durée</label>
                            <select
                                value={formDuration}
                                onChange={(e) => setFormDuration(Number(e.target.value))}
                                className="w-full h-11 rounded-xl bg-white/10 border border-white/20 px-2 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-padel-green/50"
                            >
                                <option value={2}>2 sem.</option>
                                <option value={3}>3 sem.</option>
                                <option value={4}>4 sem.</option>
                                <option value={5}>5 sem.</option>
                                <option value={6}>6 sem.</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1 ml-1">Matchs</label>
                            <select
                                value={formMaxMatches}
                                onChange={(e) => setFormMaxMatches(Number(e.target.value))}
                                className="w-full h-11 rounded-xl bg-white/10 border border-white/20 px-2 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-padel-green/50"
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={15}>15</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1 ml-1">Joueurs</label>
                            <select
                                value={formMaxPlayers}
                                onChange={(e) => setFormMaxPlayers(Number(e.target.value))}
                                className="w-full h-11 rounded-xl bg-white/10 border border-white/20 px-2 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-padel-green/50"
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 4).map(n => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={handleCreate}
                        disabled={creating || !formName.trim()}
                        className="w-full py-3 rounded-xl bg-padel-green text-[#071554] font-black text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
                    >
                        {creating ? "Création..." : "Créer ma ligue privée"}
                    </button>
                </div>
            )}

            {/* Liste des ligues */}
            <div className="space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-6 h-6 border-2 border-white/20 border-t-padel-green rounded-full animate-spin" />
                    </div>
                ) : leagues.length === 0 ? (
                    <div className="text-center py-12">
                        <Trophy className="w-12 h-12 text-white/20 mx-auto mb-3" />
                        <p className="text-white/40 text-sm font-medium">Aucune ligue pour le moment</p>
                        <p className="text-white/20 text-xs mt-1">Créez votre première ligue ou rejoignez-en une !</p>
                    </div>
                ) : (
                    <>
                        <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest ml-1">Mes ligues</h3>
                        {leagues.map((league) => {
                            const remainingDays = getRemainingDays(league.ends_at);
                            const isExpired = remainingDays === 0;

                            return (
                                <div
                                    key={league.id}
                                    className="rounded-xl border border-white/10 bg-white/5 p-4 active:bg-white/10 transition-colors"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <button
                                            onClick={() => setSelectedLeagueId(league.id)}
                                            className="text-left flex-1"
                                        >
                                            <h4 className="text-base font-bold text-white truncate">{league.name}</h4>
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); copyCode(league.invite_code); }}
                                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 text-xs font-bold text-white/70 hover:text-white transition-colors"
                                        >
                                            {copiedCode === league.invite_code ? <Check size={14} className="text-padel-green" /> : <Copy size={14} />}
                                            <span className="font-mono tracking-wider">{league.invite_code}</span>
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => setSelectedLeagueId(league.id)}
                                        className="w-full text-left"
                                    >
                                        <div className="flex items-center gap-4 text-xs text-white/50">
                                            <span className="flex items-center gap-1">
                                                <Users size={12} />
                                                {league.player_count}/{league.max_players}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} />
                                                {isExpired ? (
                                                    <span className="text-red-400">Terminée</span>
                                                ) : (
                                                    <span>{remainingDays}j restants</span>
                                                )}
                                            </span>
                                            <span className="ml-auto text-white/30">
                                                {league.my_matches_played}/{league.max_matches_per_player} matchs
                                            </span>
                                        </div>

                                        {/* Mini jauge de progression */}
                                        <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-padel-green rounded-full transition-all duration-300"
                                                style={{ width: `${Math.min(100, (league.my_matches_played / league.max_matches_per_player) * 100)}%` }}
                                            />
                                        </div>
                                    </button>
                                </div>
                            );
                        })}
                    </>
                )}
            </div>

            {/* Modal rejoindre */}
            {showJoinModal && (
                <JoinLeagueModal
                    onClose={() => setShowJoinModal(false)}
                    onJoined={() => {
                        setShowJoinModal(false);
                        fetchLeagues();
                    }}
                />
            )}
        </div>
    );
}
