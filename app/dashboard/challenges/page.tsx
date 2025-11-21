"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import PageTitle from "../PageTitle";
import BadgeIconDisplay from "@/components/BadgeIconDisplay";

type RewardType = "points" | "badge";

type ClubChallenge = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  objective: string;
  rewardType: RewardType;
  rewardLabel: string;
  status: "upcoming" | "active" | "completed";
};

function formatRange(startISO: string, endISO: string) {
  const formatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  return `${formatter.format(new Date(startISO))} → ${formatter.format(new Date(endISO))}`;
}

function statusTag(status: ClubChallenge["status"]) {
  switch (status) {
    case "active":
      return { label: "Challenge en cours", classes: "bg-emerald-400/15 text-emerald-200 border border-emerald-300/40" };
    case "upcoming":
      return { label: "À venir", classes: "bg-blue-400/15 text-blue-200 border border-blue-300/40" };
    case "completed":
    default:
      return { label: "Terminé", classes: "bg-white/10 text-white/70 border border-white/20" };
  }
}

export default function ChallengesPage() {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [objective, setObjective] = useState("");
  const [rewardType, setRewardType] = useState<RewardType>("points");
  const [rewardPoints, setRewardPoints] = useState("");
  const [rewardBadgeTitle, setRewardBadgeTitle] = useState("");

  const [challenges, setChallenges] = useState<ClubChallenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const response = await fetch("/api/clubs/challenges", { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Impossible de récupérer les challenges");
      }
      const payload = await response.json();
      setChallenges(payload?.challenges ?? []);
    } catch (err: any) {
      console.error("[ClubChallenges] load error", err);
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

      const response = await fetch("/api/clubs/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          startDate,
          endDate,
          objective,
          rewardType,
          rewardLabel,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Création du challenge impossible");
      }

      const payload = await response.json();
      const created: ClubChallenge | undefined = payload?.challenge;
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
    } catch (err: any) {
      console.error("[ClubChallenges] submit error", err);
      setError(err?.message || "Erreur inattendue lors de la création du challenge");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle title="Challenges" subtitle="Créez des défis motivants pour vos joueurs et suivez-les en un coup d'œil." />

      {error ? (
        <div className="rounded-2xl border border-rose-400/60 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/80 ring-1 ring-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">Créer un challenge</h2>
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">Nom du challenge</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex. Sprint Padel Novembre"
                className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">Début du challenge</label>
              <input
                type="date"
                value={startDate}
                min={today}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">Fin du challenge</label>
              <input
                type="date"
                value={endDate}
                min={startDate || today}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">Objectif du challenge</label>
            <textarea
              value={objective}
              onChange={(event) => setObjective(event.target.value)}
              placeholder="Ex. Remporter 5 matchs en double"
              className="min-h-[120px] w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
              required
            />
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">Récompense du challenge</p>
            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => handleRewardChange("points")}
                className={`flex h-32 flex-col items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold transition ${rewardType === "points" ? "border-yellow-400/60 bg-yellow-400/15 text-yellow-200 shadow-[0_16px_35px_rgba(250,204,21,0.35)]" : "border-white/15 bg-white/5 text-white/70 hover:border-yellow-400/40 hover:bg-yellow-400/10 hover:text-yellow-100"}`}
              >
                <Image src="/images/Badge Diamant.png" alt="Diamant" width={48} height={48} className="w-12 h-12 object-contain" />
                <span className="mt-2 uppercase tracking-[0.3em]">Points</span>
              </button>
              <button
                type="button"
                onClick={() => handleRewardChange("badge")}
                className={`flex h-32 flex-col items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold transition ${rewardType === "badge" ? "border-violet-400/60 bg-violet-500/15 text-violet-100 shadow-[0_16px_35px_rgba(139,92,246,0.35)]" : "border-white/15 bg-white/5 text-white/70 hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-violet-100"}`}
              >
                <Image src="/images/Badge Centurion.png" alt="Badge" width={48} height={48} className="w-12 h-12 object-contain" />
                <span className="mt-2 uppercase tracking-[0.3em]">Badge</span>
              </button>
            </div>

            {rewardType === "points" ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">Nombre de points</label>
                <input
                  type="number"
                  min={1}
                  value={rewardPoints}
                  onChange={(event) => setRewardPoints(event.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                  placeholder="30"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">Titre du badge</label>
                <input
                  type="text"
                  value={rewardBadgeTitle}
                  onChange={(event) => setRewardBadgeTitle(event.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/40"
                  placeholder="Badge Sprint"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(37,99,235,0.4)] transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Création…" : "Créer le challenge"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-white/80 ring-1 ring-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Challenges créés</h2>
          <span className="text-sm text-white/60">{challenges.length} challenge(s)</span>
        </div>
        <div className="mt-4 space-y-4">
          {isLoading ? (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-5 text-center text-sm text-white/70">
              Chargement…
            </div>
          ) : challenges.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-5 text-center text-sm text-white/70">
              Aucun challenge n'a encore été créé. Lancez-vous !
            </div>
          ) : (
            challenges.map((challenge) => {
              const tag = statusTag(challenge.status);
              const rewardBadgeClasses = challenge.rewardType === "points"
                ? "border-2 border-yellow-400/30 bg-yellow-400/10 text-yellow-200 shadow-[0_0_20px_rgba(250,204,21,0.15)]"
                : "border-2 border-violet-400/30 bg-violet-400/10 text-violet-200 shadow-[0_0_20px_rgba(167,139,250,0.15)]";
              
              return (
                <article
                  key={challenge.id}
                  className="group relative overflow-hidden rounded-[28px] border-2 border-white/10 bg-gradient-to-br from-blue-500/10 via-indigo-600/5 to-purple-600/10 p-6 text-white shadow-[0_8px_32px_rgba(37,99,235,0.15)] backdrop-blur-sm transition-all duration-300 hover:border-blue-400/30 hover:shadow-[0_12px_40px_rgba(37,99,235,0.25)]"
                >
                  {/* Effet de brillance animé au survol */}
                  <div className="pointer-events-none absolute -inset-full opacity-0 transition-all duration-700 group-hover:opacity-100">
                    <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-[100%] group-hover:transition-transform group-hover:duration-1000" />
                  </div>

                  <div className="relative space-y-5">
                    {/* En-tête avec statut et titre */}
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <span className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider shadow-lg ${tag.classes}`}>
                          {tag.label}
                        </span>
                        <h3 className="text-2xl font-extrabold tracking-tight text-white drop-shadow-lg">{challenge.title}</h3>
                      </div>
                      
                      {/* Badge récompense élégant */}
                      <div className={`flex items-center gap-2.5 rounded-2xl px-5 py-3 text-sm font-bold backdrop-blur-sm transition-all ${rewardBadgeClasses}`}>
                        {challenge.rewardType === "points" ? (
                          <Image src="/images/Badge Diamant.png" alt="Diamant" width={20} height={20} className="w-5 h-5 object-contain" />
                        ) : (
                          <Image src="/images/Badge Centurion.png" alt="Badge" width={20} height={20} className="w-5 h-5 object-contain" />
                        )}
                        <span>
                          {challenge.rewardType === "points" 
                            ? `${challenge.rewardLabel} points`
                            : challenge.rewardLabel}
                        </span>
                      </div>
                    </div>

                    {/* Objectif avec effet glassmorphism */}
                    <div className="rounded-2xl border border-blue-400/40 bg-gradient-to-br from-blue-500/25 via-blue-600/20 to-indigo-600/25 px-5 py-4 shadow-[0_0_30px_rgba(37,99,235,0.2)] backdrop-blur-md">
                      <p className="text-xs font-bold uppercase tracking-widest text-blue-300 flex items-center gap-1">
                        <BadgeIconDisplay icon="🎯" size={14} className="flex-shrink-0" />
                        <span>Objectif</span>
                      </p>
                      <p className="mt-2 text-base font-semibold leading-relaxed text-white">{challenge.objective}</p>
                    </div>

                    {/* Durée avec style amélioré */}
                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                      <span className="text-xl">📅</span>
                      <div className="flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Période</p>
                        <p className="mt-0.5 font-semibold text-white/95">{formatRange(challenge.startDate, challenge.endDate)}</p>
                      </div>
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




