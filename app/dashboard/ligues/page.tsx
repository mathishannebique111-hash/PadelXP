"use client";

import { useState, useEffect } from "react";
import { Plus, Users, Clock, Copy, Check, Trophy, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import PageTitle from "../PageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSearchParams } from "next/navigation";

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
    player_count: number;
    format: string;
}

export default function ClubLeaguesPage() {
    const [leagues, setLeagues] = useState<League[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [clubId, setClubId] = useState<string | null>(null);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    // Form states
    const [formName, setFormName] = useState("");
    const [formDuration, setFormDuration] = useState(4);
    const [formMaxMatches, setFormMaxMatches] = useState(10);
    const [formMaxPlayers, setFormMaxPlayers] = useState(8);
    const [formFormat, setFormFormat] = useState("standard");
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const fetchClubInfo = async () => {
            try {
                const res = await fetch("/api/club/my-club");
                const data = await res.json();
                if (data.clubId) {
                    setClubId(data.clubId);
                    fetchLeagues(data.clubId);
                }
            } catch (e) {
                console.error("Erreur chargement club:", e);
                setLoading(false);
            }
        };
        fetchClubInfo();
    }, []);

    const fetchLeagues = async (cId: string) => {
        try {
            // Updated to fetch leagues specifically for this club
            const res = await fetch(`/api/leagues/club-leagues?club_id=${cId}`);
            const data = await res.json();
            setLeagues(data.leagues || []);
        } catch (e) {
            console.error("Erreur chargement ligues:", e);
        } finally {
            setLoading(false);
        }
    };

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
                body: JSON.stringify({
                    name: formName.trim(),
                    duration_weeks: formDuration,
                    max_matches_per_player: formMaxMatches,
                    max_players: formMaxPlayers,
                    format: formFormat,
                    club_id: clubId
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Erreur");
                return;
            }
            toast.success(`Ligue "${data.league.name}" créée !`);
            setShowCreateForm(false);
            setFormName("");
            if (clubId) fetchLeagues(clubId);
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

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-start justify-between gap-4">
                <PageTitle
                    title="Ligues du club"
                    subtitle="Créez des ligues privées pour vos membres."
                />
                <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 border border-white/20 hover:scale-[1.02] active:scale-100 transition-all shadow-lg"
                >
                    <Plus size={20} />
                    <span>Créer une ligue</span>
                </button>
            </div>

            {showCreateForm && (
                <Card className="border-white/10 bg-white/5 animate-in fade-in slide-in-from-top-2">
                    <CardHeader>
                        <CardTitle className="text-white text-lg">Nouvelle ligue Club</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-1.5 ml-1">Nom de la ligue</label>
                            <input
                                type="text"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder="Ligue Hiver 2024"
                                className="w-full h-12 rounded-xl bg-white/10 border border-white/10 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-1.5 ml-1">Format</label>
                                <select
                                    value={formFormat}
                                    onChange={(e) => setFormFormat(e.target.value)}
                                    className="w-full h-12 rounded-xl bg-white/10 border border-white/10 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                >
                                    <option value="standard">Championnat (Classement global)</option>
                                    <option value="divisions">Poules (Montées/Descentes)</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-1.5 ml-1">Durée</label>
                                    <select
                                        value={formDuration}
                                        onChange={(e) => setFormDuration(Number(e.target.value))}
                                        className="w-full h-12 rounded-xl bg-white/10 border border-white/10 px-2 text-white text-sm"
                                    >
                                        {[2, 3, 4, 5, 6].map(v => <option key={v} value={v}>{v} sem.</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-1.5 ml-1">Matchs</label>
                                    <select
                                        value={formMaxMatches}
                                        onChange={(e) => setFormMaxMatches(Number(e.target.value))}
                                        className="w-full h-12 rounded-xl bg-white/10 border border-white/10 px-2 text-white text-sm"
                                    >
                                        {[5, 10, 15].map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-1.5 ml-1">Joueurs</label>
                                    <select
                                        value={formMaxPlayers}
                                        onChange={(e) => setFormMaxPlayers(Number(e.target.value))}
                                        className="w-full h-12 rounded-xl bg-white/10 border border-white/10 px-2 text-white text-sm"
                                    >
                                        {Array.from({ length: 12 }, (_, i) => i + 4).map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={handleCreate}
                                disabled={creating || !formName.trim()}
                                className="w-full py-4 rounded-xl font-black text-sm bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                            >
                                {creating ? <Loader2 className="animate-spin w-5 h-5" /> : "Créer la ligue Club"}
                            </button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full flex justify-center py-20">
                        <Loader2 className="animate-spin w-10 h-10 text-blue-500" />
                    </div>
                ) : leagues.length === 0 ? (
                    <div className="col-span-full text-center py-20 border-2 border-dashed border-white/10 rounded-3xl bg-white/5 mx-auto w-full max-w-2xl">
                        <Trophy className="w-16 h-16 text-white/10 mx-auto mb-4" />
                        <h4 className="text-xl font-bold text-white/80">Aucune ligue Club</h4>
                        <p className="text-white/40 mt-2">Commencez par créer votre première ligue pour animer votre communauté.</p>
                    </div>
                ) : (
                    leagues.map((league) => (
                        <Card key={league.id} className="border-white/10 bg-white/5 hover:bg-white/10 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3">
                                <button
                                    onClick={() => copyCode(league.invite_code)}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-white/20 text-white/60 hover:text-white transition-all border border-white/5"
                                    title="Copier le code d'invitation"
                                >
                                    {copiedCode === league.invite_code ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                                </button>
                            </div>

                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
                                        <Trophy size={20} />
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-black border-blue-500/30 text-blue-400 bg-blue-500/5">
                                        {league.status.toUpperCase()}
                                    </Badge>
                                </div>
                                <CardTitle className="text-white text-xl line-clamp-1">{league.name}</CardTitle>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Joueurs</p>
                                        <div className="flex items-center gap-1.5 text-white/80 font-semibold">
                                            <Users size={14} className="text-blue-400" />
                                            <span>{league.player_count} / {league.max_players}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Durée</p>
                                        <div className="flex items-center gap-1.5 text-white/80 font-semibold">
                                            <Clock size={14} className="text-blue-400" />
                                            <span>{league.duration_weeks} semaines</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <div className="w-full flex items-center justify-between text-xs font-bold text-white/40 mb-2">
                                        <span>Code d'invitation</span>
                                        <span className="font-mono text-blue-400">{league.invite_code}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                                            style={{ width: `${(league.player_count / league.max_players) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}

const Badge = ({ children, variant, className }: any) => (
    <div className={`px-2 py-0.5 rounded-full text-[10px] ${className}`}>
        {children}
    </div>
);
