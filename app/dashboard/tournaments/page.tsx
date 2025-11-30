import { logger } from "@/lib/logger";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Helper pour appeler l'API interne qui gère l'auth et les permissions
async function fetchTournaments() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/tournaments`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return { data: [], error: new Error(`HTTP ${res.status}`) };
    }

    const json = await res.json();
    return { data: json.tournaments || [], error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}

function renderTournamentType(type: string) {
  switch (type) {
    case "official_knockout":
      return "Élimination directe";
    case "official_pools":
      return "Poules + Tableau Final";
    case "americano":
      return "Americano";
    case "mexicano":
      return "Mexicano";
    default:
      return "Personnalisé";
  }
}

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

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "open":
      return "default";
    case "in_progress":
      return "default";
    case "completed":
      return "secondary";
    case "draft":
      return "outline";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
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

export default async function TournamentsPage() {
  const { data: tournaments, error } = await fetchTournaments();

  // Logger en cas d'erreur
  if (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Error fetching tournaments in dashboard page"
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tournois du club</h1>
          <p className="text-sm text-gray-400 mt-1">
            Créez et gérez les tournois organisés par votre club.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/tournaments/create">
            Créer un tournoi
          </Link>
        </Button>
      </div>

      <Card className="bg-black/40 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Liste des tournois</CardTitle>
        </CardHeader>
        <CardContent>
          {!tournaments || tournaments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-400 mb-4">
                Aucun tournoi pour le moment. Créez votre premier tournoi avec le bouton ci-dessus.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-white/70">Nom</TableHead>
                    <TableHead className="text-white/70">Catégorie</TableHead>
                    <TableHead className="text-white/70">Type</TableHead>
                    <TableHead className="text-white/70">Dates</TableHead>
                    <TableHead className="text-white/70">Statut</TableHead>
                    <TableHead className="text-right text-white/70">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tournaments.map((tournament: any) => (
                    <TableRow key={tournament.id} className="border-white/10">
                      <TableCell className="text-white">{tournament.name}</TableCell>
                      <TableCell className="text-white/90">{tournament.category}</TableCell>
                      <TableCell className="text-white/90">{renderTournamentType(tournament.tournament_type)}</TableCell>
                      <TableCell className="text-white/90">
                        {formatDateRange(tournament.start_date, tournament.end_date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(tournament.status)}>
                          {renderStatusLabel(tournament.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/dashboard/tournaments/${tournament.id}`}>
                            Gérer
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
