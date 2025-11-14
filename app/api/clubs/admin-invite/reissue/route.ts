import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  SUPABASE_URL && SERVICE_ROLE_KEY
    ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

const INVITE_VALIDITY_HOURS = 48;

export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Configuration serveur invalide" }, { status: 500 });
    }

    const { email, token: requestToken } = await request.json();

    if ((!email || typeof email !== "string") && (!requestToken || typeof requestToken !== "string")) {
      return NextResponse.json({ error: "Email ou token requis" }, { status: 400 });
    }

    let normalizedEmail: string | null =
      typeof email === "string" ? email.trim().toLowerCase() : null;
    let userIdFromToken: string | null = null;

    if (!normalizedEmail && requestToken) {
      try {
        const { data, error } = await supabaseAdmin.auth.getUser(requestToken);
        if (!error && data?.user) {
          normalizedEmail = data.user.email?.toLowerCase() ?? null;
          userIdFromToken = data.user.id ?? null;
        }
      } catch (decodeError) {
        console.warn("[admin-invite/reissue] Unable to decode token", decodeError);
      }
    }

    if (!normalizedEmail) {
      return NextResponse.json({ error: "Impossible d'identifer l'invitation" }, { status: 400 });
    }

    const { data: adminInviteRowData, error: inviteLookupError } = await supabaseAdmin
      .from("club_admins")
      .select("id, club_id, user_id, invited_at, activated_at, email")
      .eq("email", normalizedEmail)
      .is("activated_at", null)
      .order("invited_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inviteLookupError) {
      console.error("[admin-invite/reissue] lookup error", inviteLookupError);
      return NextResponse.json({ error: "Impossible de vérifier l'invitation" }, { status: 500 });
    }

    let adminInviteRow = adminInviteRowData;

    if (!adminInviteRow && userIdFromToken) {
      const { data: fallbackRow } = await supabaseAdmin
        .from("club_admins")
        .select("id, club_id, user_id, invited_at, activated_at, email")
        .eq("user_id", userIdFromToken)
        .is("activated_at", null)
        .order("invited_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (fallbackRow) {
        normalizedEmail = fallbackRow.email?.toLowerCase() ?? normalizedEmail;
        adminInviteRow = fallbackRow;
      }
    }

    if (!adminInviteRow) {
      return NextResponse.json({ error: "Invitation introuvable" }, { status: 404 });
    }

    const { data: clubRow } = await supabaseAdmin
      .from("clubs")
      .select("slug, name")
      .eq("id", adminInviteRow.club_id)
      .maybeSingle();

    const redirectTo = `${
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    }/clubs/signup?invite=admin&email=${encodeURIComponent(normalizedEmail)}`;

    if (adminInviteRow.user_id) {
      await supabaseAdmin.auth.admin.updateUserById(adminInviteRow.user_id, {
        email: normalizedEmail,
        email_confirm: true,
      });
    }

    let linkType: "magiclink" | "recovery" = "magiclink";

    let linkResult = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email: normalizedEmail,
      user_id: adminInviteRow.user_id ?? undefined,
      options: {
        redirectTo,
        data: {
          club_id: adminInviteRow.club_id,
          club_slug: clubRow?.slug ?? null,
          club_name: clubRow?.name ?? null,
        },
      },
    });

    if (linkResult.error?.message?.includes("already registered")) {
      linkType = "recovery";
      linkResult = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: normalizedEmail,
        user_id: adminInviteRow.user_id ?? undefined,
        options: {
          redirectTo,
          data: {
            club_id: adminInviteRow.club_id,
            club_slug: clubRow?.slug ?? null,
            club_name: clubRow?.name ?? null,
          },
        },
      });
    }

    if (linkResult.error) {
      console.error("[admin-invite/reissue] generate link error", linkResult.error);
      return NextResponse.json({ error: "Impossible de régénérer le lien" }, { status: 500 });
    }

    const linkData = linkResult.data;
    console.log("[admin-invite/reissue] link generated", {
      linkType,
      email: normalizedEmail,
      hasAction: !!linkData?.properties?.action_link,
      hasOtp: !!linkData?.properties?.email_otp || !!linkData?.properties?.hashed_token,
    });

    const otpToken =
      linkData?.properties?.email_otp ||
      linkData?.properties?.hashed_token ||
      linkData?.email_otp ||
      linkData?.hashed_token ||
      null;

    const actionLink =
      linkData?.properties?.action_link ||
      linkData?.properties?.redirect_to ||
      linkData?.action_link ||
      null;

    if (!otpToken && !actionLink) {
      return NextResponse.json({ error: "Lien invalide" }, { status: 500 });
    }

    await supabaseAdmin
      .from("club_admins")
      .update({ invited_at: new Date().toISOString() })
      .eq("id", adminInviteRow.id);

    return NextResponse.json({
      ok: true,
      token: otpToken,
      actionLink,
      redirectTo,
      email: normalizedEmail,
      linkType,
    });
  } catch (error: any) {
    console.error("[admin-invite/reissue] Unexpected error", error);
    return NextResponse.json({ error: error?.message || "Erreur serveur" }, { status: 500 });
  }
}
