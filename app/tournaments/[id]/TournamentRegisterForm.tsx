"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TournamentRegisterFormProps = {
  tournamentId: string;
  alreadyRegistered: boolean;
  initialPlayerLicense?: string;
  registrationId?: string | null;
};

export function TournamentRegisterForm({
  tournamentId,
  alreadyRegistered,
  initialPlayerLicense = "",
  registrationId,
}: TournamentRegisterFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    playerFirstName: "",
    playerLastName: "",
    playerLicense: initialPlayerLicense || "",
    playerRank: "",
    partnerFirstName: "",
    partnerLastName: "",
    partnerLicense: "",
    partnerRank: "",
    acceptTerms: false,
  });

  const [pending, setPending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleCancel() {
    if (!registrationId) return;
    
    setCancelling(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/register/${registrationId}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      // Recharger la page pour mettre à jour l'affichage
      router.refresh();
    } catch (err: any) {
      setError(
        err.message || "Erreur lors de l'annulation de l'inscription."
      );
    } finally {
      setCancelling(false);
    }
  }

  if (alreadyRegistered) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-center">
          <p className="text-sm text-emerald-300 font-medium mb-2">
            Réservation enregistrée
          </p>
          <p className="text-sm text-emerald-200/80">
            Votre réservation a bien été enregistrée. Vous recevrez une confirmation du club.
          </p>
        </div>
        {registrationId && (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={cancelling}
              className="bg-transparent hover:bg-white/10 border-white/20 hover:border-white/30 text-white"
            >
              {cancelling ? "Annulation en cours..." : "Annuler mon inscription"}
            </Button>
          </div>
        )}
        {error && (
          <div className="p-2 rounded bg-red-500/10 border border-red-500/40 text-sm text-red-300 text-center">
            {error}
          </div>
        )}
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!form.playerFirstName || !form.playerLastName || !form.playerLicense || !form.playerRank || !form.partnerFirstName || !form.partnerLastName || !form.partnerLicense || !form.partnerRank) {
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
          player_first_name: form.playerFirstName.trim(),
          player_last_name: form.playerLastName.trim(),
          player_license: form.playerLicense,
          player_rank: parseInt(form.playerRank, 10),
          partner_first_name: form.partnerFirstName.trim(),
          partner_last_name: form.partnerLastName.trim(),
          partner_license: form.partnerLicense,
          partner_rank: parseInt(form.partnerRank, 10),
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      setSuccess(true);
      // Recharger la page pour afficher le message de confirmation
      setTimeout(() => {
        router.refresh();
      }, 1000);
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
        <div className="p-2 rounded bg-red-500/10 border border-red-500/40 text-sm text-red-300 text-center">
          {error}
        </div>
      )}
      {success && (
        <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/40 text-sm text-emerald-300 text-center">
          Réservation enregistrée. Vous recevrez la confirmation du club.
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-white text-center">Mes informations</h3>
        <Input
          placeholder="Prénom"
          value={form.playerFirstName}
          onChange={(e) =>
            setForm((f) => ({ ...f, playerFirstName: e.target.value }))
          }
          className="bg-black/40 border-white/10 text-white w-2/3 mx-auto"
          disabled={pending}
          required
        />
        <Input
          placeholder="Nom"
          value={form.playerLastName}
          onChange={(e) =>
            setForm((f) => ({ ...f, playerLastName: e.target.value }))
          }
          className="bg-black/40 border-white/10 text-white w-2/3 mx-auto"
          disabled={pending}
          required
        />
        <Input
          placeholder="Licence personnelle"
          value={form.playerLicense}
          onChange={(e) =>
            setForm((f) => ({ ...f, playerLicense: e.target.value }))
          }
          className="bg-black/40 border-white/10 text-white w-2/3 mx-auto"
          disabled={pending}
          required
        />
        <Input
          type="number"
          placeholder="Mon classement national"
          value={form.playerRank}
          onChange={(e) =>
            setForm((f) => ({ ...f, playerRank: e.target.value }))
          }
          className="bg-black/40 border-white/10 text-white w-2/3 mx-auto"
          disabled={pending}
          min="1"
          required
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-white text-center">Mon partenaire</h3>
        <Input
          placeholder="Prénom"
          value={form.partnerFirstName}
          onChange={(e) =>
            setForm((f) => ({ ...f, partnerFirstName: e.target.value }))
          }
          className="bg-black/40 border-white/10 text-white w-2/3 mx-auto"
          disabled={pending}
          required
        />
        <Input
          placeholder="Nom"
          value={form.partnerLastName}
          onChange={(e) =>
            setForm((f) => ({ ...f, partnerLastName: e.target.value }))
          }
          className="bg-black/40 border-white/10 text-white w-2/3 mx-auto"
          disabled={pending}
          required
        />
        <Input
          placeholder="Licence du partenaire"
          value={form.partnerLicense}
          onChange={(e) =>
            setForm((f) => ({ ...f, partnerLicense: e.target.value }))
          }
          className="bg-black/40 border-white/10 text-white w-2/3 mx-auto"
          disabled={pending}
          required
        />
        <Input
          type="number"
          placeholder="Classement national du partenaire"
          value={form.partnerRank}
          onChange={(e) =>
            setForm((f) => ({ ...f, partnerRank: e.target.value }))
          }
          className="bg-black/40 border-white/10 text-white w-2/3 mx-auto"
          disabled={pending}
          min="1"
          required
        />
      </div>

      <label className="flex items-center justify-center gap-2 text-sm text-gray-200">
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

      <div className="flex justify-center">
        <Button type="submit" disabled={pending}>
          {pending ? "Réservation en cours..." : "Réserver"}
        </Button>
      </div>
    </form>
  );
}

