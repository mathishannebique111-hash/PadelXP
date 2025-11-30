import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

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

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { data: adminRow } = await supabaseAdmin
      .from("club_admins")
      .select("id, activated_at, club_id")
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
      logger.error({ userId: user.id.substring(0, 8) + "…", adminId: adminRow.id.substring(0, 8) + "…", error: updateError }, "[activate-admin] update error");
      return NextResponse.json(
        { error: "Impossible d'activer l'invitation" },
        { status: 500 }
      );
    }

    let clubRecord: { slug: string | null; name: string | null; logo_url: string | null } | null = null;
    if (adminRow.club_id) {
      const { data: clubRow } = await supabaseAdmin
        .from("clubs")
        .select("slug, name, logo_url")
        .eq("id", adminRow.club_id)
        .maybeSingle();
      if (clubRow) {
        clubRecord = {
          slug: (clubRow.slug as string | null) ?? null,
          name: (clubRow.name as string | null) ?? null,
          logo_url: (clubRow.logo_url as string | null) ?? null,
        };
      }
    }

    if (adminRow.club_id) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...(user.user_metadata || {}),
            club_id: adminRow.club_id,
            club_slug: clubRecord?.slug ?? null,
            club_name: clubRecord?.name ?? null,
            club_logo_url: clubRecord?.logo_url ?? null,
          },
        });
      } catch (metadataError) {
        logger.warn({ userId: user.id.substring(0, 8) + "…", clubId: adminRow.club_id?.substring(0, 8) + "…" || null, error: metadataError }, "[activate-admin] metadata update warning");
      }
    }

    return NextResponse.json({
      ok: true,
      club: {
        id: adminRow.club_id,
        slug: clubRecord?.slug ?? null,
        name: clubRecord?.name ?? null,
        logo_url: clubRecord?.logo_url ?? null,
      },
    });
  } catch (error: any) {
    logger.error({ error: error?.message || String(error) }, "[activate-admin] Unexpected error");
    return NextResponse.json(
      { error: error?.message || "Erreur serveur inattendue" },
      { status: 500 }
    );
  }
}

