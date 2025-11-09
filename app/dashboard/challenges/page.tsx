"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

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
      <div>
        <h1 className="text-2xl font-extrabold">Challenges</h1>
        <p className="text-sm text-white/60">Créez des défis motivants pour vos joueurs et suivez-les en un coup d'œil.</p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-400/60 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
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
                min={startDate || undefined}
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
                <span className="text-3xl">💎</span>
                <span className="mt-2 uppercase tracking-[0.3em]">Points</span>
              </button>
              <button
                type="button"
                onClick={() => handleRewardChange("badge")}
                className={`flex h-32 flex-col items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold transition ${rewardType === "badge" ? "border-violet-400/60 bg-violet-500/15 text-violet-100 shadow-[0_16px_35px_rgba(139,92,246,0.35)]" : "border-white/15 bg-white/5 text-white/70 hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-violet-100"}`}
              >
                <span className="text-3xl">🏅</span>
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

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
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
              return (
                <article
                  key={challenge.id}
                  className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${tag.classes}`}>
                        {tag.label}
                      </span>
                      <h3 className="text-lg font-semibold text-white">{challenge.title}</h3>
                      <p className="text-sm text-white/70">{challenge.objective}</p>
                    </div>
                    <div className="text-right text-sm text-white/70">
                      <div>
                        <span className="font-semibold text-white">Durée :</span> {formatRange(challenge.startDate, challenge.endDate)}
                      </div>
                      <div className="mt-1">
                        <span className="font-semibold text-white">Récompense :</span> {challenge.rewardType === "points" ? `${challenge.rewardLabel} points` : `Badge “${challenge.rewardLabel}”`}
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




