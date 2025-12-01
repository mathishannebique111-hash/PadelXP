"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TournamentRegisterFormProps = {
  tournamentId: string;
  alreadyRegistered: boolean;
  playerName: string;
  initialPlayerLicense?: string;
};

export function TournamentRegisterForm({
  tournamentId,
  alreadyRegistered,
  playerName,
  initialPlayerLicense = "",
}: TournamentRegisterFormProps) {
  const [form, setForm] = useState({
    playerLicense: initialPlayerLicense || "",
    playerRank: "",
    partnerName: "",
    partnerLicense: "",
    partnerRank: "",
    acceptTerms: false,
  });

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (alreadyRegistered) {
    return (
      <p className="text-sm text-emerald-400">
        Vous êtes déjà inscrit à ce tournoi.
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!form.playerLicense || !form.playerRank || !form.partnerName || !form.partnerLicense || !form.partnerRank) {
      setError("Merci de remplir toutes les informations obligatoires, y compris les classements nationaux.");
      return;
    }
    if (!form.acceptTerms) {
      setError("Vous devez accepter les CGV pour vous inscrire.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_license: form.playerLicense,
          player_rank: parseInt(form.playerRank, 10),
          partner_name: form.partnerName,
          partner_license: form.partnerLicense,
          partner_rank: parseInt(form.partnerRank, 10),
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      setSuccess(true);
      // Optionnel : router.refresh();
    } catch (err: any) {
      setError(
        err.message || "Erreur lors de l'inscription au tournoi."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-2 rounded bg-red-500/10 border border-red-500/40 text-sm text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/40 text-sm text-emerald-300">
          Réservation enregistrée. Vous recevrez la confirmation du club.
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-white">Mes informations</h3>
        <Input
          value={playerName}
          readOnly
          className="bg-black/40 border-white/10 text-white cursor-default"
          aria-label="Mon nom et prénom"
        />
        <Input
          placeholder="Licence personnelle"
          value={form.playerLicense}
          onChange={(e) =>
            setForm((f) => ({ ...f, playerLicense: e.target.value }))
          }
          className="bg-black/40 border-white/10 text-white"
          disabled={pending}
        />
        <Input
          type="number"
          placeholder="Mon classement national (ex: 50000)"
          value={form.playerRank}
          onChange={(e) =>
            setForm((f) => ({ ...f, playerRank: e.target.value }))
          }
          className="bg-black/40 border-white/10 text-white"
          disabled={pending}
          min="1"
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-white">Mon partenaire</h3>
        <Input
          placeholder="Nom Prénom"
          value={form.partnerName}
          onChange={(e) =>
            setForm((f) => ({ ...f, partnerName: e.target.value }))
          }
          className="bg-black/40 border-white/10 text-white"
          disabled={pending}
        />
        <Input
          placeholder="Licence du partenaire"
          value={form.partnerLicense}
          onChange={(e) =>
            setForm((f) => ({ ...f, partnerLicense: e.target.value }))
          }
          className="bg-black/40 border-white/10 text-white"
          disabled={pending}
        />
        <Input
          type="number"
          placeholder="Classement national du partenaire (ex: 40000)"
          value={form.partnerRank}
          onChange={(e) =>
            setForm((f) => ({ ...f, partnerRank: e.target.value }))
          }
          className="bg-black/40 border-white/10 text-white"
          disabled={pending}
          min="1"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-200">
        <input
          type="checkbox"
          checked={form.acceptTerms}
          onChange={(e) =>
            setForm((f) => ({ ...f, acceptTerms: e.target.checked }))
          }
          disabled={pending}
          className="h-4 w-4"
        />
        <span>J&apos;ai lu et j&apos;accepte les CGV</span>
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? "Réservation en cours..." : "Réserver"}
      </Button>
    </form>
  );
}

