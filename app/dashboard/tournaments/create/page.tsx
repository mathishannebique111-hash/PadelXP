import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { CreateTournamentForm } from "./CreateTournamentForm";
import PageTitle from "../../PageTitle";

export default function CreateTournamentPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <PageTitle 
          title="Créer un tournoi" 
          subtitle="Configurez un nouveau tournoi pour votre club."
          className="flex-1"
        />
        <Link
          href="/dashboard/tournaments"
          className="inline-flex items-center gap-2 rounded-lg sm:rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 transition-all duration-300 mt-0"
        >
          ← Retour à la liste
        </Link>
      </div>
      <Card className="rounded-lg sm:rounded-xl md:rounded-2xl border border-white/80 ring-1 ring-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-white">Paramètres du tournoi</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateTournamentForm />
        </CardContent>
      </Card>
    </div>
  );
}

