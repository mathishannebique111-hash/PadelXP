"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { HelpCircle, Gem, Medal, Trophy, Plus, Trash2, Calendar, Target, Gift, Loader2 } from "lucide-react";
import BadgeIconDisplay from "@/components/BadgeIconDisplay";
import ChallengeHelpModal from "@/components/challenges/ChallengeHelpModal";
import { logger } from '@/lib/logger';

type RewardType = "points" | "badge";

type GlobalChallenge = {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    objective: string;
    rewardType: RewardType;
    rewardLabel: string;
    status: "upcoming" | "active" | "completed";
    isGlobal?: boolean;
};

function formatRange(startISO: string, endISO: string) {
    const formatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
    return `${formatter.format(new Date(startISO))} → ${formatter.format(new Date(endISO))}`;
}

function statusTag(status: GlobalChallenge["status"]) {
    switch (status) {
        case "active":
            return { label: "En cours", classes: "bg-emerald-400/15 text-emerald-200 border border-emerald-300/40" };
        case "upcoming":
            return { label: "À venir", classes: "bg-blue-400/15 text-blue-200 border border-blue-300/40" };
        case "completed":
        default:
            return { label: "Terminé", classes: "bg-white/10 text-white/70 border border-white/20" };
    }
}

export default function AdminChallengesPage() {
    const [showHelp, setShowHelp] = useState(false);
    const [name, setName] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [objective, setObjective] = useState("");
    const [rewardType, setRewardType] = useState<RewardType>("points");
    const [rewardPoints, setRewardPoints] = useState("");
    const [rewardBadgeTitle, setRewardBadgeTitle] = useState("");
    const [isPremium, setIsPremium] = useState(false);

    const [challenges, setChallenges] = useState<GlobalChallenge[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

    const rewardLabel = rewardType === "points" ? rewardPoints.trim() : rewardBadgeTitle.trim();

    // Date minimale = aujourd'hui (format YYYY-MM-DD)
    const today = useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }, []);

    const isValid = useMemo(() => {
        if (!name.trim() || !objective.trim()) return false;
        if (!startDate || !endDate) return false;
        if (new Date(startDate) > new Date(endDate)) return false;
        if (!rewardLabel) return false;
        return true;
    }, [name, objective, startDate, endDate, rewardLabel]);

    const loadChallenges = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await fetch("/api/admin/challenges", { cache: "no-store" });
            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.error || "Impossible de récupérer les challenges");
            }
            const payload = await response.json();
            setChallenges(payload?.challenges ?? []);
        } catch (err: any) {
            console.error("[AdminChallenges] load error", err);
            setError(err?.message || "Erreur lors du chargement des challenges");
            setChallenges([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadChallenges();
    }, [loadChallenges]);

    const handleRewardChange = (type: RewardType) => {
        setRewardType(type);
        if (type === "points") {
            setRewardBadgeTitle("");
        } else {
            setRewardPoints("");
        }
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!isValid || isSubmitting) return;

        try {
            setIsSubmitting(true);
            setError(null);

            const response = await fetch("/api/admin/challenges", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    startDate,
                    endDate,
                    objective,
                    rewardType,
                    rewardLabel,
                    isPremium,
                }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.error || "Création du challenge impossible");
            }

            const payload = await response.json();
            const created: GlobalChallenge | undefined = payload?.challenge;
            if (created) {
                setChallenges((prev) => [created, ...prev]);
            }

            setName("");
            setStartDate("");
            setEndDate("");
            setObjective("");
            setRewardType("points");
            setRewardPoints("");
            setRewardBadgeTitle("");
            setIsPremium(false);
        } catch (err: any) {
            console.error("[AdminChallenges] submit error", err);
            setError(err?.message || "Erreur inattendue lors de la création du challenge");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer définitivement ce challenge global ?')) return;
        setDeleting(id);
        try {
            const res = await fetch(`/api/admin/challenges?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setChallenges(prev => prev.filter(c => c.id !== id));
            } else {
                const data = await res.json();
                throw new Error(data.error || "Erreur de suppression");
            }
        } catch (err: any) {
            console.error('Error deleting challenge:', err);
            alert(err.message);
        } finally {
            setDeleting(null);
        }
    };

    const handlePrefill = (title: string, objective: string) => {
        setName(title);
        setObjective(objective);
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
                        Gérez les challenges globaux visibles par tous les joueurs (indépendamment de leur club).
                    </p>
                </div>
            </div>

            {showHelp && <ChallengeHelpModal onClose={() => setShowHelp(false)} onPrefill={handlePrefill} />}

            {error ? (
                <div className="rounded-2xl border border-rose-400/60 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    {error}
                </div>
            ) : null}

            <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-white">Créer un challenge global</h2>
                    <button
                        type="button"
                        onClick={() => setShowHelp(true)}
                        className="group flex items-center gap-2 rounded-xl bg-blue-600/20 border border-blue-500/30 px-4 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-600/30 transition-all"
                    >
                        <HelpCircle size={16} />
                        <span>Suggestions</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50">Titre</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder="Ex. Padel Tour Été"
                                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white placeholder-white/20 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50">Début</label>
                            <input
                                type="date"
                                value={startDate}
                                min={today}
                                onChange={(event) => setStartDate(event.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 [color-scheme:dark]"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50">Fin</label>
                            <input
                                type="date"
                                value={endDate}
                                min={startDate || today}
                                onChange={(event) => setEndDate(event.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 [color-scheme:dark]"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50">Objectif</label>
                        <textarea
                            value={objective}
                            onChange={(event) => setObjective(event.target.value)}
                            placeholder="Ex. Jouer 3 matchs cette semaine..."
                            className="min-h-[100px] w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white placeholder-white/20 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            required
                        />
                    </div>

                    <div className="space-y-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50">Récompense</p>
                        <div className="grid gap-4 md:grid-cols-2">
                            <button
                                type="button"
                                onClick={() => handleRewardChange("points")}
                                className={`flex h-24 flex-col items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition ${rewardType === "points" ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-200" : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"}`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <Gem className={`w-5 h-5 ${rewardType === 'points' ? 'text-yellow-400' : 'text-slate-500'}`} />
                                    <span className="uppercase tracking-widest">Points</span>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleRewardChange("badge")}
                                className={`flex h-24 flex-col items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition ${rewardType === "badge" ? "border-purple-500/50 bg-purple-500/10 text-purple-200" : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"}`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <Medal className={`w-5 h-5 ${rewardType === 'badge' ? 'text-purple-400' : 'text-slate-500'}`} />
                                    <span className="uppercase tracking-widest">Badge</span>
                                </div>
                            </button>
                        </div>

                        {rewardType === "points" ? (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50">Montant (XP)</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={rewardPoints}
                                    onChange={(event) => setRewardPoints(event.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white placeholder-white/20 focus:border-yellow-500/50 focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
                                    placeholder="Ex: 50"
                                />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50">Titre du badge</label>
                                <input
                                    type="text"
                                    value={rewardBadgeTitle}
                                    onChange={(event) => setRewardBadgeTitle(event.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white placeholder-white/20 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                                    placeholder="Ex: Vainqueur Tournoi Hiver"
                                />
                            </div>
                        )}

                        <div className="flex items-center gap-3 pt-2">
                            <input
                                type="checkbox"
                                id="isPremium"
                                checked={isPremium}
                                onChange={(e) => setIsPremium(e.target.checked)}
                                className="w-5 h-5 rounded-md border-white/20 bg-white/5 text-blue-600 focus:ring-blue-500/50 focus:ring-offset-0"
                            />
                            <label htmlFor="isPremium" className="text-sm font-medium text-white cursor-pointer select-none">
                                Réservé aux membres Premium 💎
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={!isValid || isSubmitting}
                            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            {isSubmitting ? "Création..." : "Publier le challenge global"}
                        </button>
                    </div>
                </form>
            </section>

            <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-lg font-semibold text-white">Challenges en ligne</h2>
                    <span className="text-xs font-medium px-2 py-1 rounded-lg bg-white/10 text-white/60">{challenges.length} active(s)</span>
                </div>

                <div className="grid gap-4">
                    {isLoading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
                        </div>
                    ) : challenges.length === 0 ? (
                        <div className="rounded-xl border border-white/10 bg-white/5 py-12 text-center">
                            <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400">Aucun challenge global actif.</p>
                        </div>
                    ) : (
                        challenges.map((challenge) => {
                            const tag = statusTag(challenge.status);
                            const isPoints = challenge.rewardType === "points";
                            const isPremium = (challenge as any).isPremium;

                            return (
                                <article
                                    key={challenge.id}
                                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 p-5 transition-all hover:border-blue-500/30 hover:bg-slate-900/60"
                                >
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-center gap-3">
                                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${tag.classes}`}>
                                                    {tag.label}
                                                </span>
                                                {isPremium && (
                                                    <span className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                        Premium 💎
                                                    </span>
                                                )}
                                                <span className="flex items-center text-xs text-slate-400 gap-1.5">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatRange(challenge.startDate, challenge.endDate)}
                                                </span>
                                            </div>

                                            <div>
                                                <h3 className="text-lg font-bold text-white">{challenge.title}</h3>
                                                <p className="text-sm text-slate-300 mt-1">{challenge.objective}</p>
                                            </div>
                                        </div>

                                        <div className="flex md:flex-col items-center md:items-end gap-3 md:gap-2">
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${isPoints ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200' : 'border-purple-500/20 bg-purple-500/10 text-purple-200'}`}>
                                                {isPoints ? <Gem className="w-4 h-4" /> : <Medal className="w-4 h-4" />}
                                                <span className="text-xs font-bold uppercase tracking-wider">
                                                    {challenge.rewardLabel} {isPoints && 'PTS'}
                                                </span>
                                            </div>

                                            <button
                                                onClick={() => handleDelete(challenge.id)}
                                                disabled={deleting === challenge.id}
                                                className="p-2 rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                                                title="Supprimer ce challenge"
                                            >
                                                {deleting === challenge.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            );
                        })
                    )}
                </div>
            </section>
        </div>
    );
}
