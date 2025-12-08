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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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


  async function handleDelete() {
    setActionPending("delete");
    setError(null);
    setShowDeleteConfirm(false);

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
    <Card className="rounded-lg sm:rounded-xl md:rounded-2xl border border-white/80 ring-1 ring-white/10 bg-white/5">
      <CardHeader>
        <CardTitle className="text-white">
          {tournament.name} — {renderStatusLabel(tournament.status)} (
          {formatDateRange(tournament.start_date, tournament.end_date)})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 mb-4">
            <p className="text-sm text-red-300 font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white/90 font-medium">
                Nom du tournoi *
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                disabled={pending}
                className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 focus:ring-1 focus:ring-white/20 h-11 px-4 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-white/90 font-medium">
                Catégorie *
              </Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm({ ...form, category: value })}
                disabled={pending}
              >
                <SelectTrigger
                  id="category"
                  className="bg-white/5 border-white/20 text-white focus:border-white/40 focus:ring-1 focus:ring-white/20 h-11 px-4 text-base"
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
            <Label htmlFor="description" className="text-white/90 font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              disabled={pending}
              className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 focus:ring-1 focus:ring-white/20"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <Label className="text-white/90 font-medium">Type de tournoi *</Label>
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
                    className="flex items-center space-x-3 rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white hover:bg-white/10 hover:border-white/30 transition-all cursor-pointer"
                  >
                    <RadioGroupItem value={type.value} className="border-white/40" />
                    <span className="text-sm">{type.label}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label htmlFor="match_format" className="text-white/90 font-medium">
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
                  className="bg-white/5 border-white/20 text-white focus:border-white/40 focus:ring-1 focus:ring-white/20 h-11 text-sm"
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
              <Label htmlFor="start_date" className="text-white/90 font-medium">
                Date de début *
              </Label>
              <Input
                id="start_date"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                required
                disabled={pending}
                className="bg-white/5 border-white/20 text-white focus:border-white/40 focus:ring-1 focus:ring-white/20 h-11 px-4 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date" className="text-white/90 font-medium">
                Date de fin *
              </Label>
              <Input
                id="end_date"
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                required
                disabled={pending}
                className="bg-white/5 border-white/20 text-white focus:border-white/40 focus:ring-1 focus:ring-white/20 h-11 px-4 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inscription_fee" className="text-white/90 font-medium">
                Frais d'inscription (€/paire) *
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
                className="bg-white/5 border-white/20 text-white focus:border-white/40 focus:ring-1 focus:ring-white/20 h-11 px-4 text-base"
              />
            </div>
          </div>

          <CardFooter className="flex flex-col gap-4 px-0">
            <div className="flex flex-wrap items-center justify-center gap-4 border-t border-white/10 pt-6 w-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canOpen || actionPending === "open" || pending}
                onClick={() => handleStatusChange("open")}
                className="bg-white border-white/30 text-black hover:bg-white/90 hover:border-white/40 transition-all"
              >
                {actionPending === "open" ? "Mise à jour..." : "Ouvrir les inscriptions"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canClose || actionPending === "registration_closed" || pending}
                onClick={() => handleStatusChange("registration_closed")}
                className="bg-white border-white/30 text-black hover:bg-white/90 hover:border-white/40 transition-all"
              >
                {actionPending === "registration_closed"
                  ? "Mise à jour..."
                  : "Clore les inscriptions"}
              </Button>
            </div>
            <div className="flex items-center justify-between w-full">
              {showDeleteConfirm ? (
                <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 space-y-3">
                  <p className="text-sm text-white">
                    Êtes-vous sûr de vouloir supprimer le tournoi <strong>"{tournament.name}"</strong> ?
                  </p>
                  <p className="text-xs text-red-300">
                    Cette action est irréversible et supprimera toutes les inscriptions et données associées.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={actionPending === "delete"}
                      onClick={handleDelete}
                    >
                      {actionPending === "delete" ? "Suppression..." : "Confirmer la suppression"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={actionPending === "delete"}
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setError(null);
                      }}
                      className="bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/30 text-white"
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={!canDelete || actionPending === "delete" || pending}
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Supprimer le tournoi
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={pending}
                className="bg-gradient-to-r from-[#0066FF]/80 to-[#00CC99]/80 text-white border border-white/40 hover:border-white/60 shadow-[0_4px_16px_rgba(0,102,255,0.3)] hover:shadow-[0_6px_20px_rgba(0,102,255,0.4)] hover:scale-[1.02] active:scale-100 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {pending ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
            </div>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}


