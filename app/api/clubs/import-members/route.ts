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

type IncomingRow = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  notes?: string | null;
  raw?: Record<string, any>;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Configuration serveur invalide (service role manquante)" },
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

    let payload: any = null;
    try {
      payload = await request.json();
    } catch (error) {
      return NextResponse.json({ error: "Format JSON invalide" }, { status: 400 });
    }

    if (!payload || !Array.isArray(payload.rows)) {
      return NextResponse.json({ error: "Format de données invalide" }, { status: 400 });
    }

    const rows: IncomingRow[] = payload.rows;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Aucune ligne à importer" }, { status: 400 });
    }

    // Déterminer le club associé à l'utilisateur
    let clubId: string | null = null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("club_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.club_id) {
      clubId = profile.club_id;
    }

    if (!clubId) {
      const { data: adminRow } = await supabaseAdmin
        .from("club_admins")
        .select("club_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (adminRow?.club_id) {
        clubId = adminRow.club_id;
      }
    }

    if (!clubId) {
      return NextResponse.json(
        { error: "Impossible de déterminer le club associé à cet utilisateur." },
        { status: 403 }
      );
    }

    const validRecords: Array<{
      club_id: string;
      email: string;
      email_normalized: string;
      first_name: string | null;
      last_name: string | null;
      phone: string | null;
      notes: string | null;
      raw_data: Record<string, any> | null;
      status: string;
      created_by: string;
    }> = [];
    const errorMessages: string[] = [];

    rows.forEach((row, index) => {
      const email = row.email?.trim() || "";
      if (!email) {
        errorMessages.push(`Ligne ${index + 1}: email requis`);
        return;
      }

      const normalizedEmail = normalizeEmail(email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        errorMessages.push(`Ligne ${index + 1}: email invalide (${email})`);
        return;
      }

      validRecords.push({
        club_id: clubId!,
        email,
        email_normalized: normalizedEmail,
        first_name: row.firstName?.trim() || null,
        last_name: row.lastName?.trim() || null,
        phone: row.phone?.trim() || null,
        notes: row.notes?.trim() || null,
        raw_data: row.raw || null,
        status: "pending",
        created_by: user.id,
      });
    });

    if (validRecords.length === 0) {
      return NextResponse.json(
        {
          error: "Aucune ligne valide à importer.",
          errors: errorMessages,
        },
        { status: 400 }
      );
    }

    const uniqueEmails = Array.from(
      new Set(validRecords.map((record) => record.email_normalized))
    );

    const { data: existingRows, error: existingError } = await supabaseAdmin
      .from("club_member_imports")
      .select("email_normalized")
      .eq("club_id", clubId)
      .in("email_normalized", uniqueEmails);

    if (existingError) {
      console.error("[import-members] existing lookup error:", existingError);
      return NextResponse.json(
        { error: "Erreur lors de la vérification des membres existants." },
        { status: 500 }
      );
    }

    const existingSet = new Set<string>((existingRows || []).map((row) => row.email_normalized));

    const { error: upsertError } = await supabaseAdmin
      .from("club_member_imports")
      .upsert(validRecords, { onConflict: "club_id,email_normalized" });

    if (upsertError) {
      console.error("[import-members] upsert error:", upsertError);
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement des membres importés." },
        { status: 500 }
      );
    }

    const insertedCount = validRecords.filter(
      (record) => !existingSet.has(record.email_normalized)
    ).length;
    const updatedCount = validRecords.length - insertedCount;

    return NextResponse.json({
      success: true,
      message: `Import effectué (${insertedCount} ajout(s), ${updatedCount} mise(s) à jour).`,
      total: rows.length,
      imported: validRecords.length,
      inserted: insertedCount,
      updated: updatedCount,
      skipped: rows.length - validRecords.length,
      errors: errorMessages,
    });
  } catch (error: any) {
    console.error("[import-members] Unexpected error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur serveur inattendue" },
      { status: 500 }
    );
  }
}

