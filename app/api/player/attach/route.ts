import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { capitalizeFullName } from "@/lib/utils/name-utils";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: Request) {
  try {
    if (!SERVICE_ROLE_KEY) {
      console.error("[player/attach] Missing SUPABASE_SERVICE_ROLE_KEY env var");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const body = await req.json();
    let { slug, code, firstName, lastName, displayName, email } = body as {
      slug?: string;
      code?: string;
      firstName?: string;
      lastName?: string;
      displayName?: string;
      email?: string;
    };
    if (!slug || !code) {
      return NextResponse.json({ error: "Club et code requis" }, { status: 400 });
    }

    slug = String(slug).trim();
    code = String(code).trim().toUpperCase().replace(/[^A-Z0-9]+/g, "");

    const supabaseAdmin = createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Identifier l'utilisateur via le header Authorization (access token) ou via les cookies
    let user = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.getUser(token);
      if (tokenError) {
        console.error("[player/attach] Token lookup error", tokenError);
      } else {
        user = tokenData?.user ?? null;
      }
    }

    if (!user) {
      const supabase = await createClient();
      const { data: { user: cookieUser } } = await supabase.auth.getUser();
      user = cookieUser ?? null;
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: club, error: clubError } = await supabaseAdmin
      .from("clubs")
      .select("id, slug, code_invitation, status")
      .eq("slug", slug)
      .single();

    if (clubError || !club) {
      console.error("[player/attach] Club lookup error", clubError);
      return NextResponse.json({ error: "Club introuvable" }, { status: 404 });
    }

    if (club.status !== "active") {
      return NextResponse.json({ error: "Club inactif" }, { status: 403 });
    }

    const expectedCode = String(club.code_invitation || "").trim().toUpperCase();
    if (!expectedCode || code !== expectedCode) {
      return NextResponse.json({ error: "Code d’invitation incorrect" }, { status: 403 });
    }

    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, first_name, last_name, email")
      .eq("id", user.id)
      .maybeSingle();

    // Récupérer les valeurs brutes
    const rawDisplayName = (displayName || existingProfile?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Joueur").trim();
    const rawFirst = (firstName || existingProfile?.first_name || user.user_metadata?.first_name || rawDisplayName.split(' ')[0] || "").trim();
    const rawLast = (lastName || existingProfile?.last_name || user.user_metadata?.last_name || rawDisplayName.split(' ').slice(1).join(' ') || "").trim();
    
    // Capitaliser automatiquement le prénom et le nom
    const { firstName: normalizedFirst, lastName: normalizedLast } = capitalizeFullName(rawFirst, rawLast);
    const normalizedEmail = email || existingProfile?.email || user.email || null;
    
    // Reconstruire le display_name avec les noms capitalisés
    const finalDisplayName = normalizedFirst && normalizedLast 
      ? `${normalizedFirst} ${normalizedLast}`.trim()
      : normalizedFirst || normalizedLast || rawDisplayName;

    const upsertPayload = {
      id: user.id,
      display_name: finalDisplayName,
      first_name: normalizedFirst || null,
      last_name: normalizedLast || null,
      email: normalizedEmail,
      club_id: club.id,
      club_slug: club.slug,
    };

    const { data: upsertedProfile, error: upsertError } = await supabaseAdmin
      .from("profiles")
      .upsert(upsertPayload, { onConflict: "id" })
      .select("id, club_id, club_slug")
      .single();

    if (upsertError || !upsertedProfile) {
      console.error("[player/attach] Upsert error", upsertError, { upsertPayload });
      return NextResponse.json({ error: upsertError?.message || "Impossible d’attacher le club" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[player/attach] Unexpected error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


