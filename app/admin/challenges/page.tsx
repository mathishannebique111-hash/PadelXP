'use client';

import { useState, useEffect } from 'react';
import { Trophy, Plus, Trash2, Calendar, Target, Gift, Loader2 } from 'lucide-react';

interface GlobalChallenge {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    objective: string;
    reward: string;
    created_at: string;
    is_global: true;
}

export default function AdminChallengesPage() {
    const [challenges, setChallenges] = useState<GlobalChallenge[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [objective, setObjective] = useState('');
    const [reward, setReward] = useState('');

    const fetchChallenges = async () => {
        try {
            const res = await fetch('/api/admin/challenges');
            if (res.ok) {
                const data = await res.json();
                setChallenges(data.challenges || []);
            }
        } catch (err) {
            console.error('Error fetching challenges:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchChallenges(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await fetch('/api/admin/challenges', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, start_date: startDate, end_date: endDate, objective, reward }),
            });
            if (res.ok) {
                setName(''); setStartDate(''); setEndDate(''); setObjective(''); setReward('');
                setShowForm(false);
                fetchChallenges();
            }
        } catch (err) {
            console.error('Error creating challenge:', err);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer ce challenge ?')) return;
        setDeleting(id);
        try {
            const res = await fetch(`/api/admin/challenges?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchChallenges();
        } catch (err) {
            console.error('Error deleting challenge:', err);
        } finally {
            setDeleting(null);
        }
    };

    const isActive = (c: GlobalChallenge) => {
        const now = new Date();
        return new Date(c.start_date) <= now && new Date(c.end_date) >= now;
    };

    const isUpcoming = (c: GlobalChallenge) => {
        return new Date(c.start_date) > new Date();
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                            <Trophy className="w-6 h-6 text-yellow-400" />
                        </div>
                        Challenges PadelXP
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Challenges globaux visibles par tous les joueurs
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/20"
                >
                    <Plus size={18} />
                    Nouveau challenge
                </button>
            </div>

            {/* Create form */}
            {showForm && (
                <form
                    onSubmit={handleCreate}
                    className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-5"
                >
                    <h2 className="text-lg font-semibold text-white">Créer un challenge global</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Nom du challenge</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex: Semaine du Smash"
                                className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                <Calendar className="inline w-4 h-4 mr-1" />Date de début
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 [color-scheme:dark]"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                <Calendar className="inline w-4 h-4 mr-1" />Date de fin
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 [color-scheme:dark]"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                <Target className="inline w-4 h-4 mr-1" />Objectif
                            </label>
                            <input
                                type="text"
                                value={objective}
                                onChange={(e) => setObjective(e.target.value)}
                                placeholder="Ex: Jouer 5 matchs cette semaine"
                                className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                <Gift className="inline w-4 h-4 mr-1" />Récompense
                            </label>
                            <input
                                type="text"
                                value={reward}
                                onChange={(e) => setReward(e.target.value)}
                                placeholder="Ex: +50 XP bonus"
                                className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={creating}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold text-sm hover:from-green-500 hover:to-emerald-500 transition-all disabled:opacity-50"
                        >
                            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={16} />}
                            {creating ? 'Création...' : 'Créer le challenge'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 text-sm transition-all"
                        >
                            Annuler
                        </button>
                    </div>
                </form>
            )}

            {/* Challenges list */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                </div>
            ) : challenges.length === 0 ? (
                <div className="text-center py-20">
                    <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg">Aucun challenge global créé</p>
                    <p className="text-slate-500 text-sm mt-1">Cliquez sur "Nouveau challenge" pour commencer</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {challenges
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((challenge) => {
                            const active = isActive(challenge);
                            const upcoming = isUpcoming(challenge);
                            const ended = !active && !upcoming;

                            return (
                                <div
                                    key={challenge.id}
                                    className={`bg-slate-900/60 backdrop-blur-xl border rounded-2xl p-5 transition-all ${active
                                            ? 'border-green-500/30 shadow-lg shadow-green-500/5'
                                            : upcoming
                                                ? 'border-blue-500/20'
                                                : 'border-white/5 opacity-60'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-semibold text-white">{challenge.name}</h3>
                                                {active && (
                                                    <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold border border-green-500/30">
                                                        🟢 Actif
                                                    </span>
                                                )}
                                                {upcoming && (
                                                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold border border-blue-500/30">
                                                        ⏳ À venir
                                                    </span>
                                                )}
                                                {ended && (
                                                    <span className="px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400 text-xs font-semibold border border-slate-500/30">
                                                        Terminé
                                                    </span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                                    <Calendar className="w-4 h-4 text-slate-500" />
                                                    <span>{new Date(challenge.start_date).toLocaleDateString('fr-FR')} → {new Date(challenge.end_date).toLocaleDateString('fr-FR')}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                                    <Target className="w-4 h-4 text-blue-400" />
                                                    <span>{challenge.objective}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                                    <Gift className="w-4 h-4 text-yellow-400" />
                                                    <span>{challenge.reward}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleDelete(challenge.id)}
                                            disabled={deleting === challenge.id}
                                            className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                            title="Supprimer"
                                        >
                                            {deleting === challenge.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}
        </div>
    );
}
