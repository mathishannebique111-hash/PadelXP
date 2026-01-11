import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn("[PartnershipCreate] Pas d'utilisateur connecté", { error: authError });
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier les variables d'environnement
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      logger.error("[PartnershipCreate] Variables d'environnement manquantes", {
        hasUrl: !!supabaseUrl,
        hasKey: !!serviceRoleKey
      });
      return NextResponse.json({
        error: "Configuration serveur manquante",
        details: "Variables d'environnement non configurées"
      }, { status: 500 });
    }

    const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { partner_id } = await request.json();

    if (!partner_id || typeof partner_id !== 'string') {
      return NextResponse.json({ error: "partner_id requis" }, { status: 400 });
    }

    if (partner_id === user.id) {
      return NextResponse.json({ error: "Vous ne pouvez pas être votre propre partenaire" }, { status: 400 });
    }

    // 0. Vérifier si l'utilisateur a DÉJÀ un partenaire habituel (STATUS = accepted)
    // On ne peut avoir qu'un seul partenaire habituel.
    const { data: currentPartner, error: currentPartnerError } = await supabaseAdmin
      .from('player_partnerships')
      .select('id')
      .or(`player_id.eq.${user.id},partner_id.eq.${user.id}`)
      .eq('status', 'accepted')
      .maybeSingle();

    if (currentPartner) {
      return NextResponse.json({
        error: "Vous avez déjà un partenaire habituel. Veuillez le supprimer d'abord depuis votre profil."
      }, { status: 400 });
    }

    // Vérifier si une demande existe déjà (avec client admin pour bypass RLS)
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('player_partnerships')
      .select('id, status')
      .or(`and(player_id.eq.${user.id},partner_id.eq.${partner_id}),and(player_id.eq.${partner_id},partner_id.eq.${user.id})`)
      .maybeSingle();

    if (existingError) {
      logger.error("[PartnershipCreate] Erreur vérification partenariat existant", { error: existingError });
      // Continuer quand même, ce n'est pas bloquant
    }

    if (existing) {
      if (existing.status === 'accepted') {
        return NextResponse.json({ error: "Ce partenariat existe déjà" }, { status: 400 });
      }
      if (existing.status === 'pending') {
        return NextResponse.json({ error: "Une demande est déjà en attente" }, { status: 400 });
      }
    }

    // Créer la demande de partenariat (avec client admin pour bypass RLS si nécessaire)
    const { data: partnership, error: insertError } = await supabaseAdmin
      .from('player_partnerships')
      .insert({
        player_id: user.id,
        partner_id: partner_id,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      logger.error("[PartnershipCreate] Erreur création partenariat", {
        error: insertError,
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      return NextResponse.json({
        error: "Erreur lors de la création de la demande",
        details: insertError.message,
        code: insertError.code
      }, { status: 500 });
    }

    logger.info("[PartnershipCreate] Demande de partenariat créée", {
      playerId: user.id.substring(0, 8),
      partnerId: partner_id.substring(0, 8),
      partnershipId: partnership?.id?.substring(0, 8)
    });

    return NextResponse.json({ success: true, partnership });
  } catch (error) {
    logger.error("[PartnershipCreate] Erreur inattendue", {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
