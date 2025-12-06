import { logger } from "@/lib/logger";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserClubInfo } from "@/lib/utils/club-utils";
import PageTitle from "../PageTitle";

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
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return redirect("/clubs/login?next=/dashboard/tournaments");
  }

  const clubInfo = await getUserClubInfo();
  const clubId = clubInfo.clubId;

  if (!clubId) {
    logger.warn(
      { userId: user.id.substring(0, 8) + "…" },
      "[dashboard/tournaments] No clubId found for user; showing empty tournaments list"
    );
  }

  let tournaments: any[] = [];

  if (clubId) {
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("club_id", clubId)
      .order("start_date", { ascending: false });

    if (error) {
      logger.error(
        {
          userId: user.id.substring(0, 8) + "…",
          clubId: clubId.substring(0, 8) + "…",
          error: error.message,
        },
        "Error fetching tournaments in dashboard page"
      );
    }

    tournaments = data || [];
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <PageTitle 
          title="Tournois du club" 
          subtitle="Créez et gérez les tournois organisés par votre club."
          className="flex-1"
        />
        <Link
          href="/dashboard/tournaments/create"
          className="inline-flex items-center gap-2 rounded-lg sm:rounded-xl px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-[#0066FF]/80 to-[#00CC99]/80 border border-white/40 hover:border-white/60 shadow-[0_4px_16px_rgba(0,102,255,0.3)] hover:shadow-[0_6px_20px_rgba(0,102,255,0.4)] hover:scale-[1.02] active:scale-100 transition-all duration-300 mt-0"
        >
          <span className="text-lg">+</span>
          <span>Créer un tournoi</span>
        </Link>
      </div>

      <Card className="rounded-lg sm:rounded-xl md:rounded-2xl border border-white/80 ring-1 ring-white/10 bg-white/5">
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
                  <TableRow className="border-white/20">
                    <TableHead className="text-white/70 text-left">Nom</TableHead>
                    <TableHead className="text-white/70 text-left">Catégorie</TableHead>
                    <TableHead className="text-white/70 text-left">Type</TableHead>
                    <TableHead className="text-white/70 text-left">Dates</TableHead>
                    <TableHead className="text-white/70 text-left">Statut</TableHead>
                    <TableHead className="text-white/70 text-left">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tournaments.map((tournament: any) => (
                    <TableRow key={tournament.id} className="border-white/20 hover:bg-white/5">
                      <TableCell className="text-left">
                        <span className="font-semibold text-white text-base">{tournament.name}</span>
                      </TableCell>
                      <TableCell className="text-white/90">{tournament.category}</TableCell>
                      <TableCell className="text-white/90">{renderTournamentType(tournament.tournament_type)}</TableCell>
                      <TableCell className="text-white/90">
                        {formatDateRange(tournament.start_date, tournament.end_date)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={statusVariant(tournament.status)}
                          className={
                            tournament.status === "open" || tournament.status === "in_progress"
                              ? "bg-green-500/20 text-green-300 border-green-500/50"
                              : tournament.status === "completed"
                              ? "bg-blue-500/20 text-blue-300 border-blue-500/50"
                              : tournament.status === "draft"
                              ? "bg-gray-500/20 text-gray-300 border-gray-500/50"
                              : tournament.status === "cancelled"
                              ? "bg-red-500/20 text-red-300 border-red-500/50"
                              : "bg-white/10 text-white border-white/20"
                          }
                        >
                          {renderStatusLabel(tournament.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
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
