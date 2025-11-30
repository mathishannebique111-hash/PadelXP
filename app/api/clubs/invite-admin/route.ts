import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";
import { sendAdminInvitationEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

/**
 * Schéma d'invitation admin : email obligatoire, normalisé (trim + lowercase).
 */
const inviteAdminSchema = z.object({
  email: z.string().trim().email("Email invalide").transform((value) => value.toLowerCase()),
});

export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Configuration serveur incorrecte" }, { status: 500 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Récupérer les infos du club
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("club_id, club_slug")
      .eq("id", user.id)
      .maybeSingle();

    let clubId = profile?.club_id || user.user_metadata?.club_id;
    let clubSlug = profile?.club_slug || user.user_metadata?.club_slug;

    if (!clubId) {
      return NextResponse.json({ error: "Club introuvable" }, { status: 404 });
    }

    // Récupérer le nom du club
    const { data: club } = await supabaseAdmin
      .from("clubs")
      .select("name")
      .eq("id", clubId)
      .maybeSingle();

    const clubName = club?.name || "votre club";

    const parsedBody = inviteAdminSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Payload invalide", details: parsedBody.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const normalizedEmail = parsedBody.data.email;

    // Vérifier si l'utilisateur existe déjà dans auth.users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail);

    let responseMessage = `Invitation envoyée à ${normalizedEmail}`;
    let invitedUserId: string | null = null;

    // Vérifier si l'utilisateur est déjà admin de ce club
    if (existingUser) {
      const { data: existingAdmin } = await supabaseAdmin
        .from("club_admins")
        .select("club_id, activated_at")
        .eq("user_id", existingUser.id)
        .eq("club_id", clubId)
        .maybeSingle();

      if (existingAdmin) {
        // Si déjà admin et activé, retourner une erreur
        if (existingAdmin.activated_at) {
          return NextResponse.json(
            { error: "Cet utilisateur est déjà administrateur de ce club" },
            { status: 400 }
          );
        }
        // Si invitation en attente, on va régénérer l'invitation
        invitedUserId = existingUser.id;
      } else {
        // L'utilisateur existe mais n'est pas admin de ce club
        invitedUserId = existingUser.id;
      }
    }

    // Créer le lien d'invitation (l'utilisateur devra créer un compte avec accès admin)
    const inviteLink = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/clubs/signup?invite=admin${
      normalizedEmail ? `&email=${encodeURIComponent(normalizedEmail)}` : ""
    }`;

    // Envoyer l'email d'invitation via Supabase Auth
    // Pour tous les utilisateurs (nouveaux ou existants), on essaie d'abord inviteUserByEmail
    // qui envoie automatiquement un email. Si ça échoue, on utilise generateLink en fallback
    let inviteData: any = null;
    let inviteError: any = null;

    // Essayer d'abord avec inviteUserByEmail (fonctionne pour nouveaux et existants)
    const { data: inviteByEmailData, error: inviteByEmailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        redirectTo: inviteLink,
        data: {
          club_id: clubId,
          club_slug: clubSlug,
          role: "admin",
          invited_by: user.email,
        },
      }
    );

    if (inviteByEmailError) {
      // Si inviteUserByEmail échoue (par exemple "already registered"), utiliser generateLink
      logger.info({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", email: normalizedEmail.substring(0, 5) + "…", error: inviteByEmailError.message }, `[invite-admin] inviteUserByEmail échoué, utilisation de generateLink`);
      
      let linkData: any = null;
      let linkError: any = null;

      // Essayer d'abord avec "recovery" pour permettre la définition/réinitialisation du mot de passe
      const recoveryParams: any = {
        type: "recovery",
        email: normalizedEmail,
        options: {
          redirectTo: inviteLink,
          data: {
            club_id: clubId,
            club_slug: clubSlug,
            role: "admin",
            invited_by: user.email,
          },
        },
      };
      if (existingUser?.id) {
        recoveryParams.user_id = existingUser.id;
      }
      const { data: recoveryLink, error: recoveryError } = await supabaseAdmin.auth.admin.generateLink(recoveryParams);

      if (recoveryError) {
        // Si recovery échoue, essayer avec magiclink
        const magiclinkParams: any = {
          type: "magiclink",
          email: normalizedEmail,
          options: {
            redirectTo: inviteLink,
            data: {
              club_id: clubId,
              club_slug: clubSlug,
              role: "admin",
              invited_by: user.email,
            },
          },
        };
        if (existingUser?.id) {
          magiclinkParams.user_id = existingUser.id;
        }
        const { data: magicLink, error: magicError } = await supabaseAdmin.auth.admin.generateLink(magiclinkParams);
        linkData = magicLink;
        linkError = magicError;
      } else {
        linkData = recoveryLink;
        linkError = null;
      }

      inviteData = linkData;
      inviteError = linkError;
    } else {
      // inviteUserByEmail a réussi
      inviteData = inviteByEmailData;
      inviteError = null;
      invitedUserId = inviteData?.user?.id ?? existingUser?.id ?? null;
    }

    if (inviteError) {
      logger.error({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", email: normalizedEmail.substring(0, 5) + "…", error: inviteError }, "[invite-admin] Erreur Supabase");
      return NextResponse.json(
        { error: "Erreur lors de l'envoi de l'invitation" },
        { status: 500 }
      );
    }

    // Extraire le lien d'invitation depuis les données Supabase
    let invitationUrl: string | null = null;
    if (inviteData) {
      // Pour inviteUserByEmail, le lien est dans properties.action_link ou properties.redirect_to
      // Pour generateLink, le lien est dans properties.action_link
      const actionLink =
        inviteData.properties?.action_link ||
        inviteData.properties?.redirect_to ||
        inviteData.action_link ||
        null;

      if (actionLink) {
        // Si on a un action_link complet, l'utiliser directement
        invitationUrl = actionLink;
        logger.info({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", email: normalizedEmail.substring(0, 5) + "…", actionLinkPreview: actionLink.substring(0, 20) + "…" }, `[invite-admin] Action link trouvé`);
      } else {
        // Sinon, construire le lien avec le token si disponible
        const token =
          inviteData.properties?.email_otp ||
          inviteData.properties?.hashed_token ||
          inviteData.email_otp ||
          inviteData.hashed_token ||
          null;

        if (token) {
          // Construire l'URL avec le token
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
          invitationUrl = `${baseUrl}/clubs/signup?invite=admin&email=${encodeURIComponent(normalizedEmail)}&token=${encodeURIComponent(token)}`;
          logger.info({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", email: normalizedEmail.substring(0, 5) + "…", urlLength: invitationUrl.length }, `[invite-admin] Lien d'invitation généré`);
        } else {
          // Fallback sur le lien de base (sans token, mais avec email)
          invitationUrl = inviteLink;
          logger.info({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", email: normalizedEmail.substring(0, 5) + "…" }, `[invite-admin] Utilisation du lien de base (fallback)`);
        }
      }
    } else {
      // Aucune donnée Supabase, utiliser le lien de base
      invitationUrl = inviteLink;
      logger.info({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", email: normalizedEmail.substring(0, 5) + "…" }, `[invite-admin] Aucune donnée Supabase, utilisation du lien de base`);
    }

    logger.info({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", email: normalizedEmail.substring(0, 5) + "…", urlLength: invitationUrl?.length || 0 }, `[invite-admin] Lien d'invitation généré`);

    // TOUJOURS envoyer l'email d'invitation via Resend
    // Même si Supabase a envoyé un email, on envoie aussi via Resend pour garantir la réception
    // et avoir un email personnalisé avec le bon format
    try {
      const inviterName = user.user_metadata?.first_name 
        ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ""}`.trim()
        : user.email;
      
      if (!invitationUrl) {
        logger.error({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", email: normalizedEmail.substring(0, 5) + "…" }, "[invite-admin] Aucun lien d'invitation généré, impossible d'envoyer l'email");
      } else {
        await sendAdminInvitationEmail(
          normalizedEmail,
          clubName,
          inviterName || null,
          invitationUrl
        );
        const emailPreview = normalizedEmail.substring(0, 5) + "…";
        logger.info({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", email: emailPreview }, `[invite-admin] ✅ Email d'invitation envoyé via Resend`);
              }
    } catch (emailError: any) {
      logger.error({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", email: normalizedEmail.substring(0, 5) + "…", error: emailError }, "[invite-admin] ❌ Erreur lors de l'envoi de l'email via Resend");
      // On ne bloque pas l'invitation si l'email échoue, mais on log l'erreur
      // L'utilisateur pourra toujours utiliser le lien généré par Supabase
    }

    // Enregistrer ou mettre à jour l'invitation dans la table club_admins
    // Toujours avec activated_at: null pour que ce soit une invitation en attente
    if (invitedUserId) {
      // Vérifier si une entrée existe déjà
      const { data: existingEntry } = await supabaseAdmin
        .from("club_admins")
        .select("id")
        .eq("user_id", invitedUserId)
        .eq("club_id", clubId)
        .maybeSingle();

      if (existingEntry) {
        // Mettre à jour l'invitation existante (réinitialiser invited_at)
        const { error: updateError } = await supabaseAdmin
          .from("club_admins")
          .update({
            invited_at: new Date().toISOString(),
            activated_at: null, // S'assurer que c'est toujours en attente
            email: normalizedEmail,
            invited_by: user.id,
          })
          .eq("id", existingEntry.id);

        if (updateError) {
          logger.error({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", invitedUserId: invitedUserId.substring(0, 8) + "…", error: updateError }, "[invite-admin] Erreur lors de la mise à jour dans club_admins");
        }
      } else {
        // Créer une nouvelle invitation en attente
        const { error: insertError } = await supabaseAdmin
          .from("club_admins")
          .insert({
            club_id: clubId,
            user_id: invitedUserId,
            email: normalizedEmail,
            role: "admin",
            invited_by: user.id,
            activated_at: null, // Toujours null pour une invitation en attente
          });

        if (insertError && insertError.code !== "23505") {
          logger.error({ userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…", invitedUserId: invitedUserId.substring(0, 8) + "…", error: insertError }, "[invite-admin] Erreur lors de l'ajout dans club_admins");
          // On ne bloque pas l'invitation même si l'ajout échoue
        }
      }
    }

    // Logger l'invitation
    const emailPreview2 = normalizedEmail.substring(0, 5) + "…";
    const clubIdPreview = clubId.substring(0, 8) + "…";
    logger.info({ userId: user.id.substring(0, 8) + "…", clubId: clubIdPreview, email: emailPreview2, clubName }, `[invite-admin] Invitation envoyée pour le club`);
    
    return NextResponse.json({
      success: true,
      message: responseMessage,
    });
  } catch (error: any) {
    logger.error({ error }, "[invite-admin] Erreur");
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

