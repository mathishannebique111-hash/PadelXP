"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MATCH_FORMATS, type Tournament } from "@/lib/types/tournaments";
import Link from "next/link";

const TOURNAMENT_TYPES = [
  { value: "official_knockout", label: "Élimination directe (TDL)" },
  { value: "tmc", label: "Tournoi Multi-Chances (TMC)" },
  { value: "double_elimination", label: "Double élimination" },
  { value: "official_pools", label: "Poules + Tableau final" },
] as const;

export function CreateTournamentForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "P100",
    tournament_type: "official_pools" as Tournament["tournament_type"],
    match_format: "B1" as Tournament["match_format"],
    start_date: "",
    end_date: "",
    inscription_fee: 10,
    max_teams: 16,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      // Validation basique
      if (!form.name.trim()) {
        throw new Error("Le nom du tournoi est requis");
      }

      if (!form.start_date || !form.end_date) {
        throw new Error("Les dates de début et de fin sont requises");
      }

      const startDate = new Date(form.start_date);
      const endDate = new Date(form.end_date);

      if (endDate < startDate) {
        throw new Error("La date de fin doit être après la date de début");
      }

      // Calculer les dates d'inscription (ouverture 7 jours avant, fermeture 1 jour avant)
      const registrationCloseDate = new Date(startDate);
      registrationCloseDate.setDate(registrationCloseDate.getDate() - 1);

      const registrationOpenDate = new Date(startDate);
      registrationOpenDate.setDate(registrationOpenDate.getDate() - 7);

      // Sécurise l'ordre des dates pour respecter la contrainte valid_dates en base
      if (registrationOpenDate >= registrationCloseDate) {
        registrationOpenDate.setDate(registrationCloseDate.getDate() - 1);
      }

      const body = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        tournament_type: form.tournament_type,
        match_format: form.match_format,
        registration_open_date: registrationOpenDate.toISOString(),
        registration_close_date: registrationCloseDate.toISOString(),
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        available_courts: [1, 2],
        match_duration_minutes: 90,
        inscription_fee: Number(form.inscription_fee) || 0,
        max_teams: Number(form.max_teams) || 16,
        prize_money: null,
      };

      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message || json.error || `Erreur HTTP ${res.status}`);
      }

      const json = await res.json();
      
      // Rediriger vers la liste des tournois
      router.push("/dashboard/tournaments");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création du tournoi");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <p className="text-sm text-red-300 font-medium">
            {error}
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-white/90 font-medium">Nom du tournoi *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Tournoi MD200 de janvier"
            required
            disabled={pending}
            className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 focus:ring-1 focus:ring-white/20 h-11 px-4 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category" className="text-white/90 font-medium">Catégorie *</Label>
          <Select
            value={form.category}
            onValueChange={(value) => setForm({ ...form, category: value })}
            disabled={pending}
          >
            <SelectTrigger id="category" className="bg-white/5 border-white/20 text-white focus:border-white/40 focus:ring-1 focus:ring-white/20 h-11 px-4 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="P25">P25</SelectItem>
              <SelectItem value="P100">P100</SelectItem>
              <SelectItem value="P250">P250</SelectItem>
              <SelectItem value="P500">P500</SelectItem>
              <SelectItem value="P1000">P1000</SelectItem>
              <SelectItem value="P1500">P1500</SelectItem>
              <SelectItem value="P2000">P2000</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-white/90 font-medium">Description</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Informations complémentaires sur le tournoi"
          rows={3}
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
              setForm({
                ...form,
                tournament_type: value as Tournament["tournament_type"],
              })
            }
            className="grid gap-2"
            disabled={pending}
          >
            {TOURNAMENT_TYPES.map((type) => (
              <Label
                key={type.value}
                className="flex items-center space-x-3 rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white hover:bg-white/10 hover:border-white/30 transition-all cursor-pointer"
              >
                <RadioGroupItem
                  value={type.value}
                  className="border-white/40"
                />
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
            onValueChange={(value: any) => setForm({ ...form, match_format: value })}
            disabled={pending}
          >
            <SelectTrigger id="match_format" className="bg-white/5 border-white/20 text-white focus:border-white/40 focus:ring-1 focus:ring-white/20 h-11 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(MATCH_FORMATS).map(([key, format]) => (
                <SelectItem key={key} value={key}>
                  {key} – {format.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="start_date" className="text-white/90 font-medium">Date de début *</Label>
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
          <Label htmlFor="end_date" className="text-white/90 font-medium">Date de fin *</Label>
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
          <Label htmlFor="inscription_fee" className="text-white/90 font-medium">Frais d'inscription (€/paire) *</Label>
          <Input
            id="inscription_fee"
            type="number"
            min={0}
            max={20}
            step={0.5}
            value={form.inscription_fee}
            onChange={(e) => setForm({ ...form, inscription_fee: Number(e.target.value) })}
            required
            disabled={pending}
            className="bg-white/5 border-white/20 text-white focus:border-white/40 focus:ring-1 focus:ring-white/20 h-11 px-4 text-base"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="max_teams" className="text-white/90 font-medium">Nombre maximum d'équipes *</Label>
        <Input
          id="max_teams"
          type="number"
          min={4}
          max={64}
          step={4}
          value={form.max_teams}
          onChange={(e) => setForm({ ...form, max_teams: Number(e.target.value) })}
          required
          disabled={pending}
          className="bg-white/5 border-white/20 text-white focus:border-white/40 focus:ring-1 focus:ring-white/20"
        />
        <p className="text-xs text-white/50 mt-1">
          Doit être une puissance de 2 (4, 8, 16, 32, 64) pour un tableau éliminatoire
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
        <Button 
          type="button" 
          variant="outline" 
          disabled={pending} 
          asChild
          className="bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/30 text-white"
        >
          <Link href="/dashboard/tournaments">Annuler</Link>
        </Button>
        <Button 
          type="submit" 
          disabled={pending}
          className="bg-gradient-to-r from-[#0066FF] to-[#00CC99] text-white border border-white/25 shadow-[0_6px_20px_rgba(0,102,255,0.35)] hover:shadow-[0_8px_24px_rgba(0,102,255,0.45)] hover:scale-105 active:scale-100 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {pending ? "Création en cours..." : "Créer le tournoi"}
        </Button>
      </div>
    </form>
  );
}

