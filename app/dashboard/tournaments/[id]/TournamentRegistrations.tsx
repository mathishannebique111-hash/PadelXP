"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type RegistrationStatus = "pending" | "validated" | "rejected";

type Registration = {
  id: string;
  player_id: string;
  player_name: string;
  player_rank: number | null;
  player_license: string | null;
  partner_name: string | null;
  partner_rank: number | null;
  partner_license: string | null;
  pair_total_rank: number | null;
  seed_number: number | null;
  status: RegistrationStatus;
  created_at: string;
};

export default function TournamentRegistrations({
  tournamentId,
}: {
  tournamentId: string;
}) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRegistrations(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  async function fetchRegistrations(showLoading = false) {
    if (showLoading) {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/registrations`,
        {
          cache: "no-store",
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors du chargement des inscriptions");
      }
      setRegistrations(data.registrations || []);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des inscriptions");
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(
    registrationId: string,
    action: "validate" | "reject"
  ) {
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/registrations/${registrationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la mise à jour");
      }
      await fetchRegistrations(false);
    } catch (err: any) {
      alert(err.message || "Erreur lors de la mise à jour de l'inscription");
    }
  }

  async function handleSaveDetails(reg: Registration) {
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/registrations/${reg.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            player_name: reg.player_name || "",
            player_rank: reg.player_rank ? parseInt(reg.player_rank.toString(), 10) : undefined,
            partner_name: reg.partner_name || "",
            partner_rank: reg.partner_rank ? parseInt(reg.partner_rank.toString(), 10) : undefined,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'enregistrement");
      }
      await fetchRegistrations(false);
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'enregistrement de l'inscription");
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-300">Chargement des inscriptions...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Inscriptions</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          title="À implémenter : ajout manuel d'une paire"
        >
          Ajouter une inscription manuelle
        </Button>
      </div>

      {registrations.length === 0 ? (
        <p className="text-sm text-gray-300">
          Aucune inscription pour le moment.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-white/70 w-[180px]">
                  Joueur 1
                </TableHead>
                <TableHead className="text-white/70 w-[100px]">
                  Rang 1
                </TableHead>
                <TableHead className="text-white/70 w-[200px]">
                  Joueur 2
                </TableHead>
                <TableHead className="text-white/70 w-[100px]">
                  Rang 2
                </TableHead>
                <TableHead className="text-white/70 w-[100px]">
                  Total
                </TableHead>
                <TableHead className="text-white/70 w-[80px]">
                  TS
                </TableHead>
                <TableHead className="text-white/70 w-[100px]">Statut</TableHead>
                <TableHead className="text-white/70 w-[160px]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.map((reg) => (
                <TableRow key={reg.id}>
                  <TableCell className="text-white">
                    <Input
                      value={reg.player_name ?? ""}
                      placeholder="Nom Prénom joueur 1"
                      className="bg-black/40 border-white/10 text-white h-8"
                      onChange={(e) =>
                        setRegistrations((prev) =>
                          prev.map((r) =>
                            r.id === reg.id
                              ? { ...r, player_name: e.target.value }
                              : r
                          )
                        )
                      }
                      onBlur={() => handleSaveDetails(reg)}
                    />
                  </TableCell>
                  <TableCell className="text-white/80">
                    <Input
                      type="number"
                      value={reg.player_rank ?? ""}
                      placeholder="Rang"
                      className="bg-black/40 border-white/10 text-white h-8 w-[90px]"
                      onChange={(e) => {
                        const val = e.target.value;
                        setRegistrations((prev) =>
                          prev.map((r) => {
                            if (r.id === reg.id) {
                              const newPlayerRank = val ? parseInt(val, 10) : null;
                              const newTotal = newPlayerRank && r.partner_rank
                                ? newPlayerRank + r.partner_rank
                                : null;
                              return {
                                ...r,
                                player_rank: newPlayerRank,
                                pair_total_rank: newTotal,
                              };
                            }
                            return r;
                          })
                        );
                      }}
                      onBlur={() => handleSaveDetails(reg)}
                    />
                  </TableCell>
                  <TableCell className="text-white/80">
                    <Input
                      value={reg.partner_name ?? ""}
                      placeholder="Nom Prénom partenaire"
                      className="bg-black/40 border-white/10 text-white h-8"
                      onChange={(e) =>
                        setRegistrations((prev) =>
                          prev.map((r) =>
                            r.id === reg.id
                              ? { ...r, partner_name: e.target.value }
                              : r
                          )
                        )
                      }
                      onBlur={() => handleSaveDetails(reg)}
                    />
                  </TableCell>
                  <TableCell className="text-white/80">
                    <Input
                      type="number"
                      value={reg.partner_rank ?? ""}
                      placeholder="Rang"
                      className="bg-black/40 border-white/10 text-white h-8 w-[90px]"
                      onChange={(e) => {
                        const val = e.target.value;
                        setRegistrations((prev) =>
                          prev.map((r) => {
                            if (r.id === reg.id) {
                              const newPartnerRank = val ? parseInt(val, 10) : null;
                              const newTotal = r.player_rank && newPartnerRank
                                ? r.player_rank + newPartnerRank
                                : null;
                              return {
                                ...r,
                                partner_rank: newPartnerRank,
                                pair_total_rank: newTotal,
                              };
                            }
                            return r;
                          })
                        );
                      }}
                      onBlur={() => handleSaveDetails(reg)}
                    />
                  </TableCell>
                  <TableCell className="text-white/80">
                    <span className="text-sm font-medium">
                      {reg.pair_total_rank ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-white/80">
                    {reg.seed_number ? (
                      <span className="text-sm font-bold text-yellow-400">
                        TS{reg.seed_number}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-white/80">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        reg.status === "validated"
                          ? "bg-green-500/20 text-green-300"
                          : reg.status === "rejected"
                          ? "bg-red-500/20 text-red-300"
                          : "bg-yellow-500/20 text-yellow-200"
                      }`}
                    >
                      {reg.status === "pending" && "En attente"}
                      {reg.status === "validated" && "Validée"}
                      {reg.status === "rejected" && "Refusée"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {reg.status !== "validated" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(reg.id, "validate")}
                        >
                          Valider
                        </Button>
                      )}
                      {reg.status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(reg.id, "reject")}
                        >
                          Refuser
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}


