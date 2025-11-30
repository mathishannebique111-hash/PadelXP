import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CreateTournamentForm } from "./CreateTournamentForm";

export default function CreateTournamentPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Créer un tournoi</h1>
          <p className="text-sm text-gray-400 mt-1">
            Configurez un nouveau tournoi pour votre club.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/tournaments">
            Retour à la liste
          </Link>
        </Button>
      </div>
      <Card className="bg-black/40 border-white/10">
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

