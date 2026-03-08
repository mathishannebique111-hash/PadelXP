import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: Request) {
  try {
    const { oldPassword, newPassword } = await req.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: "Ancien et nouveau mots de passe requis" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Le nouveau mot de passe doit contenir au moins 8 caractères" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 1. Vérifier l'ancien mot de passe en tentant un nouveau sign-in
    // On utilise un client temporaire pour ne pas polluer la session actuelle
    const tempSupabase = createServiceClient(SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { error: signInError } = await tempSupabase.auth.signInWithPassword({
      email: user.email!,
      password: oldPassword,
    });

    if (signInError) {
      logger.warn("[api/auth/update-password] Incorrect old password", { userId: user.id });
      return NextResponse.json({ error: "L'ancien mot de passe est incorrect" }, { status: 400 });
    }

    // 2. Mettre à jour le mot de passe via Admin API (Service Role)
    // Cela évite l'envoi d'emails de ré-authentification
    if (!SERVICE_ROLE_KEY) {
      logger.error("[api/auth/update-password] Service role key missing");
      return NextResponse.json({ error: "Erreur de configuration serveur" }, { status: 500 });
    }

    const supabaseAdmin = createServiceClient(SUPABASE_URL!, SERVICE_ROLE_KEY);
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateError) {
      logger.error("[api/auth/update-password] Update error", { userId: user.id, error: updateError });
      return NextResponse.json({ error: "Impossible de mettre à jour le mot de passe" }, { status: 500 });
    }

    logger.info("[api/auth/update-password] Password updated successfully", { userId: user.id });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    logger.error("[api/auth/update-password] Unexpected error", { error: error.message });
    return NextResponse.json({ error: "Une erreur inattendue est survenue" }, { status: 500 });
  }
}
