"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MATCH_FORMATS } from "@/lib/types/tournaments";
import type { Tournament } from "@/lib/types/tournaments";

const CATEGORIES = ["P25", "P100", "P250", "P500", "P1000", "P1500", "P2000"] as const;

const TOURNAMENT_TYPES = [
  { value: "official_knockout", label: "Élimination directe (TDL)" },
  { value: "tmc", label: "Tournoi Multi-Chances (TMC)" },
  { value: "double_elimination", label: "Double élimination" },
  { value: "official_pools", label: "Poules + Tableau final" },
  {
    value: "pools_triple_draw",
    label: "Poules + 3 tableaux (principal / intermédiaire / consolante)",
  },
  { value: "round_robin", label: "Round-robin pur" },
  { value: "americano", label: "Americano (format social)" },
  { value: "mexicano", label: "Mexicano (format social)" },
  { value: "custom", label: "Personnalisé" },
] as const;

function renderStatusLabel(status: string) {
  switch (status) {
    case "draft":
      return "Brouillon";
    case "open":
      return "Inscriptions ouvertes";
    case "registration_closed":
      return "Inscriptions clôturées";
    case "draw_published":
      return "Tableau publié";
    case "in_progress":
      return "En cours";
    case "completed":
      return "Terminé";
    case "cancelled":
      return "Annulé";
    default:
      return status;
  }
}

function formatDateRange(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit" };
  const startStr = startDate.toLocaleDateString("fr-FR", options);
  const endStr = endDate.toLocaleDateString("fr-FR", options);
  if (startStr === endStr) return startStr;
  return `${startStr} – ${endStr}`;
}

export function TournamentDetailsForm({ tournament }: { tournament: Tournament }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: tournament.name || "",
    description: tournament.description || "",
    category: tournament.category || "P100",
    tournament_type: tournament.tournament_type || "official_pools",
    match_format: tournament.match_format || "B1",
    start_date: tournament.start_date ? tournament.start_date.slice(0, 10) : "",
    end_date: tournament.end_date ? tournament.end_date.slice(0, 10) : "",
    inscription_fee: tournament.inscription_fee ?? 0,
  });

  const canOpen = tournament.status === "draft" || tournament.status === "registration_closed";
  const canClose = tournament.status === "open";
  const canGenerate = tournament.status === "registration_closed";
  const canSchedule = tournament.status === "draw_published" || tournament.status === "in_progress";
  const canDelete = tournament.status !== "in_progress" && tournament.status !== "completed";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        tournament_type: form.tournament_type,
        match_format: form.match_format,
        start_date: new Date(form.start_date || tournament.start_date).toISOString(),
        end_date: new Date(form.end_date || tournament.end_date).toISOString(),
        inscription_fee: Number(form.inscription_fee) || 0,
      };

      const res = await fetch(`/api/tournaments/${tournament.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement du tournoi");
    } finally {
      setPending(false);
    }
  }

  async function handleStatusChange(status: "open" | "registration_closed") {
    setActionPending(status);
    setError(null);

    try {
      const res = await fetch(`/api/tournaments/${tournament.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      router.refresh();
    } catch (err: any) {
      setError(
        err.message ||
          (status === "open"
            ? "Erreur lors de l'ouverture des inscriptions"
            : "Erreur lors de la clôture des inscriptions")
      );
    } finally {
      setActionPending(null);
    }
  }

  async function handleGenerate() {
    setActionPending("generate");
    setError(null);

    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/generate`, {
        method: "POST",
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la génération du tableau");
    } finally {
      setActionPending(null);
    }
  }

  async function handleSchedule() {
    setActionPending("schedule");
    setError(null);

    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/schedule`, {
        method: "POST",
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la planification des matchs");
    } finally {
      setActionPending(null);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer le tournoi "${tournament.name}" ?\n\nCette action est irréversible et supprimera toutes les inscriptions et données associées.`
    );

    if (!confirmed) {
      return;
    }

    setActionPending("delete");
    setError(null);

    try {
      const res = await fetch(`/api/tournaments/${tournament.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      // Rediriger vers la liste des tournois après suppression réussie
      router.push("/dashboard/tournaments");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression du tournoi");
      setActionPending(null);
    }
  }

  return (
    <Card className="bg-black/40 border-white/10">
      <CardHeader>
        <CardTitle className="text-white">
          {tournament.name} — {renderStatusLabel(tournament.status)} (
          {formatDateRange(tournament.start_date, tournament.end_date)})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">
                Nom du tournoi *
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                disabled={pending}
                className="bg-black/40 border-white/10 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-white">
                Catégorie *
              </Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm({ ...form, category: value })}
                disabled={pending}
              >
                <SelectTrigger
                  id="category"
                  className="bg-black/40 border-white/10 text-white"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-white">
              Description
            </Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              disabled={pending}
              className="bg-black/40 border-white/10 text-white"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-white">Type de tournoi *</Label>
              <RadioGroup
                value={form.tournament_type}
                onValueChange={(value) =>
                  setForm({ ...form, tournament_type: value as Tournament["tournament_type"] })
                }
                className="grid gap-2"
              >
                {TOURNAMENT_TYPES.map((type) => (
                  <Label
                    key={type.value}
                    className="flex items-center space-x-2 rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white"
                  >
                    <RadioGroupItem value={type.value} className="border-white/40" />
                    <span>{type.label}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="match_format" className="text-white">
                Format de match *
              </Label>
              <Select
                value={form.match_format}
                onValueChange={(value) =>
                  setForm({ ...form, match_format: value as Tournament["match_format"] })
                }
                disabled={pending}
              >
                <SelectTrigger
                  id="match_format"
                  className="bg-black/40 border-white/10 text-white"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MATCH_FORMATS).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {key} — {value.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="start_date" className="text-white">
                Début *
              </Label>
              <Input
                id="start_date"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                required
                disabled={pending}
                className="bg-black/40 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date" className="text-white">
                Fin *
              </Label>
              <Input
                id="end_date"
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                required
                disabled={pending}
                className="bg-black/40 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inscription_fee" className="text-white">
                Frais d'inscription (€) *
              </Label>
              <Input
                id="inscription_fee"
                type="number"
                step="0.5"
                min="0"
                max="20"
                value={form.inscription_fee}
                onChange={(e) =>
                  setForm({ ...form, inscription_fee: Number(e.target.value) })
                }
                required
                disabled={pending}
                className="bg-black/40 border-white/10 text-white"
              />
            </div>
          </div>

          <CardFooter className="flex flex-col gap-4 px-0">
            <div className="flex justify-between items-center gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={!canDelete || actionPending === "delete" || pending}
                onClick={handleDelete}
              >
                {actionPending === "delete" ? "Suppression..." : "Supprimer le tournoi"}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4 w-full">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canOpen || actionPending === "open" || pending}
                  onClick={() => handleStatusChange("open")}
                >
                  {actionPending === "open" ? "Mise à jour..." : "Ouvrir les inscriptions"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canClose || actionPending === "registration_closed" || pending}
                  onClick={() => handleStatusChange("registration_closed")}
                >
                  {actionPending === "registration_closed"
                    ? "Mise à jour..."
                    : "Clore les inscriptions"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canGenerate || actionPending === "generate" || pending}
                  onClick={handleGenerate}
                >
                  {actionPending === "generate" ? "Génération..." : "Générer le tableau"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canSchedule || actionPending === "schedule" || pending}
                  onClick={handleSchedule}
                >
                  {actionPending === "schedule" ? "Planification..." : "Planifier les matchs"}
                </Button>
              </div>
            </div>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}


