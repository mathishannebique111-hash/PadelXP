import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TournamentRegisterForm } from "./TournamentRegisterForm";

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

export default async function TournamentPublicPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const { data: tournament, error } = await supabase
    .from("tournaments")
    .select(
      "id, name, description, category, tournament_type, match_format, start_date, end_date, status, inscription_fee, clubs(name)"
    )
    .eq("id", params.id)
    .single();

  if (error || !tournament) {
    logger.warn(
      { tournamentId: params.id.substring(0, 8) + "…", error: error?.message },
      "[tournaments/detail] Tournament not found"
    );
    return notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let alreadyRegistered = false;
  let registrationId: string | null = null;
  let profile: {
    id: string;
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    display_name?: string | null;
    license_number?: string | null;
  } | null = null;

  if (user) {
    const { data: existing } = await supabase
      .from("tournament_registrations")
      .select("id")
      .eq("tournament_id", params.id)
      .eq("player1_id", user.id)
      .maybeSingle();

    alreadyRegistered = !!existing;
    registrationId = existing?.id || null;

    const { data: p } = await supabase
      .from("profiles")
      .select("id, full_name, first_name, last_name, display_name, license_number")
      .eq("id", user.id)
      .maybeSingle();

    profile = p;
  }

  const isOpen = tournament.status === "open";

  // Construire un nom joueur robuste à partir du profil ET des métadonnées user
  let playerName: string = "Mon nom et prénom";
  if (user) {
    const meta = (user as any).user_metadata || {};
    const profileName =
      profile?.full_name ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
      profile?.display_name ||
      "";
    const metaName =
      (meta.full_name as string | undefined) ||
      [meta.first_name, meta.last_name].filter(Boolean).join(" ");
    playerName =
      (profileName || metaName || user.email || "Mon nom et prénom").toString();
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <Link
        href="/tournaments"
        className="text-sm text-gray-400 hover:text-white underline"
      >
        ← Retour aux tournois
      </Link>

      <Card className="bg-black/40 border-white/10 mx-auto">
        <CardHeader>
          <CardTitle className="text-white flex flex-col gap-2 text-center">
            <span>{tournament.name}</span>
            <span className="text-sm text-gray-400">
              {tournament.clubs?.name || "Club inconnu"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-3 items-center justify-center">
            <Badge className="bg-white/10 text-white border-white/20">
              {tournament.category}
            </Badge>
            <Badge variant="outline" className="text-white/80 border-white/20">
              {renderTournamentType(tournament.tournament_type)}
            </Badge>
            <span className="text-white/80">
              {formatDateRange(tournament.start_date, tournament.end_date)}
            </span>
            <span className="text-white/80">
              {tournament.inscription_fee.toFixed(2)} € / équipe
            </span>
          </div>

          {tournament.description && (
            <p className="text-sm text-gray-300 whitespace-pre-line text-center">
              {tournament.description}
            </p>
          )}

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-white text-center">Inscriptions</h2>

            {!isOpen && (
              <p className="text-sm text-gray-400 text-center">
                Les inscriptions ne sont actuellement pas ouvertes pour ce
                tournoi.
              </p>
            )}

            {isOpen && !user && (
              <p className="text-sm text-gray-300 text-center">
                Connectez-vous pour vous inscrire :{" "}
                <Link
                  href={`/login?redirect=/tournaments/${tournament.id}`}
                  className="text-blue-400 underline"
                >
                  Se connecter
                </Link>
              </p>
            )}

            {isOpen && user && (
              <TournamentRegisterForm
                tournamentId={tournament.id}
                initialPlayerLicense={profile?.license_number ?? ""}
                alreadyRegistered={alreadyRegistered}
                registrationId={registrationId}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


