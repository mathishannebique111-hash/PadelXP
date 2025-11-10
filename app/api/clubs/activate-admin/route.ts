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

export async function POST() {
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

    const { data: adminRow } = await supabaseAdmin
      .from("club_admins")
      .select("id, activated_at, club_id, clubs!inner(slug, name, logo_url)")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminRow) {
      return NextResponse.json({ error: "Invitation introuvable" }, { status: 404 });
    }

    if (adminRow.activated_at) {
      return NextResponse.json({
        ok: true,
        message: "Déjà activé",
        club: {
          id: adminRow.club_id,
          slug: (adminRow as any).clubs?.slug ?? null,
          name: (adminRow as any).clubs?.name ?? null,
          logo_url: (adminRow as any).clubs?.logo_url ?? null,
        },
      });
    }

    const { error: updateError } = await supabaseAdmin
      .from("club_admins")
      .update({ activated_at: new Date().toISOString() })
      .eq("id", adminRow.id);

    if (updateError) {
      console.error("[activate-admin] update error", updateError);
      return NextResponse.json(
        { error: "Impossible d'activer l'invitation" },
        { status: 500 }
      );
    }

    if (adminRow.club_id) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...(user.user_metadata || {}),
            club_id: adminRow.club_id,
            club_slug: (adminRow as any).clubs?.slug ?? null,
            club_name: (adminRow as any).clubs?.name ?? null,
            club_logo_url: (adminRow as any).clubs?.logo_url ?? null,
          },
        });
      } catch (metadataError) {
        console.warn("[activate-admin] metadata update warning", metadataError);
      }
    }

    return NextResponse.json({
      ok: true,
      club: {
        id: adminRow.club_id,
        slug: (adminRow as any).clubs?.slug ?? null,
        name: (adminRow as any).clubs?.name ?? null,
        logo_url: (adminRow as any).clubs?.logo_url ?? null,
      },
    });
  } catch (error: any) {
    console.error("[activate-admin] Unexpected error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur serveur inattendue" },
      { status: 500 }
    );
  }
}

