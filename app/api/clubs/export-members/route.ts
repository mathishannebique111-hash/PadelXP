import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  SUPABASE_URL && SERVICE_ROLE_KEY
    ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

function stringifyCsvValue(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const needsQuote = /[",;\n]/.test(value);
  const normalized = value.replace(/\r?\n/g, " ").trim();
  return needsQuote ? `"${normalized.replace(/"/g, '""')}"` : normalized;
}

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Configuration serveur invalide" },
        { status: 500 }
      );
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Déterminer le club de l'utilisateur
    let clubId: string | null = null;
    {
      const { data: profile } = await supabase
        .from("profiles")
        .select("club_id")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.club_id) {
        clubId = profile.club_id;
      }
    }

    if (!clubId) {
      const { data: adminData } = await supabaseAdmin
        .from("club_admins")
        .select("club_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (adminData?.club_id) {
        clubId = adminData.club_id;
      }
    }

    if (!clubId) {
      return NextResponse.json(
        { error: "Vous n'êtes associé à aucun club." },
        { status: 403 }
      );
    }

    const { data: clubMembers, error } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, first_name, last_name, email, created_at")
      .eq("club_id", clubId)
      .order("display_name", { ascending: true });

    if (error) {
      console.error("[export-members] fetch profiles error:", error);
      return NextResponse.json(
        { error: "Impossible de récupérer les membres du club." },
        { status: 500 }
      );
    }

    const header = [
      "Prénom",
      "Nom",
      "Nom affiché",
      "Email",
      "Date d'inscription",
      "Identifiant utilisateur",
    ];

    const lines = [header.join(";")];
    (clubMembers || []).forEach((member) => {
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
    console.error("[export-members] Unexpected error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur serveur inattendue" },
      { status: 500 }
    );
  }
}

