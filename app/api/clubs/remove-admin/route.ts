import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { z } from "zod";
import type { Database } from "@/lib/types_db";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

/**
 * Schéma de suppression d'admin : identifiant UUID obligatoire.
 */
const removeAdminSchema = z.object({
  admin_id: z.string().uuid("admin_id doit être un UUID valide"),
});

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Configuration serveur incorrecte" }, { status: 500 });
    }

    let currentUser: { id: string; email?: string | null } | null = null;

    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && data?.user) {
        currentUser = { id: data.user.id, email: data.user.email };
      }
    }

    if (!currentUser) {
      const supabase = createRouteHandlerClient<Database>({ cookies });
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        currentUser = { id: user.id, email: user.email };
      }
    }

    if (!currentUser) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const parsedBody = removeAdminSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Payload invalide", details: parsedBody.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { admin_id } = parsedBody.data;

    const { data: currentUserAdmin } = await supabaseAdmin
      .from("club_admins")
      .select("club_id, role")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (!currentUserAdmin || currentUserAdmin.role !== "owner") {
      return NextResponse.json(
        { error: "Seul le propriétaire peut supprimer des administrateurs" },
        { status: 403 }
      );
    }

    const { data: adminToRemove } = await supabaseAdmin
      .from("club_admins")
      .select("club_id, role, email")
      .eq("id", admin_id)
      .maybeSingle();

    if (!adminToRemove) {
      return NextResponse.json({ error: "Administrateur introuvable" }, { status: 404 });
    }

    if (adminToRemove.club_id !== currentUserAdmin.club_id) {
      return NextResponse.json(
        { error: "Vous ne pouvez supprimer que les administrateurs de votre club" },
        { status: 403 }
      );
    }

    if (adminToRemove.role === "owner") {
      return NextResponse.json(
        { error: "Vous ne pouvez pas supprimer un propriétaire" },
        { status: 403 }
      );
    }

    const { data: adminData } = await supabaseAdmin
      .from("club_admins")
      .select("user_id")
      .eq("id", admin_id)
      .maybeSingle();

    // Protection: empêcher un admin de se supprimer lui-même
    if (adminData?.user_id === currentUser.id) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas vous supprimer vous-même" },
        { status: 403 }
      );
    }
    
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

    // 🔒 ICI : anonymisation de l'email pour les logs
    const emailPreview = adminToRemove.email?.substring(0, 5) + "…" || "unknown";

    if (adminUserId) {
      const { data: otherAdminRoles } = await supabaseAdmin
        .from("club_admins")
        .select("id")
        .eq("user_id", adminUserId);

      if (!otherAdminRoles || otherAdminRoles.length === 0) {
        const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(adminUserId);

        if (deleteUserError) {
          console.warn("[remove-admin] Impossible de supprimer l'utilisateur de auth.users:", deleteUserError);
        } else {
          console.log(`[remove-admin] Utilisateur ${emailPreview} supprimé de auth.users`);
        }
      }
    }

    console.log(`[remove-admin] Admin ${emailPreview} supprimé du club ${currentUserAdmin.club_id}`);
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
