import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendAdminInvitationEmail } from "@/lib/email";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Configuration serveur incorrecte" }, { status: 500 });
    }

    const supabase = createClient({ headers: Object.fromEntries(request.headers) });
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

    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    // Normaliser l'email en minuscules
    const normalizedEmail = email.toLowerCase().trim();

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
      console.log(`[invite-admin] inviteUserByEmail échoué, utilisation de generateLink:`, inviteByEmailError.message);
      
      let linkData: any = null;
      let linkError: any = null;

      // Essayer d'abord avec "recovery" pour permettre la définition/réinitialisation du mot de passe
      const { data: recoveryLink, error: recoveryError } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: normalizedEmail,
        user_id: existingUser?.id,
        options: {
          redirectTo: inviteLink,
          data: {
            club_id: clubId,
            club_slug: clubSlug,
            role: "admin",
            invited_by: user.email,
          },
        },
      });

      if (recoveryError) {
        // Si recovery échoue, essayer avec magiclink
        const { data: magicLink, error: magicError } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: normalizedEmail,
          user_id: existingUser?.id,
          options: {
            redirectTo: inviteLink,
            data: {
              club_id: clubId,
              club_slug: clubSlug,
              role: "admin",
              invited_by: user.email,
            },
          },
        });
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
      console.error("[invite-admin] Erreur Supabase:", inviteError);
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
        console.log(`[invite-admin] Action link trouvé: ${actionLink.substring(0, 100)}...`);
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
          console.log(`[invite-admin] Lien construit avec token: ${invitationUrl.substring(0, 100)}...`);
        } else {
          // Fallback sur le lien de base (sans token, mais avec email)
          invitationUrl = inviteLink;
          console.log(`[invite-admin] Utilisation du lien de base (fallback): ${inviteLink}`);
        }
      }
    } else {
      // Aucune donnée Supabase, utiliser le lien de base
      invitationUrl = inviteLink;
      console.log(`[invite-admin] Aucune donnée Supabase, utilisation du lien de base: ${inviteLink}`);
    }

    console.log(`[invite-admin] Lien d'invitation généré: ${invitationUrl ? invitationUrl.substring(0, 100) : 'null'}...`);

    // TOUJOURS envoyer l'email d'invitation via Resend
    // Même si Supabase a envoyé un email, on envoie aussi via Resend pour garantir la réception
    // et avoir un email personnalisé avec le bon format
    try {
      const inviterName = user.user_metadata?.first_name 
        ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ""}`.trim()
        : user.email;
      
      if (!invitationUrl) {
        console.error("[invite-admin] Aucun lien d'invitation généré, impossible d'envoyer l'email");
      } else {
        await sendAdminInvitationEmail(
          normalizedEmail,
          clubName,
          inviterName || null,
          invitationUrl
        );
        console.log(`[invite-admin] ✅ Email d'invitation envoyé à ${normalizedEmail} via Resend avec le lien: ${invitationUrl.substring(0, 80)}...`);
      }
    } catch (emailError: any) {
      console.error("[invite-admin] ❌ Erreur lors de l'envoi de l'email via Resend:", emailError);
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
          console.error("[invite-admin] Erreur lors de la mise à jour dans club_admins:", updateError);
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
          console.error("[invite-admin] Erreur lors de l'ajout dans club_admins:", insertError);
          // On ne bloque pas l'invitation même si l'ajout échoue
        }
      }
    }

    // Logger l'invitation
    console.log(`[invite-admin] Invitation envoyée à ${normalizedEmail} pour le club ${clubName} (${clubId})`);

    return NextResponse.json({
      success: true,
      message: responseMessage,
    });
  } catch (error: any) {
    console.error("[invite-admin] Erreur:", error);
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

