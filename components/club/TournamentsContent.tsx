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
    my_matches_played?: number;
    my_points?: number;
    format: string;
    is_public: boolean;
}


export default function TournamentsContent({ clubId }: { clubId?: string | null }) {
    const [leagues, setLeagues] = useState<League[]>([]);
    const [clubLeagues, setClubLeagues] = useState<League[]>([]);
    const [loading, setLoading] = useState(true);
    const [clubLoading, setClubLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"my" | "club">("my");
    const isClub = typeof document !== 'undefined' && !!document.body.dataset.clubSubdomain;
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    // Form states
    const [formName, setFormName] = useState("");
    const [formDuration, setFormDuration] = useState(4);
    const [formMaxMatches, setFormMaxMatches] = useState(10);
    const [formMaxPlayers, setFormMaxPlayers] = useState(8);
    const [formFormat, setFormFormat] = useState("standard");
    const [creating, setCreating] = useState(false);

    const handleFormatChange = (newFormat: string) => {
        setFormFormat(newFormat);
        if (newFormat === "divisions") {
            if (![8, 12, 16].includes(formMaxPlayers)) {
                setFormMaxPlayers(8);
            }
            // Enforce minimum 6 weeks duration for divisions (and make it even)
            if (formDuration < 6) {
                setFormDuration(6);
            } else if (formDuration % 2 !== 0) {
                setFormDuration(formDuration + 1 <= 12 ? formDuration + 1 : 12);
            }
            setFormMaxMatches(3);
        }
    };


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

    const fetchClubLeagues = async () => {
        if (!clubId) return;
        setClubLoading(true);
        try {
            const res = await fetch(`/api/leagues/club-leagues?club_id=${clubId}`);
            const data = await res.json();
            setClubLeagues(data.leagues || []);
        } catch (e) {
            console.error("Erreur chargement ligues club:", e);
        } finally {
            setClubLoading(false);
        }
    };

    useEffect(() => {
        fetchLeagues();
        if (clubId) fetchClubLeagues();
    }, [clubId]);

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
                    format: formFormat,
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
            setFormFormat("standard");
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

    const handleJoinPublic = async (leagueId: string) => {
        try {
            const res = await fetch("/api/leagues/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ league_id: leagueId }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Erreur");
                return;
            }
            toast.success(`Vous avez rejoint la ligue !`);
            fetchLeagues();
        } catch (e) {
            toast.error("Erreur lors de la connexion");
        }
    };

    const getRemainingDays = (endsAt: string | null) => {
        if (!endsAt) return null;
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
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm active:scale-[0.98] transition-transform"
                    style={{ backgroundColor: isClub ? 'rgb(var(--theme-secondary-accent, 204, 255, 0))' : 'rgba(255,255,255,0.1)', color: isClub ? 'var(--theme-secondary-accent-contrast, var(--theme-player-page, #071554))' : '#FFFFFF' }}
                >
                    <Plus size={18} />
                    Créer une ligue
                </button>
                <button
                    onClick={() => setShowJoinModal(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 border text-white font-bold text-sm active:scale-[0.98] transition-transform"
                    style={{ borderColor: 'rgb(var(--theme-accent, 204, 255, 0))' }}
                >
                    <KeyRound size={18} />
                    Rejoindre
                </button>
            </div>

            {/* Formulaire de création inline */}
            {showCreateForm && (
                <div
                    className="rounded-2xl border bg-white/5 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200"
                    style={{ borderColor: 'rgba(var(--theme-accent, 204, 255, 0), 0.4)' }}
                >
                    <h3 className="text-base font-bold text-white">Nouvelle ligue privée</h3>

                    <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1 ml-1">Nom de la ligue *</label>
                        <input
                            type="text"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            placeholder="Les Champions du Dimanche"
                            className="w-full h-11 rounded-xl bg-white/10 border border-white/20 px-4 text-white text-sm font-medium placeholder:text-white/30 focus:outline-none focus:ring-2"
                            style={{ '--tw-ring-color': 'rgba(var(--theme-secondary-accent, 204, 255, 0), 0.5)' } as any}
                            maxLength={40}
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1 ml-1">Format de ligue</label>
                        <select
                            value={formFormat}
                            onChange={(e) => handleFormatChange(e.target.value)}
                            className="w-full h-11 rounded-xl bg-white/10 border border-white/20 px-2 text-white text-sm font-medium focus:outline-none focus:ring-2"
                            style={{ '--tw-ring-color': 'rgba(var(--theme-secondary-accent, 204, 255, 0), 0.5)' } as any}
                        >
                            <option value="standard">Championnat (Classement global)</option>
                            <option value="divisions">Poules (Montées/Descentes)</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1 ml-1">Durée</label>
                            <select
                                value={formDuration}
                                onChange={(e) => setFormDuration(Number(e.target.value))}
                                className="w-full h-11 rounded-xl bg-white/10 border border-white/20 px-2 text-white text-sm font-medium focus:outline-none focus:ring-2"
                                style={{ '--tw-ring-color': 'rgba(var(--theme-secondary-accent, 204, 255, 0), 0.5)' } as any}
                            >
                                {formFormat === "divisions" ? (
                                    <>
                                        <option value={6}>6 sem.</option>
                                        <option value={8}>8 sem.</option>
                                        <option value={10}>10 sem.</option>
                                        <option value={12}>12 sem.</option>
                                    </>
                                ) : (
                                    <>
                                        <option value={2}>2 sem.</option>
                                        <option value={3}>3 sem.</option>
                                        <option value={4}>4 sem.</option>
                                        <option value={5}>5 sem.</option>
                                        <option value={6}>6 sem.</option>
                                    </>
                                )}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1 ml-1">Matchs</label>
                            <select
                                value={formFormat === "divisions" ? 3 : formMaxMatches}
                                onChange={(e) => setFormMaxMatches(Number(e.target.value))}
                                disabled={formFormat === "divisions"}
                                className={`w-full h-11 rounded-xl bg-white/10 border border-white/20 px-2 text-white text-sm font-medium focus:outline-none focus:ring-2 ${formFormat === "divisions" ? "opacity-50 cursor-not-allowed" : ""}`}
                                style={{ '--tw-ring-color': 'rgba(var(--theme-secondary-accent, 204, 255, 0), 0.5)' } as any}
                            >
                                {formFormat === "divisions" ? (
                                    <option value={3}>3 / phase</option>
                                ) : (
                                    <>
                                        <option value={5}>5</option>
                                        <option value={10}>10</option>
                                        <option value={15}>15</option>
                                    </>
                                )}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1 ml-1">Joueurs</label>
                            <select
                                value={formMaxPlayers}
                                onChange={(e) => setFormMaxPlayers(Number(e.target.value))}
                                className="w-full h-11 rounded-xl bg-white/10 border border-white/20 px-2 text-white text-sm font-medium focus:outline-none focus:ring-2"
                                style={{ '--tw-ring-color': 'rgba(var(--theme-secondary-accent, 204, 255, 0), 0.5)' } as any}
                            >
                                {formFormat === "divisions" ? (
                                    [8, 12, 16].map(n => <option key={n} value={n}>{n}</option>)
                                ) : (
                                    Array.from({ length: 12 }, (_, i) => i + 4).map(n => (
                                        <option key={n} value={n}>{n}</option>
                                    ))
                                )}
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={handleCreate}
                        disabled={creating || !formName.trim()}
                        className="w-full py-3 rounded-xl font-black text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
                        style={{ backgroundColor: isClub ? 'rgb(var(--theme-secondary-accent, 204, 255, 0))' : 'rgb(var(--theme-secondary-accent, 204, 255, 0))', color: isClub ? 'var(--theme-secondary-accent-contrast, var(--theme-player-page, #071554))' : 'var(--theme-secondary-accent-contrast, var(--theme-player-page, #071554))' }}
                    >
                        {creating ? "Création..." : "Créer ma ligue privée"}
                    </button>
                </div>
            )}

            {/* Filtres */}
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                <button
                    onClick={() => setActiveTab("my")}
                    className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === "my"
                        ? (isClub ? "shadow-md" : "bg-white/10 text-white text-opacity-100")
                        : (isClub ? "" : "text-white/40 hover:text-white/60")
                        }`}
                    style={isClub ? {
                        backgroundColor: activeTab === "my" ? 'rgb(var(--theme-secondary-accent))' : 'transparent',
                        color: activeTab === "my" 
                            ? 'var(--theme-secondary-accent-contrast, #000000)' 
                            : 'rgba(var(--theme-text), 0.4)'
                    } : {}}
                >
                    Mes ligues
                </button>
                <button
                    onClick={() => setActiveTab("club")}
                    className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === "club"
                        ? (isClub ? "shadow-md" : "bg-white/10 text-white text-opacity-100")
                        : (isClub ? "" : "text-white/40 hover:text-white/60")
                        }`}
                    style={isClub ? {
                        backgroundColor: activeTab === "club" ? 'rgb(var(--theme-secondary-accent))' : 'transparent',
                        color: activeTab === "club" 
                            ? 'var(--theme-secondary-accent-contrast, #000000)' 
                            : 'rgba(var(--theme-text), 0.4)'
                    } : {}}
                >
                    Ligues Club
                </button>
            </div>

            {/* Liste des ligues */}
            <div className="space-y-3">
                {((activeTab === "my" && loading) || (activeTab === "club" && clubLoading)) ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-6 h-6 border-2 border-white/20 rounded-full animate-spin" style={{ borderTopColor: 'rgb(var(--theme-secondary-accent, 204, 255, 0))' }} />
                    </div>
                ) : (activeTab === "my" ? leagues : clubLeagues).length === 0 ? (
                    <div className="text-center py-12">
                        <Trophy className="w-12 h-12 text-white/20 mx-auto mb-3" />
                        <p className="text-white/40 text-sm font-medium">
                            {activeTab === "my" ? "Aucune ligue pour le moment" : "Aucune ligue Club publiée"}
                        </p>
                        <p className="text-white/20 text-xs mt-1">
                            {activeTab === "my" ? "Créez votre première ligue ou rejoignez-en une !" : "Revenez plus tard pour voir les compétitions du club."}
                        </p>
                    </div>
                ) : (
                    <>
                        <h3 className={`text-sm font-bold uppercase tracking-widest ml-1 ${isClub ? '' : 'text-white/60'}`}
                            style={isClub ? { color: 'rgba(var(--theme-text), 0.6)' } : {}}>
                            {activeTab === "my" ? "Mes ligues" : "Ligues du Club"}
                        </h3>
                        {(activeTab === "my" ? leagues : clubLeagues).map((league) => {
                            const remainingDays = getRemainingDays(league.ends_at);
                            const isExpired = remainingDays === 0;

                            return (
                                <div
                                    key={league.id}
                                    className="rounded-xl border p-4 active:bg-white/10 transition-colors"
                                    style={{
                                        borderColor: isClub ? 'transparent' : 'rgb(var(--theme-accent, 204, 255, 0))',
                                        backgroundColor: isClub ? 'rgb(var(--theme-accent))' : 'rgba(255,255,255,0.05)'
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <button
                                            onClick={() => setSelectedLeagueId(league.id)}
                                            className="text-left flex-1"
                                        >
                                            <div className="flex items-center gap-2">
                                                <h4 className={`text-base font-bold truncate ${isClub ? '' : 'text-white'}`} style={isClub ? { color: 'var(--theme-accent-contrast)' } : {}}>{league.name}</h4>
                                                {league.format === "divisions" && (
                                                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[9px] font-bold tracking-wider border border-blue-500/20 shrink-0">
                                                        POULES
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                        <div className="flex items-center gap-2">
                                            {activeTab === "club" && league.is_public && league.my_matches_played === undefined && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleJoinPublic(league.id); }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all active:scale-95"
                                                    style={{ backgroundColor: isClub ? 'rgb(var(--theme-secondary-accent))' : 'rgb(var(--theme-secondary-accent, 204, 255, 0))', color: 'var(--theme-page, #071554)' }}
                                                >
                                                    <Plus size={14} className="stroke-[3px]" />
                                                    REJOINDRE
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); copyCode(league.invite_code); }}
                                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-colors ${isClub ? '' : 'bg-white/10 border-white/20 text-white/70 hover:text-white'}`}
                                                style={isClub ? { backgroundColor: 'rgba(var(--theme-accent-contrast-rgb, 0,0,0), 0.15)', borderColor: 'rgba(var(--theme-accent-contrast-rgb, 0,0,0), 0.2)', color: 'var(--theme-accent-contrast)' } : {}}
                                            >
                                                {copiedCode === league.invite_code ? <Check size={14} style={{ color: isClub ? 'var(--theme-accent-contrast)' : 'rgb(var(--theme-secondary-accent, 204, 255, 0))' }} /> : <Copy size={14} />}
                                                <span className="font-mono tracking-wider">{league.invite_code}</span>
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setSelectedLeagueId(league.id)}
                                        className="w-full text-left"
                                    >
                                        <div className={`flex items-center gap-4 text-xs ${isClub ? '' : 'text-white/50'}`} style={isClub ? { color: 'var(--theme-accent-contrast)', opacity: 0.8 } : {}}>
                                            <span className="flex items-center gap-1 text-current">
                                                <Users size={12} />
                                                {league.player_count}/{league.max_players}
                                            </span>
                                            <span className="flex items-center gap-1 text-current">
                                                <Clock size={12} />
                                                {league.status === 'pending' ? (
                                                    <span className="font-bold">En attente</span>
                                                ) : isExpired ? (
                                                    <span className="opacity-70">Terminée</span>
                                                ) : (
                                                    <span>{remainingDays}j restants</span>
                                                )}
                                            </span>
                                            {league.status !== 'pending' && league.my_matches_played !== undefined && (
                                                <span className={`ml-auto opacity-60`}>
                                                    {league.my_matches_played}/{league.max_matches_per_player} matchs
                                                </span>
                                            )}
                                            {league.my_matches_played === undefined && (
                                                <span className="ml-auto font-black text-[10px] uppercase tracking-widest text-[#00E5FF]">
                                                    Détails
                                                </span>
                                            )}
                                        </div>

                                        {/* Mini jauge de progression */}
                                        {league.status !== 'pending' && league.my_matches_played !== undefined && (
                                            <div className={`mt-2 h-1 rounded-full border ${isClub ? '' : 'bg-white/10 border-transparent'}`} style={isClub ? { backgroundColor: 'rgba(var(--theme-accent-contrast-rgb, 0,0,0), 0.2)', borderColor: 'rgba(var(--theme-accent-contrast-rgb, 0,0,0), 0.1)' } : {}}>
                                                <div
                                                    className="h-full rounded-full transition-all duration-300"
                                                    style={{
                                                        width: `${Math.min(100, (league.my_matches_played / league.max_matches_per_player) * 100)}%`,
                                                        backgroundColor: isClub ? 'var(--theme-accent-contrast)' : 'rgb(var(--theme-secondary-accent, 204, 255, 0))'
                                                    }}
                                                />
                                            </div>
                                        )}
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
