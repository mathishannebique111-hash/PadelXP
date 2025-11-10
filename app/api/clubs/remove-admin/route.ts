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

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { admin_id } = await request.json();

    if (!admin_id || typeof admin_id !== "string") {
      return NextResponse.json({ error: "ID administrateur requis" }, { status: 400 });
    }

    // Vérifier que l'utilisateur connecté est bien un propriétaire
    const { data: currentUserAdmin } = await supabaseAdmin
      .from("club_admins")
      .select("club_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!currentUserAdmin || currentUserAdmin.role !== "owner") {
      return NextResponse.json(
        { error: "Seul le propriétaire peut supprimer des administrateurs" },
        { status: 403 }
      );
    }

    // Récupérer l'admin à supprimer pour vérifier qu'il appartient au même club
    const { data: adminToRemove } = await supabaseAdmin
      .from("club_admins")
      .select("club_id, role, email")
      .eq("id", admin_id)
      .maybeSingle();

    if (!adminToRemove) {
      return NextResponse.json({ error: "Administrateur introuvable" }, { status: 404 });
    }

    // Vérifier que l'admin à supprimer appartient au même club
    if (adminToRemove.club_id !== currentUserAdmin.club_id) {
      return NextResponse.json(
        { error: "Vous ne pouvez supprimer que les administrateurs de votre club" },
        { status: 403 }
      );
    }

    // Empêcher la suppression d'un propriétaire
    if (adminToRemove.role === "owner") {
      return NextResponse.json(
        { error: "Vous ne pouvez pas supprimer un propriétaire" },
        { status: 403 }
      );
    }

    // Récupérer l'user_id de l'admin à supprimer
    const { data: adminData } = await supabaseAdmin
      .from("club_admins")
      .select("user_id")
      .eq("id", admin_id)
      .maybeSingle();

    let adminUserId = adminData?.user_id ?? null;

    if (!adminUserId) {
      try {
        const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
        const foundUser = usersList?.users?.find((u) => u.email?.toLowerCase() === adminToRemove.email.toLowerCase());
        if (foundUser) {
          adminUserId = foundUser.id;
        }
      } catch (lookupError) {
        console.warn("[remove-admin] Unable to list users for fallback lookup", lookupError);
      }
    }

    // Supprimer l'administrateur de club_admins
    const { error: deleteError } = await supabaseAdmin
      .from("club_admins")
      .delete()
      .eq("id", admin_id);

    if (deleteError) {
      console.error("[remove-admin] Error deleting admin:", deleteError);
      return NextResponse.json(
        { error: "Erreur lors de la suppression" },
        { status: 500 }
      );
    }

    // Vérifier si l'utilisateur est admin d'un autre club
    if (adminUserId) {
      const { data: otherAdminRoles } = await supabaseAdmin
        .from("club_admins")
        .select("id")
        .eq("user_id", adminUserId);

      // Si l'utilisateur n'est admin d'aucun autre club, le supprimer de auth.users
      if (!otherAdminRoles || otherAdminRoles.length === 0) {
        const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(adminUserId);
        
        if (deleteUserError) {
          console.warn("[remove-admin] Impossible de supprimer l'utilisateur de auth.users:", deleteUserError);
          // On ne bloque pas l'opération, l'essentiel est qu'il soit retiré de club_admins
        } else {
          console.log(`[remove-admin] Utilisateur ${adminToRemove.email} supprimé de auth.users`);
        }
      }
    }

    console.log(`[remove-admin] Admin ${adminToRemove.email} supprimé du club ${currentUserAdmin.club_id}`);

    return NextResponse.json({
      success: true,
      message: `${adminToRemove.email} a été retiré des administrateurs`,
    });
  } catch (error: any) {
    console.error("[remove-admin] Erreur:", error);
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

