import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";
import { logger } from "@/lib/logger";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  SUPABASE_URL && SERVICE_ROLE_KEY
    ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

const INVITE_VALIDITY_HOURS = 48;

/**
 * Schéma de régénération d'invitation : email (trim + lowercase) ou token requis.
 */
const adminInviteReissueSchema = z
  .object({
    email: z.string().trim().email("Email invalide").transform((value) => value.toLowerCase()).optional(),
    token: z.string().trim().min(1, "Token requis").optional(),
  })
  .refine((data) => Boolean(data.email) || Boolean(data.token), {
    message: "Email ou token requis",
    path: ["email"],
  });

export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Configuration serveur invalide" }, { status: 500 });
    }

    const parsedBody = adminInviteReissueSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Payload invalide", details: parsedBody.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, token: requestToken } = parsedBody.data;

    let normalizedEmail: string | null = email ?? null;
    let userIdFromToken: string | null = null;

    if (!normalizedEmail && requestToken) {
      try {
        const { data, error } = await supabaseAdmin.auth.getUser(requestToken);
        if (!error && data?.user) {
          normalizedEmail = data.user.email?.toLowerCase() ?? null;
          userIdFromToken = data.user.id ?? null;
        }
      } catch (decodeError) {
        logger.warn({ error: decodeError }, "[admin-invite/reissue] Unable to decode token");
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
      logger.error({ email: normalizedEmail.substring(0, 5) + "…", error: inviteLookupError }, "[admin-invite/reissue] lookup error");
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
      }/clubs/signup?invite=admin&email=${encodeURIComponent(normalizedEmail!)}`;
      // Ajout du ! pour dire à TypeScript : "Je garantis que c'est pas null ici"      

      if (adminInviteRow.user_id) {
        await supabaseAdmin.auth.admin.updateUserById(adminInviteRow.user_id, {
          email: normalizedEmail || undefined, // Convertit null en undefined
          email_confirm: true,
        });
      }      

    // Toujours générer un lien compatible avec verifyOtp côté client.
    // On commence par un magiclink, puis on bascule éventuellement en recovery
    // si l'utilisateur existe déjà et que Supabase le demande.
    let linkType: "magiclink" | "recovery" = "magiclink";

    let linkResult = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail!,
      options: {
        redirectTo,
        data: {
          club_id: adminInviteRow.club_id,
          club_slug: clubRow?.slug ?? null,
          club_name: clubRow?.name ?? null,
        },
      },
    });

    // Pour certains messages Supabase (utilisateur déjà enregistré), on préfère
    // basculer sur un lien de type "recovery" afin de permettre la définition/réinitialisation
    // du mot de passe, tout en conservant le même redirectTo.
    if (linkResult.error?.message?.includes("already registered")) {
      linkType = "recovery";
      linkResult = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: normalizedEmail!,
        options: {
          redirectTo,
        },
      });
    }

    if (linkResult.error) {
      logger.error({ email: normalizedEmail.substring(0, 5) + "…", error: linkResult.error }, "[admin-invite/reissue] generate link error");
      return NextResponse.json({ error: "Impossible de régénérer le lien" }, { status: 500 });
    }

    // Étendre le typage de linkData pour accéder aux propriétés spécifiques (email_otp, hashed_token, action_link, etc.)
    const linkData: any = linkResult.data;
    logger.info({ email: normalizedEmail.substring(0, 5) + "…", linkType, hasAction: !!linkData?.properties?.action_link, hasOtp: !!linkData?.properties?.email_otp || !!linkData?.properties?.hashed_token }, "[admin-invite/reissue] link generated");

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
    logger.error({ error }, "[admin-invite/reissue] Unexpected error");
    return NextResponse.json({ error: error?.message || "Erreur serveur" }, { status: 500 });
  }
}
