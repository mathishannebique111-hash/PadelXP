import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Tournament } from "@/lib/types/tournaments";
import { TournamentDetailsForm } from "./TournamentDetailsForm";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TournamentRegistrations from "./TournamentRegistrations";
import TournamentBracket from "./TournamentBracket";
import PageTitle from "../../PageTitle";

export default async function TournamentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  // Gérer params qui peut être une Promise dans Next.js 15
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return redirect("/clubs/login?next=/dashboard/tournaments");
  }

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
      <div className="flex items-start justify-between gap-4">
        <PageTitle 
          title={tournament.name}
          subtitle="Gérez les informations et le déroulement de votre tournoi."
          className="flex-1"
        />
        <Link
          href="/dashboard/tournaments"
          className="inline-flex items-center gap-2 rounded-lg sm:rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 transition-all duration-300 mt-0"
        >
          ← Retour aux tournois
        </Link>
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
              <TabsTrigger value="tableau">Tableau</TabsTrigger>
            </TabsList>

            <TabsContent value="infos" className="mt-0">
              <TournamentDetailsForm tournament={tournament as Tournament} />
            </TabsContent>

            <TabsContent value="inscriptions" className="mt-0">
              <TournamentRegistrations tournamentId={tournament.id as string} />
            </TabsContent>

            <TabsContent value="tableau" className="mt-0">
              <TournamentBracket
                tournamentId={tournament.id as string}
                tournamentType={tournament.tournament_type as string}
                matchFormat={tournament.match_format as string}
                tournamentStatus={tournament.status as string}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}


