import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get("id");

    if (!invitationId) {
      return NextResponse.json({ error: "ID d'invitation manquant" }, { status: 400 });
    }

    // Utiliser le client admin pour toute l'opération pour éviter les problèmes de RLS
    // notamment pour les invitations refusées qui pourraient être masquées
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[API] Variables d'environnement manquantes");
      return NextResponse.json({ error: "Configuration serveur manquante" }, { status: 500 });
    }

    const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Vérifier que l'invitation existe et appartient à l'utilisateur (via Admin)
    const { data: existingInvitation, error: checkError } = await supabaseAdmin
      .from("match_invitations")
      .select("id, sender_id")
      .eq("id", invitationId)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .maybeSingle();

    if (checkError) {
      console.error("[API] Erreur vérification invitation:", checkError);
      return NextResponse.json({ error: "Erreur lors de la vérification" }, { status: 500 });
    }

    if (!existingInvitation) {
      return NextResponse.json({ error: "Invitation non trouvée ou vous n'êtes pas autorisé" }, { status: 404 });
    }

    // 2. Supprimer la notification associée (Nettoyage)
    // On cherche une notif liée à cette invitation pour cet utilisateur (sender)
    // Généralement c'est une notif de refus "match_invitation_refused"
    try {
      await supabaseAdmin
        .from("notifications")
        .delete()
        .eq("user_id", user.id)
        .eq("type", "match_invitation_refused")
        .filter("data->>invitation_id", "eq", invitationId);

      console.log("[API] Nettoyage notification effectué pour invitation:", invitationId);
    } catch (notifError) {
      console.warn("[API] Erreur non bloquante nettoyage notif:", notifError);
    }

    // 3. Supprimer l'invitation
    const { error: deleteError } = await supabaseAdmin
      .from("match_invitations")
      .delete()
      .eq("id", invitationId);

    if (deleteError) {
      console.error("[API] Erreur suppression invitation:", deleteError);
      return NextResponse.json({
        error: "Erreur lors de la suppression",
        details: deleteError.message
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Invitation supprimée" });
  } catch (error) {
    console.error("[API] Erreur exception:", error);
    return NextResponse.json({
      error: "Erreur serveur",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
