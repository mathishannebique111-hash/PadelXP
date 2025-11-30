import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClubDashboardData, getUserClubInfo } from "@/lib/utils/club-utils";
import { logger } from "@/lib/logger";

function stringifyCsvValue(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const needsQuote = /[",;\n]/.test(value);
  const normalized = value.replace(/\r?\n/g, " ").trim();
  return needsQuote ? `"${normalized.replace(/"/g, '""')}"` : normalized;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Récupérer les informations du club de l'utilisateur
    const { clubId, clubSlug } = await getUserClubInfo();

    if (!clubId) {
      return NextResponse.json(
        { error: "Vous n'êtes associé à aucun club." },
        { status: 403 }
      );
    }

    // Utiliser la même logique que la page "Membres" pour récupérer les membres
    // Cela filtre automatiquement les admins sans matchs et calcule les stats
    const { members } = await getClubDashboardData(clubId, clubSlug);

    if (!members || members.length === 0) {
      return NextResponse.json(
        { error: "Aucun membre trouvé pour ce club." },
        { status: 404 }
      );
    }

    const header = [
      "Prénom",
      "Nom",
      "Nom affiché",
      "Email",
      "Date d'inscription",
      "Matchs joués",
      "Victoires",
      "Défaites",
      "Points",
      "Dernier match",
      "Identifiant utilisateur",
    ];

    const lines = [header.join(";")];
    members.forEach((member) => {
      const line = [
        stringifyCsvValue(member.first_name),
        stringifyCsvValue(member.last_name),
        stringifyCsvValue(member.display_name),
        stringifyCsvValue(member.email),
        stringifyCsvValue(
          member.created_at
            ? new Date(member.created_at).toLocaleString("fr-FR")
            : ""
        ),
        stringifyCsvValue(member.matches.toString()),
        stringifyCsvValue(member.wins.toString()),
        stringifyCsvValue(member.losses.toString()),
        stringifyCsvValue(member.points.toString()),
        stringifyCsvValue(
          member.last_match_at
            ? new Date(member.last_match_at).toLocaleString("fr-FR")
            : ""
        ),
        stringifyCsvValue(member.id),
      ].join(";");
      lines.push(line);
    });

    const csvContent = "\ufeff" + lines.join("\n");
    const fileName = `membres_club_${clubId}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    logger.error({ error: error?.message || String(error), stack: error?.stack, userId: user?.id?.substring(0, 8) + "…", clubId: clubId?.substring(0, 8) + "…" }, "[export-members] Unexpected error:");
    return NextResponse.json(
      { error: error?.message || "Erreur serveur inattendue" },
      { status: 500 }
    );
  }
}

