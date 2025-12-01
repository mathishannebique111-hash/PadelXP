import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Tournament } from "@/lib/types/tournaments";
import { TournamentDetailsForm } from "./TournamentDetailsForm";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TournamentRegistrations from "./TournamentRegistrations";

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
          <CardTitle className="text-white">Gestion du tournoi</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="infos" className="w-full">
            <TabsList className="mb-4 bg-black/60 border border-white/10">
              <TabsTrigger value="infos">Infos</TabsTrigger>
              <TabsTrigger value="inscriptions">Inscriptions</TabsTrigger>
            </TabsList>

            <TabsContent value="infos" className="mt-0">
              <TournamentDetailsForm tournament={tournament as Tournament} />
            </TabsContent>

            <TabsContent value="inscriptions" className="mt-0">
              <TournamentRegistrations tournamentId={tournament.id as string} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}


