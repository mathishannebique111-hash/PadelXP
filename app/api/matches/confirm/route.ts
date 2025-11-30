import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token de confirmation manquant" }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Rediriger vers la page de login avec le token en paramètre
    return NextResponse.redirect(new URL(`/login?redirect=/matches/confirm?token=${token}`, req.url));
  }

  // Utiliser service_role pour récupérer la confirmation (bypass RLS)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: "Configuration manquante" }, { status: 500 });
  }

  const serviceSupabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Récupérer la confirmation avec le token
  const { data: confirmation, error: confError } = await serviceSupabase
    .from("match_confirmations")
    .select("*, matches!inner(id, status)")
    .eq("confirmation_token", token)
    .single();

  if (confError || !confirmation) {
    return NextResponse.redirect(new URL(`/matches/confirm?token=${token}&status=invalid`, req.url));
  }

  // Vérifier que le token appartient à l'utilisateur connecté
  if (confirmation.user_id !== user.id) {
    return NextResponse.redirect(new URL(`/matches/confirm?token=${token}&status=unauthorized`, req.url));
  }

  // Vérifier si déjà confirmé
  if (confirmation.confirmed) {
    return NextResponse.redirect(new URL(`/matches/confirm?token=${token}&status=already-confirmed`, req.url));
  }

  // Mettre à jour la confirmation avec service_role
  const { error: updateError } = await serviceSupabase
    .from("match_confirmations")
    .update({
      confirmed: true,
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", confirmation.id);

  if (updateError) {
    return NextResponse.redirect(new URL(`/matches/confirm?token=${token}&status=error`, req.url));
  }

  // Vérifier si le match doit être validé (2 confirmations sur 3)
  const { data: confirmations } = await serviceSupabase
    .from("match_confirmations")
    .select("user_id")
    .eq("match_id", confirmation.matches.id)
    .eq("confirmed", true);

  const confirmedCount = confirmations?.length || 0;

  // Si on a au moins 2 confirmations, valider le match
  if (confirmedCount >= 2) {
    const { error: matchUpdateError } = await serviceSupabase
      .from("matches")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", confirmation.matches.id);

    if (matchUpdateError) {
      logger.error({ error: matchUpdateError, userId: user.id.substring(0, 8) + "…", matchId: confirmation.matches.id.substring(0, 8) + "…" }, "Error updating match status:");
    }
  }

  return NextResponse.redirect(new URL(`/matches/confirm?token=${token}&status=success`, req.url));
}

export async function POST(req: Request) {
  const body = await req.json();
  const { token, action } = body as { token: string; action: "confirm" | "reject" };

  if (!token) {
    return NextResponse.json({ error: "Token de confirmation manquant" }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Utiliser service_role pour récupérer la confirmation
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: "Configuration manquante" }, { status: 500 });
  }

  const serviceSupabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Récupérer la confirmation
  const { data: confirmation, error: confError } = await serviceSupabase
    .from("match_confirmations")
    .select("*, matches!inner(id, status)")
    .eq("confirmation_token", token)
    .single();

  if (confError || !confirmation) {
    return NextResponse.json({ error: "Token de confirmation invalide" }, { status: 400 });
  }

  if (confirmation.user_id !== user.id) {
    return NextResponse.json({ error: "Ce lien de confirmation ne vous appartient pas" }, { status: 403 });
  }

  if (action === "confirm") {
    // Confirmer le match
    const { error: updateError } = await serviceSupabase
      .from("match_confirmations")
      .update({
        confirmed: true,
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", confirmation.id);

    if (updateError) {
      return NextResponse.json({ error: "Erreur lors de la confirmation" }, { status: 500 });
    }

    // Vérifier si le match doit être validé
    const { data: confirmations } = await serviceSupabase
      .from("match_confirmations")
      .select("user_id")
      .eq("match_id", confirmation.matches.id)
      .eq("confirmed", true);

    const confirmedCount = confirmations?.length || 0;

    if (confirmedCount >= 2) {
      await serviceSupabase
        .from("matches")
        .update({
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", confirmation.matches.id);
    }

    return NextResponse.json({ success: true, message: "Match confirmé avec succès" });
  } else {
    // Rejeter le match (optionnel, pour l'instant on ne fait rien)
    return NextResponse.json({ success: true, message: "Match rejeté" });
  }
}

