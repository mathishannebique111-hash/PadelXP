import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

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

    // Vérifier si l'utilisateur existe déjà dans auth.users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === email);

    let responseMessage = `Invitation envoyée à ${email}`;
    let invitedUserId: string | null = null;

    if (existingUser) {
      const { data: existingAdmin } = await supabaseAdmin
        .from("club_admins")
        .select("club_id")
        .eq("user_id", existingUser.id);

      const alreadyAdminForClub = existingAdmin?.some((row) => row.club_id === clubId);

      if (alreadyAdminForClub) {
        return NextResponse.json(
          { error: "Cet utilisateur est déjà administrateur de ce club" },
          { status: 400 }
        );
      }

      const hasOtherClubs = existingAdmin && existingAdmin.length > 0;

      if (!hasOtherClubs) {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
        if (deleteError) {
          console.error("[invite-admin] Impossible de supprimer l'utilisateur existant:", deleteError);
          return NextResponse.json(
            { error: "Impossible de réinitialiser l'invitation pour cet utilisateur" },
            { status: 500 }
          );
        }
      } else {
        const { error: insertError } = await supabaseAdmin
          .from("club_admins")
          .insert({
            club_id: clubId,
            user_id: existingUser.id,
            email,
            role: "admin",
            invited_by: user.id,
            activated_at: new Date().toISOString(),
          });

        if (insertError && insertError.code !== "23505") {
          console.error("[invite-admin] Erreur lors de l'ajout d'un admin existant:", insertError);
          return NextResponse.json(
            { error: "Impossible d'ajouter cet administrateur" },
            { status: 500 }
          );
        }
        return NextResponse.json({
          success: true,
          message: `${email} possède déjà un compte PadelXP. Il peut se connecter directement.`,
        });
      }
    }

    // Créer le lien d'invitation (l'utilisateur devra créer un compte avec accès admin)
    const inviteLink = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/clubs/signup?invite=admin${
      email ? `&email=${encodeURIComponent(email)}` : ""
    }`;

    // Envoyer l'email d'invitation via Supabase Auth
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: inviteLink,
      data: {
        club_id: clubId,
        club_slug: clubSlug,
        role: "admin",
        invited_by: user.email,
      },
    });

    if (inviteError) {
      console.error("[invite-admin] Erreur Supabase:", inviteError);
      return NextResponse.json(
        { error: "Erreur lors de l'envoi de l'invitation" },
        { status: 500 }
      );
    }

    invitedUserId = inviteData?.user?.id ?? null;

    // Enregistrer l'invitation dans la table club_admins
    if (invitedUserId) {
      const { error: adminError } = await supabaseAdmin
        .from("club_admins")
        .insert({
          club_id: clubId,
          user_id: invitedUserId,
          email,
          role: "admin",
          invited_by: user.id,
          activated_at: null,
        });

      if (adminError) {
        console.error("[invite-admin] Erreur lors de l'ajout dans club_admins:", adminError);
        // On ne bloque pas l'invitation même si l'ajout échoue
      }
    }

    // Logger l'invitation
    console.log(`[invite-admin] Invitation envoyée à ${email} pour le club ${clubName} (${clubId})`);

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

