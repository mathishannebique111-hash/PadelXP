"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Trophy, Clock, Plus, ChevronDown, ChevronUp, Gift, Calendar,
  X, Check, AlertTriangle, History, Crown,
  Image as ImageIcon,
} from "lucide-react";
import PageTitle from "@/components/PageTitle";
import { createClient } from "@/lib/supabase/client";

type SeasonStatus = "upcoming" | "active" | "completed";

interface SeasonReward {
  id: string;
  rank: number;
  reward_label: string;
  reward_description: string | null;
  reward_image_url: string | null;
}

interface SeasonResult {
  id: string;
  user_id: string;
  final_rank: number;
  final_points: number;
  wins: number;
  losses: number;
  matches_played: number;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: SeasonStatus;
  created_at: string;
  season_rewards: SeasonReward[];
  season_results?: SeasonResult[];
}

function statusBadge(status: SeasonStatus) {
  switch (status) {
    case "active":
      return { label: "En cours", classes: "bg-emerald-400/15 text-emerald-300 border-emerald-400/40" };
    case "upcoming":
      return { label: "A venir", classes: "bg-blue-400/15 text-blue-300 border-blue-400/40" };
    case "completed":
      return { label: "Terminee", classes: "bg-white/10 text-white/60 border-white/20" };
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function daysRemaining(endDate: string) {
  const diff = new Date(endDate + "T23:59:59").getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function progressPercent(startDate: string, endDate: string) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate + "T23:59:59").getTime();
  const now = Date.now();
  const total = end - start;
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, ((now - start) / total) * 100));
}

const medalEmojis = ["🥇", "🥈", "🥉"];

interface Club {
  id: string;
  name: string;
}

export default function SeasonsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedSeasonId, setExpandedSeasonId] = useState<string | null>(null);
  const [finalizingId, setFinalizingId] = useState<string | null>(null);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newRewards, setNewRewards] = useState([
    { rank: 1, reward_label: "", reward_description: "", reward_image_url: "" },
    { rank: 2, reward_label: "", reward_description: "", reward_image_url: "" },
    { rank: 3, reward_label: "", reward_description: "", reward_image_url: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reward image upload
  const [uploadingRank, setUploadingRank] = useState<number | null>(null);

  const today = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  // Load clubs list
  useEffect(() => {
    async function fetchClubs() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("clubs")
          .select("id, name")
          .order("name");
        if (data && data.length > 0) {
          setClubs(data);
          if (!selectedClubId) {
            setSelectedClubId(data[0].id);
          }
        }
      } catch {
        // Silent
      }
    }
    fetchClubs();
  }, []);

  const loadSeasons = useCallback(async () => {
    if (!selectedClubId) {
      setSeasons([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/seasons?club_id=${selectedClubId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Erreur lors du chargement");
      const data = await res.json();
      setSeasons(data.seasons || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  }, [selectedClubId]);

  useEffect(() => { loadSeasons(); }, [loadSeasons]);

  const activeSeason = seasons.find(s => s.status === "active");
  const upcomingSeasons = seasons.filter(s => s.status === "upcoming");
  const completedSeasons = seasons.filter(s => s.status === "completed");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);

      if (!selectedClubId) {
        setError("Veuillez selectionner un club");
        return;
      }

      const rewards = newRewards.filter(r => r.reward_label.trim());

      const res = await fetch("/api/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          start_date: newStartDate,
          end_date: newEndDate,
          club_id: selectedClubId,
          rewards,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la creation");
      }

      setNewName("");
      setNewStartDate("");
      setNewEndDate("");
      setNewRewards([
        { rank: 1, reward_label: "", reward_description: "", reward_image_url: "" },
        { rank: 2, reward_label: "", reward_description: "", reward_image_url: "" },
        { rank: 3, reward_label: "", reward_description: "", reward_image_url: "" },
      ]);
      setShowCreateForm(false);
      await loadSeasons();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalize = async (seasonId: string) => {
    if (finalizingId) return;
    if (!confirm("Etes-vous sur de vouloir finaliser cette saison ? Le classement sera fige et la saison sera marquee comme terminee.")) return;

    try {
      setFinalizingId(seasonId);
      setError(null);

      const res = await fetch(`/api/seasons/${seasonId}/finalize`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la finalisation");
      }

      await loadSeasons();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setFinalizingId(null);
    }
  };

  const loadSeasonResults = async (seasonId: string) => {
    if (expandedSeasonId === seasonId) {
      setExpandedSeasonId(null);
      return;
    }

    try {
      const res = await fetch(`/api/seasons/${seasonId}/results`);
      if (!res.ok) throw new Error("Erreur");
      const data = await res.json();

      setSeasons(prev => prev.map(s =>
        s.id === seasonId ? { ...s, season_results: data.results || [] } : s
      ));
      setExpandedSeasonId(seasonId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    }
  };

  const handleImageUpload = async (rank: number, file: File) => {
    setUploadingRank(rank);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "season-rewards");
      formData.append("path", `rewards/${Date.now()}_${file.name}`);

      // Upload via Supabase storage API
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setNewRewards(prev => prev.map(r =>
          r.rank === rank ? { ...r, reward_image_url: data.url || "" } : r
        ));
      }
    } catch {
      // Silent fail for image upload
    } finally {
      setUploadingRank(null);
    }
  };

  const isFormValid = newName.trim() && newStartDate && newEndDate && newStartDate < newEndDate;

  return (
    <div className="space-y-6">
      <PageTitle title="Saisons" subtitle="Gerez les saisons par club, configurez les recompenses et suivez le classement." />

      {/* Club selector */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">Club</label>
        <select
          value={selectedClubId}
          onChange={e => setSelectedClubId(e.target.value)}
          className="flex-1 max-w-md rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
        >
          {clubs.length === 0 && <option value="">Chargement...</option>}
          {clubs.map(club => (
            <option key={club.id} value={club.id} className="bg-slate-900 text-white">
              {club.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-400/60 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
          Chargement...
        </div>
      ) : (
        <>
          {/* =============================== */}
          {/* SECTION 1: Active Season Overview */}
          {/* =============================== */}
          {activeSeason && (
            <section className="rounded-2xl border-2 border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-white/5 to-purple-500/10 p-6 relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-1/2 -right-1/4 w-1/2 h-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, rgba(255,215,0,1), transparent 70%)' }} />
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">{activeSeason.name}</h2>
                      <p className="text-xs text-white/50">{formatDate(activeSeason.start_date)} → {formatDate(activeSeason.end_date)}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border ${statusBadge("active").classes}`}>
                    {statusBadge("active").label}
                  </span>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <div>
                      <p className="text-xs text-white/50">Temps restant</p>
                      <p className="text-lg font-bold text-white">J-{daysRemaining(activeSeason.end_date)}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center gap-3">
                    <Gift className="w-5 h-5 text-purple-400" />
                    <div>
                      <p className="text-xs text-white/50">Recompenses</p>
                      <p className="text-lg font-bold text-white">{activeSeason.season_rewards?.length || 0} / 3</p>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] text-white/40 font-medium">Progression de la saison</span>
                    <span className="text-[10px] text-white/40 font-medium">{Math.round(progressPercent(activeSeason.start_date, activeSeason.end_date))}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${progressPercent(activeSeason.start_date, activeSeason.end_date)}%`,
                        background: 'linear-gradient(90deg, rgba(251,191,36,0.8), rgba(245,158,11,0.9), rgba(217,119,6,1))',
                        boxShadow: '0 0 12px rgba(251,191,36,0.3)',
                      }}
                    />
                  </div>
                </div>

                {/* Rewards display */}
                {activeSeason.season_rewards && activeSeason.season_rewards.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5" />
                      Recompenses configurees
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {[...activeSeason.season_rewards].sort((a, b) => a.rank - b.rank).map(reward => (
                        <div key={reward.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                          <span className="text-2xl">{medalEmojis[reward.rank - 1]}</span>
                          {reward.reward_image_url && (
                            <div className="mt-2 w-full h-16 rounded-lg overflow-hidden bg-white/10">
                              <img src={reward.reward_image_url} alt={reward.reward_label} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <p className="mt-2 text-xs font-semibold text-white/80 line-clamp-2">{reward.reward_label}</p>
                          {reward.reward_description && (
                            <p className="mt-1 text-[10px] text-white/40 line-clamp-2">{reward.reward_description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Finalize button */}
                <div className="mt-5 flex justify-end">
                  <button
                    onClick={() => handleFinalize(activeSeason.id)}
                    disabled={!!finalizingId}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-500/20 border border-amber-400/40 px-4 py-2.5 text-sm font-semibold text-amber-200 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                  >
                    {finalizingId === activeSeason.id ? (
                      <>Finalisation...</>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Finaliser la saison
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* =============================== */}
          {/* SECTION 2: Upcoming Seasons */}
          {/* =============================== */}
          {upcomingSeasons.length > 0 && (
            <section className="rounded-2xl border border-blue-400/20 bg-blue-500/5 p-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-blue-400" />
                Saisons a venir
              </h2>
              <div className="space-y-3">
                {upcomingSeasons.map(season => (
                  <div key={season.id} className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white">{season.name}</h3>
                      <p className="text-xs text-white/50 mt-0.5">
                        {formatDate(season.start_date)} → {formatDate(season.end_date)}
                      </p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border ${statusBadge("upcoming").classes}`}>
                      {statusBadge("upcoming").label}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* =============================== */}
          {/* SECTION 3: Create Season Form */}
          {/* =============================== */}
          <section className="rounded-2xl border border-white/80 ring-1 ring-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                Creer une nouvelle saison
              </h2>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors text-white/60"
              >
                {showCreateForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showCreateForm && (
              <form onSubmit={handleCreate} className="mt-6 space-y-6">
                {/* Name */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">Nom de la saison</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Ex. Saison 1 - Mai/Juin 2026"
                    className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                    required
                  />
                </div>

                {/* Dates */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">Date de debut</label>
                    <input
                      type="date"
                      value={newStartDate}
                      min={today}
                      onChange={e => setNewStartDate(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">Date de fin</label>
                    <input
                      type="date"
                      value={newEndDate}
                      min={newStartDate || today}
                      onChange={e => setNewEndDate(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                      required
                    />
                  </div>
                </div>

                {/* Rewards */}
                <div className="space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60 flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5" />
                    Recompenses (Top 3)
                  </p>
                  <div className="space-y-4">
                    {newRewards.map((reward, idx) => (
                      <div key={reward.rank} className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl">{medalEmojis[idx]}</span>
                          <span className="text-sm font-bold text-white">
                            {reward.rank === 1 ? "1er" : `${reward.rank}e`} place
                          </span>
                        </div>
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={reward.reward_label}
                            onChange={e => {
                              const updated = [...newRewards];
                              updated[idx] = { ...updated[idx], reward_label: e.target.value };
                              setNewRewards(updated);
                            }}
                            placeholder="Nom de la recompense"
                            className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-amber-400 focus:outline-none"
                          />
                          <input
                            type="text"
                            value={reward.reward_description}
                            onChange={e => {
                              const updated = [...newRewards];
                              updated[idx] = { ...updated[idx], reward_description: e.target.value };
                              setNewRewards(updated);
                            }}
                            placeholder="Description (optionnel)"
                            className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-white/30 focus:outline-none"
                          />
                          {/* Image upload */}
                          <div className="flex items-center gap-3">
                            {reward.reward_image_url ? (
                              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                                <img src={reward.reward_image_url} alt="" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...newRewards];
                                    updated[idx] = { ...updated[idx], reward_image_url: "" };
                                    setNewRewards(updated);
                                  }}
                                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                                >
                                  <X className="w-3 h-3 text-white" />
                                </button>
                              </div>
                            ) : (
                              <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-white/20 bg-white/5 px-3 py-2 text-xs text-white/50 hover:bg-white/10 hover:border-white/30 transition-colors">
                                <ImageIcon className="w-4 h-4" />
                                <span>{uploadingRank === reward.rank ? "Envoi..." : "Ajouter une photo"}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) handleImageUpload(reward.rank, file);
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!isFormValid || isSubmitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black shadow-[0_12px_32px_rgba(245,158,11,0.3)] transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Creation..." : "Creer la saison"}
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* =============================== */}
          {/* SECTION 4: Completed Seasons History */}
          {/* =============================== */}
          <section className="rounded-2xl border border-white/80 ring-1 ring-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-white/60" />
                Historique des saisons
              </h2>
              <span className="text-sm text-white/40">{completedSeasons.length} saison{completedSeasons.length > 1 ? "s" : ""}</span>
            </div>

            {completedSeasons.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/50">
                Aucune saison terminee pour le moment.
              </div>
            ) : (
              <div className="space-y-3">
                {completedSeasons.map(season => {
                  const isExpanded = expandedSeasonId === season.id;
                  const top3 = (season.season_results || []).slice(0, 3);
                  const sortedRewards = [...(season.season_rewards || [])].sort((a, b) => a.rank - b.rank);

                  return (
                    <div key={season.id} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                      {/* Header */}
                      <button
                        onClick={() => loadSeasonResults(season.id)}
                        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                            <Crown className="w-4 h-4 text-amber-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white text-sm">{season.name}</h3>
                            <p className="text-[10px] text-white/40 mt-0.5">
                              {formatDate(season.start_date)} → {formatDate(season.end_date)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Mini top 3 */}
                          {top3.length > 0 && (
                            <div className="hidden sm:flex items-center gap-1">
                              {top3.map((r, i) => (
                                <span key={r.id} className="text-sm">{medalEmojis[i]}</span>
                              ))}
                            </div>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-white/40" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-white/40" />
                          )}
                        </div>
                      </button>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="border-t border-white/10 p-4 space-y-4">
                          {/* Rewards */}
                          {sortedRewards.length > 0 && (
                            <div>
                              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Recompenses</h4>
                              <div className="grid grid-cols-3 gap-2">
                                {sortedRewards.map(reward => (
                                  <div key={reward.id} className="rounded-lg border border-white/10 bg-white/5 p-2 text-center">
                                    <span className="text-lg">{medalEmojis[reward.rank - 1]}</span>
                                    <p className="text-[10px] font-semibold text-white/70 mt-1 line-clamp-1">{reward.reward_label}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Results table */}
                          {season.season_results && season.season_results.length > 0 ? (
                            <div>
                              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Classement final</h4>
                              <div className="rounded-lg border border-white/10 overflow-hidden">
                                <table className="w-full">
                                  <thead className="bg-white/5">
                                    <tr>
                                      <th className="px-3 py-2 text-[10px] font-bold uppercase text-white/50 text-center w-12">#</th>
                                      <th className="px-3 py-2 text-[10px] font-bold uppercase text-white/50 text-left">Joueur</th>
                                      <th className="px-3 py-2 text-[10px] font-bold uppercase text-white/50 text-center">Pts</th>
                                      <th className="px-3 py-2 text-[10px] font-bold uppercase text-white/50 text-center hidden sm:table-cell">V</th>
                                      <th className="px-3 py-2 text-[10px] font-bold uppercase text-white/50 text-center hidden sm:table-cell">D</th>
                                      <th className="px-3 py-2 text-[10px] font-bold uppercase text-white/50 text-center hidden sm:table-cell">Matchs</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5">
                                    {season.season_results.map(result => {
                                      const name = result.profiles
                                        ? `${result.profiles.first_name || ""} ${result.profiles.last_name ? result.profiles.last_name.charAt(0) + "." : ""}`.trim()
                                        : result.profiles?.display_name || "Joueur";
                                      const isTop3 = result.final_rank <= 3;

                                      return (
                                        <tr key={result.id} className={isTop3 ? "bg-amber-400/5" : ""}>
                                          <td className="px-3 py-2 text-center">
                                            {isTop3 ? (
                                              <span className="text-sm">{medalEmojis[result.final_rank - 1]}</span>
                                            ) : (
                                              <span className="text-xs text-white/50 font-medium">{result.final_rank}</span>
                                            )}
                                          </td>
                                          <td className="px-3 py-2 text-sm text-white font-medium">{name}</td>
                                          <td className="px-3 py-2 text-sm text-white text-center font-bold tabular-nums">{result.final_points}</td>
                                          <td className="px-3 py-2 text-xs text-emerald-400 text-center hidden sm:table-cell">{result.wins}</td>
                                          <td className="px-3 py-2 text-xs text-red-400 text-center hidden sm:table-cell">{result.losses}</td>
                                          <td className="px-3 py-2 text-xs text-white/50 text-center hidden sm:table-cell">{result.matches_played}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-sm text-white/40 py-4">
                              Chargement des resultats...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Empty state if no seasons at all */}
          {!activeSeason && upcomingSeasons.length === 0 && completedSeasons.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
              <Trophy className="w-12 h-12 text-amber-400/40 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Aucune saison creee</h3>
              <p className="text-sm text-white/50 mb-6 max-w-md mx-auto">
                Creez votre premiere saison pour lancer le classement saisonnier et recompenser vos meilleurs joueurs.
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Creer une saison
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
