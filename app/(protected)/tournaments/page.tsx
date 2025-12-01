import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";

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

function formatDateRange(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit" };
  const startStr = startDate.toLocaleDateString("fr-FR", options);
  const endStr = endDate.toLocaleDateString("fr-FR", options);
  if (startStr === endStr) return startStr;
  return `${startStr} – ${endStr}`;
}

export default async function PublicTournamentsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return redirect("/login?redirect=/tournaments");
  }

  // Récupérer le club du joueur
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("club_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    // Erreur non bloquante : si le profil n'est pas accessible, on affiche simplement
    // les tournois ouverts sans filtrer par club, sans remonter d'erreur console.
    logger.warn(
      { userId: user.id.substring(0, 8) + "…", error: profileError.message },
      "[tournaments/list] Unable to fetch player profile (proceeding without club filter)"
    );
  }

  const clubId = profile?.club_id ?? null;

  const query = supabase
    .from("tournaments")
    .select(
      "id, name, category, tournament_type, start_date, end_date, status, clubs(name)"
    )
    .eq("status", "open")
    .order("start_date", { ascending: true });

  if (clubId) {
    query.eq("club_id", clubId);
  }

  const { data, error } = await query;

  if (error) {
    logger.error(
      { userId: user.id.substring(0, 8) + "…", clubId, error: error.message },
      "[tournaments/list] Error fetching open tournaments"
    );
  }

  const tournaments = data || [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Tournois ouverts aux inscriptions
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Découvrez les tournois disponibles et inscrivez-vous en quelques clics.
          </p>
        </div>
      </div>

      <Card className="bg-black/40 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Liste des tournois</CardTitle>
        </CardHeader>
        <CardContent>
          {tournaments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              Aucun tournoi n&apos;est actuellement ouvert aux inscriptions.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-white/70">Nom</TableHead>
                    <TableHead className="text-white/70">Club</TableHead>
                    <TableHead className="text-white/70">Catégorie</TableHead>
                    <TableHead className="text-white/70">Type</TableHead>
                    <TableHead className="text-white/70">Dates</TableHead>
                    <TableHead className="text-right text-white/70">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tournaments.map((tournament: any) => (
                    <TableRow key={tournament.id} className="border-white/10">
                      <TableCell className="text-white">
                        {tournament.name}
                      </TableCell>
                      <TableCell className="text-white/80">
                        {tournament.clubs?.name || "Club inconnu"}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-white/10 text-white border-white/20">
                          {tournament.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white/80">
                        {renderTournamentType(tournament.tournament_type)}
                      </TableCell>
                      <TableCell className="text-white/80">
                        {formatDateRange(
                          tournament.start_date,
                          tournament.end_date
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/tournaments/${tournament.id}`}>
                            Voir le tournoi
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


