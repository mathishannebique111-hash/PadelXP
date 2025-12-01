import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Tournament } from "@/lib/types/tournaments";
import { TournamentDetailsForm } from "./TournamentDetailsForm";

export default async function TournamentDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return redirect("/clubs/login?next=/dashboard/tournaments");
  }

  const { id } = params;

  const { data: tournament, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !tournament) {
    logger.error(
      {
        tournamentId: id.substring(0, 8) + "…",
        error: error ? error.message : "Tournament not found",
      },
      "Error fetching tournament details"
    );
    return notFound();
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>
          <p className="text-sm text-gray-400 mt-1">
            Gérez les informations et le déroulement de votre tournoi.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/tournaments">← Retour aux tournois</Link>
        </Button>
      </div>

      <Card className="bg-black/40 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Détails du tournoi</CardTitle>
        </CardHeader>
        <CardContent>
          <TournamentDetailsForm tournament={tournament as Tournament} />
        </CardContent>
      </Card>
    </div>
  );
}


