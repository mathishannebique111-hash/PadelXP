"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MATCH_FORMATS } from "@/lib/types/tournaments";
import Link from "next/link";

export function CreateTournamentForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "P100",
    tournament_type: "official_pools" as "official_knockout" | "official_pools" | "americano" | "mexicano" | "custom",
    match_format: "B1" as "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "D1" | "D2" | "E" | "F",
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

      // Calculer les dates d'inscription (par défaut : ouvertes maintenant, fermées 1 jour avant le début)
      const registrationCloseDate = new Date(startDate);
      registrationCloseDate.setDate(registrationCloseDate.getDate() - 1);

      const body = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        tournament_type: form.tournament_type,
        match_format: form.match_format,
        registration_open_date: new Date().toISOString(),
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
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">
            {error}
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-white">Nom du tournoi *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Tournoi MD200 de janvier"
            required
            disabled={pending}
            className="bg-black/40 border-white/10 text-white"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category" className="text-white">Catégorie *</Label>
          <Select
            value={form.category}
            onValueChange={(value) => setForm({ ...form, category: value })}
            disabled={pending}
          >
            <SelectTrigger id="category" className="bg-black/40 border-white/10 text-white">
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
        <Label htmlFor="description" className="text-white">Description</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Informations complémentaires sur le tournoi"
          rows={3}
          disabled={pending}
          className="bg-black/40 border-white/10 text-white"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-white">Type de tournoi *</Label>
          <RadioGroup
            value={form.tournament_type}
            onValueChange={(value: any) => setForm({ ...form, tournament_type: value })}
            className="space-y-2"
            disabled={pending}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="official_pools" id="type-pools" />
              <Label htmlFor="type-pools" className="text-white/90 cursor-pointer">Poules + Tableau Final</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="official_knockout" id="type-ko" />
              <Label htmlFor="type-ko" className="text-white/90 cursor-pointer">Élimination directe</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="americano" id="type-americano" />
              <Label htmlFor="type-americano" className="text-white/90 cursor-pointer">Americano</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="mexicano" id="type-mexicano" />
              <Label htmlFor="type-mexicano" className="text-white/90 cursor-pointer">Mexicano</Label>
            </div>
          </RadioGroup>
        </div>
        <div className="space-y-2">
          <Label htmlFor="match_format" className="text-white">Format des matchs *</Label>
          <Select
            value={form.match_format}
            onValueChange={(value: any) => setForm({ ...form, match_format: value })}
            disabled={pending}
          >
            <SelectTrigger id="match_format" className="bg-black/40 border-white/10 text-white">
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
          <Label htmlFor="start_date" className="text-white">Date de début *</Label>
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
          <Label htmlFor="end_date" className="text-white">Date de fin *</Label>
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
          <Label htmlFor="inscription_fee" className="text-white">Frais d'inscription (€/paire) *</Label>
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
            className="bg-black/40 border-white/10 text-white"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="max_teams" className="text-white">Nombre maximum d'équipes *</Label>
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
          className="bg-black/40 border-white/10 text-white"
        />
        <p className="text-xs text-gray-400">
          Doit être une puissance de 2 (4, 8, 16, 32, 64) pour un tableau éliminatoire
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" disabled={pending} asChild>
          <Link href="/dashboard/tournaments">Annuler</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Création en cours..." : "Créer le tournoi"}
        </Button>
      </div>
    </form>
  );
}

