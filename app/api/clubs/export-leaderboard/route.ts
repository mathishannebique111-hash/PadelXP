import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClubDashboardData } from "@/lib/utils/club-utils";

function stringifyCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const stringValue = typeof value === "string" ? value : String(value);
  const needsQuote = /[",;\n]/.test(stringValue);
  const normalized = stringValue.replace(/\r?\n/g, " ").trim();
  return needsQuote ? `"${normalized.replace(/"/g, '""')}"` : normalized;
}

function formatDate(date: string | null | undefined): string {
  if (!date) return "";
  try {
    return new Date(date).toLocaleString("fr-FR");
  } catch {
    return date;
  }
}

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { clubId } = await (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("club_id")
        .eq("id", user.id)
        .maybeSingle();
      return { clubId: profile?.club_id ?? null };
    })();

    const finalClubId = clubId;
    if (!finalClubId) {
      return NextResponse.json(
        { error: "Vous n'êtes associé à aucun club." },
        { status: 403 }
      );
    }

    const { leaderboard } = await getClubDashboardData(finalClubId);

    const header = [
      "Rang",
      "Nom du joueur",
      "Points",
      "Victoires",
      "Défaites",
      "Matchs joués",
      "Dernier match",
    ];

    const lines = [header.join(";")];
    leaderboard.forEach((row) => {
      const line = [
        stringifyCsvValue(row.rank),
        stringifyCsvValue(row.player_name),
        stringifyCsvValue(row.points),
        stringifyCsvValue(row.wins),
        stringifyCsvValue(row.losses),
        stringifyCsvValue(row.matches),
        stringifyCsvValue(formatDate(row.last_match_at)),
      ].join(";");
      lines.push(line);
    });

    const csvContent = "\ufeff" + lines.join("\n");
    const fileName = `classement_club_${finalClubId}_${new Date()
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
    console.error("[export-leaderboard] Unexpected error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur serveur inattendue" },
      { status: 500 }
    );
  }
}

