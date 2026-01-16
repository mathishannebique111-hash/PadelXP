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

    // Récupérer les infos du club via club_admins
    const { data: currentUserAdmin } = await supabaseAdmin
      .from("club_admins")
      .select("club_id, role, clubs(name, slug)")
      .eq("user_id", user.id)
      .maybeSingle();

    const clubId = currentUserAdmin?.club_id || user.user_metadata?.club_id;
    const clubSlug = (currentUserAdmin?.clubs as any)?.slug || user.user_metadata?.club_slug;
    const clubName = (currentUserAdmin?.clubs as any)?.name || "votre club";

    if (!clubId) {
      return NextResponse.json({ error: "Club introuvable" }, { status: 404 });
    }

    const parsedBody = inviteAdminSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Payload invalide", details: parsedBody.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const normalizedEmail = parsedBody.data.email;

    // 1. Supprimer toute invitation PENDANTE (non activée) pour cet email dans ce club
    const { data: existingPendingInvites } = await supabaseAdmin
      .from("club_admins")
      .select("id, user_id, activated_at")
      .eq("club_id", clubId)
      .eq("email", normalizedEmail)
      .is("activated_at", null);

    if (existingPendingInvites && existingPendingInvites.length > 0) {
      for (const invite of existingPendingInvites) {
        await supabaseAdmin.from("club_admins").delete().eq("id", invite.id);
        logger.info({ inviteId: invite.id.substring(0, 8) + "…", email: normalizedEmail.substring(0, 5) + "…" }, "[invite-admin] Ancienne invitation pendante supprimée");

        // Si l'invitation avait un user_id, supprimer aussi l'utilisateur de auth.users
        if (invite.user_id) {
          const { data: otherRoles } = await supabaseAdmin
            .from("club_admins")
            .select("id")
            .eq("user_id", invite.user_id);

          if (!otherRoles || otherRoles.length === 0) {
            await supabaseAdmin.auth.admin.deleteUser(invite.user_id).catch((err: any) => {
              logger.warn({ userId: invite.user_id.substring(0, 8) + "…", error: err }, "[invite-admin] Impossible de supprimer l'ancien utilisateur");
            });
          }
        }
      }
    }

    // 2. Vérifier si l'utilisateur existe déjà dans auth.users ET est admin ACTIVÉ de ce club
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail);

    if (existingUser) {
      const { data: existingAdmin } = await supabaseAdmin
        .from("club_admins")
        .select("club_id, activated_at")
        .eq("user_id", existingUser.id)
        .eq("club_id", clubId)
        .maybeSingle();

      if (existingAdmin && existingAdmin.activated_at) {
        return NextResponse.json(
          { error: "Cet utilisateur est déjà administrateur de ce club" },
          { status: 400 }
        );
      }
    }

    // 3. URL de base pour les redirections
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://padelxp.eu").replace("http://localhost:3000", "https://padelxp.eu");
    const redirectTo = `${baseUrl}/clubs/signup?invite=admin&email=${encodeURIComponent(normalizedEmail)}`;

    // 4. Créer ou trouver l'utilisateur, et générer un lien
    let invitedUserId: string | null = existingUser?.id ?? null;
    let invitationUrl: string | null = null;

    // Si l'utilisateur n'existe pas, le créer d'abord
    if (!invitedUserId) {
      const randomPassword = crypto.randomUUID();
      const { data: createUserData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: randomPassword,
        email_confirm: false,
        user_metadata: {
          club_id: clubId,
          club_slug: clubSlug,
          role: "admin",
          invited_by: user.email,
        },
      });

      if (createUserError) {
        logger.error({ email: normalizedEmail.substring(0, 5) + "…", error: createUserError.message }, "[invite-admin] createUser échoué");
        return NextResponse.json({ error: "Impossible de créer l'invitation" }, { status: 500 });
      }

      invitedUserId = createUserData.user?.id ?? null;
      logger.info({ userId: invitedUserId?.substring(0, 8) + "…", email: normalizedEmail.substring(0, 5) + "…" }, "[invite-admin] Utilisateur créé");
    }

    // 5. Générer un lien de récupération (recovery) pour permettre de définir le mot de passe
    const { data: recoveryLink, error: recoveryError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: {
        redirectTo,
      },
    });

    if (recoveryError) {
      logger.warn({ email: normalizedEmail.substring(0, 5) + "…", error: recoveryError.message }, "[invite-admin] generateLink recovery échoué, essai magiclink");

      // Essayer avec magiclink
      const { data: magicLink, error: magicError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: normalizedEmail,
        options: {
          redirectTo,
        },
      });

      if (magicError) {
        logger.error({ email: normalizedEmail.substring(0, 5) + "…", error: magicError.message }, "[invite-admin] generateLink magiclink aussi échoué");
        return NextResponse.json({ error: "Impossible de générer le lien d'invitation" }, { status: 500 });
      }

      // Utiliser directement l'action_link de Supabase (qui redirigera vers notre page)
      invitationUrl = (magicLink as any)?.properties?.action_link || null;
    } else {
      // Utiliser directement l'action_link de Supabase
      invitationUrl = (recoveryLink as any)?.properties?.action_link || null;
    }

    if (!invitationUrl) {
      logger.error({ email: normalizedEmail.substring(0, 5) + "…" }, "[invite-admin] Aucun lien d'invitation généré");
      return NextResponse.json({ error: "Impossible de générer le lien d'invitation" }, { status: 500 });
    }

    logger.info({ email: normalizedEmail.substring(0, 5) + "…", urlLength: invitationUrl.length }, "[invite-admin] Lien d'invitation généré");

    // 6. Envoyer l'email d'invitation via Resend
    try {
      const inviterName = user.user_metadata?.first_name
        ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ""}`.trim()
        : user.email;

      await sendAdminInvitationEmail(
        normalizedEmail,
        clubName,
        inviterName || null,
        invitationUrl
      );
      logger.info({ email: normalizedEmail.substring(0, 5) + "…", clubName }, "[invite-admin] ✅ Email d'invitation envoyé via Resend");
    } catch (emailError: any) {
      logger.error({ email: normalizedEmail.substring(0, 5) + "…", error: emailError }, "[invite-admin] ❌ Erreur lors de l'envoi de l'email via Resend");
    }

    // 7. Enregistrer l'invitation dans la table club_admins
    if (invitedUserId) {
      const { error: insertError } = await supabaseAdmin
        .from("club_admins")
        .insert({
          club_id: clubId,
          user_id: invitedUserId,
          email: normalizedEmail,
          role: "admin",
          invited_by: user.id,
          activated_at: null,
        });

      if (insertError && insertError.code !== "23505") {
        logger.error({ invitedUserId: invitedUserId.substring(0, 8) + "…", error: insertError }, "[invite-admin] Erreur lors de l'ajout dans club_admins");
      }
    }

    logger.info({ userId: user.id.substring(0, 8) + "…", email: normalizedEmail.substring(0, 5) + "…", clubId: clubId.substring(0, 8) + "…" }, "[invite-admin] Invitation envoyée avec succès");

    return NextResponse.json({
      success: true,
      message: `Invitation envoyée à ${normalizedEmail}`,
    });
  } catch (error: any) {
    logger.error({ error }, "[invite-admin] Erreur");
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
